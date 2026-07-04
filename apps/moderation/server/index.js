import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from './db.js';
import { buildTrie, checkText, censorText, scoreText } from './dfa.js';
import { SENSITIVE_WORDS, WHITELIST } from './words.js';

const PORT = process.env.PORT || 3020;
const JWT_SECRET = process.env.JWT_SECRET || 'grandkidsgo-moderation-dev';

// Build DFA trie on startup
const trie = buildTrie(SENSITIVE_WORDS);

// Optional: filter whitelisted terms from sensitive list
const whitelistTrie = buildTrie(WHITELIST);

const app = express();
app.use(express.json({ limit: '1mb' }));

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: '未登录' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: '登录已过期' }); }
}

// Internal service auth (for other services to call)
function serviceAuth(req, res, next) {
  const key = req.headers['x-service-key'];
  if (key !== process.env.SERVICE_KEY && process.env.SERVICE_KEY) {
    return res.status(401).json({ error: '未授权' });
  }
  next();
}

function checkWhitelisted(text) {
  const whitelistMatches = checkText(whitelistTrie, text);
  const whitelisted = new Set(whitelistMatches.map(m => m.word));
  const sensitive = checkText(trie, text);
  return sensitive.filter(m => !whitelisted.has(m.word));
}

// --- Main moderation endpoints ---

// Check text content (internal service API)
app.post('/api/moderation/check', serviceAuth, (req, res) => {
  const { text, userId, username, contentType, sourceService } = req.body;
  if (!text) return res.json({ passed: true, reason: null, action: 'allow' });

  const dfaHits = checkWhitelisted(text);
  const density = scoreText(trie, text);

  // Decision logic
  let action = 'allow';
  let reason = null;
  let matchedWord = null;

  if (dfaHits.length > 0) {
    matchedWord = dfaHits[0].word;
    if (density > 0.5) {
      action = 'block';
      reason = '内容含大量违规词汇';
    } else {
      // Check user's violation history
      if (userId) {
        const penalty = db.prepare('SELECT * FROM penalties WHERE user_id = ?').get(userId);
        if (penalty?.banned) {
          action = 'block';
          reason = '账号已被封禁';
        } else if (penalty && penalty.violation_count >= 3) {
          action = 'block';
          reason = '多次违规，内容被拦截';
        } else {
          action = 'flag';
          reason = `包含敏感词: ${matchedWord}`;
        }
      } else {
        action = 'flag';
        reason = `包含敏感词: ${matchedWord}`;
      }
    }
  }

  // Record violation if action is flag or block
  if ((action === 'flag' || action === 'block') && userId) {
    const existing = db.prepare('SELECT id, violation_count FROM penalties WHERE user_id = ?').get(userId);

    db.prepare(`
      INSERT INTO violations (user_id, username, content_type, content_snippet, reason, matched_word, action, source_service)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId || 'unknown',
      username || '',
      contentType || 'text',
      text.slice(0, 100),
      reason,
      matchedWord || '',
      action,
      sourceService || ''
    );

    if (existing) {
      db.prepare('UPDATE penalties SET violation_count = violation_count + 1, penalty_level = MIN(3, violation_count), updated_at = datetime(\'now\') WHERE user_id = ?')
        .run(userId);
    } else {
      db.prepare('INSERT INTO penalties (user_id, violation_count, penalty_level) VALUES (?, 1, 1)').run(userId);
    }
  }

  // Auto-action: mute user if repeated violations
  if (action !== 'allow' && userId) {
    const penalty = db.prepare('SELECT * FROM penalties WHERE user_id = ?').get(userId);
    if (penalty) {
      const level = Math.min(penalty.violation_count, 3);
      if (level >= 2 && !penalty.banned) {
        const muteHours = [0, 0, 24, 72, 168]; // warn, (none), 24h, 72h, 7d
        if (muteHours[level]) {
          const mutedUntil = new Date(Date.now() + muteHours[level] * 3600000).toISOString();
          db.prepare('UPDATE penalties SET muted_until = ?, penalty_level = ? WHERE user_id = ?')
            .run(mutedUntil, level, userId);
        }
      }
    }
  }

  const sanitized = action === 'flag' ? censorText(trie, text) : text;

  res.json({
    passed: action === 'allow',
    action,
    reason,
    matched_word: matchedWord,
    sanitized,
    density,
    violations_count: dfaHits.length,
  });
});

// Report content
app.post('/api/moderation/report', auth, (req, res) => {
  const { targetType, targetId, reason, contentSnippet } = req.body;
  if (!targetType || !targetId || !reason) return res.status(400).json({ error: '缺少必填字段' });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO reports (id, reporter_id, target_type, target_id, reason, content_snippet)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, req.user.id, targetType, targetId, reason, contentSnippet || '');

  res.json({ id });
});

// Submit appeal
app.post('/api/moderation/appeal', auth, (req, res) => {
  const { violationId, reason } = req.body;
  if (!violationId || !reason) return res.status(400).json({ error: '缺少必填字段' });

  const v = db.prepare('SELECT * FROM violations WHERE id = ? AND user_id = ?').get(violationId, req.user.id);
  if (!v) return res.status(404).json({ error: '违规记录不存在' });

  const existingAppeal = db.prepare('SELECT id FROM appeals WHERE violation_id = ?').get(violationId);
  if (existingAppeal) return res.status(400).json({ error: '已提交申诉，请等待审核' });

  const id = uuidv4();
  db.prepare('INSERT INTO appeals (id, violation_id, user_id, reason) VALUES (?, ?, ?, ?)').run(id, violationId, req.user.id, reason);
  res.json({ id });
});

// Get user violations (for user to see their own record)
app.get('/api/moderation/violations', auth, (req, res) => {
  const violations = db.prepare(
    'SELECT id, content_type, content_snippet, reason, matched_word, action, created_at FROM violations WHERE user_id = ? ORDER BY created_at DESC LIMIT 20'
  ).all(req.user.id);
  const penalty = db.prepare('SELECT * FROM penalties WHERE user_id = ?').get(req.user.id);
  res.json({ violations, penalty });
});

// Admin: get pending reports
app.get('/api/moderation/reports', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '仅管理员可查看' });
  const status = req.query.status || 'pending';
  const reports = db.prepare(
    'SELECT * FROM reports WHERE status = ? ORDER BY created_at DESC LIMIT 50'
  ).all(status);
  res.json(reports);
});

// Admin: review report
app.post('/api/moderation/review', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '仅管理员可操作' });
  const { reportId, action, note } = req.body;
  if (!reportId || !action) return res.status(400).json({ error: '缺少必填字段' });

  db.prepare(
    'UPDATE reports SET status = ?, reviewer_id = ?, review_action = ?, reviewed_at = datetime(\'now\') WHERE id = ?'
  ).run(action === 'dismiss' ? 'dismissed' : 'resolved', req.user.id, action, reportId);

  res.json({ success: true });
});

// Admin: get pending appeals
app.get('/api/moderation/appeals', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '仅管理员可查看' });
  const status = req.query.status || 'pending';
  const appeals = db.prepare(`
    SELECT a.*, v.content_snippet, v.reason as violation_reason
    FROM appeals a JOIN violations v ON v.id = a.violation_id
    WHERE a.status = ? ORDER BY a.created_at DESC LIMIT 50
  `).all(status);
  res.json(appeals);
});

// Admin: review appeal
app.post('/api/moderation/appeal/review', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: '仅管理员可操作' });
  const { appealId, approve, note } = req.body;
  if (!appealId) return res.status(400).json({ error: '缺少申诉ID' });

  const appeal = db.prepare('SELECT * FROM appeals WHERE id = ?').get(appealId);
  if (!appeal) return res.status(404).json({ error: '申诉不存在' });

  db.prepare(
    'UPDATE appeals SET status = ?, reviewer_id = ?, review_note = ?, reviewed_at = datetime(\'now\') WHERE id = ?'
  ).run(approve ? 'approved' : 'rejected', req.user.id, note || '', appealId);

  if (approve) {
    // Clear the penalty for this user
    db.prepare('DELETE FROM penalties WHERE user_id = ?').run(appeal.user_id);
  }

  res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[moderation] running on port ${PORT}`);
});

export default app;
