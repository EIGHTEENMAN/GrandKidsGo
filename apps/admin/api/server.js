import express from 'express';
import cors from 'cors';
import { execSync } from 'child_process';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JWT_SECRET = 'grandkidsgo-admin-2026';
const ADMIN_USER = 'eighteenman';
const ADMIN_PASS = 'grandkidsgo2018';

// Database connections
const TZ_DB_PATH = process.env.TIAOZHAN_DB_PATH || path.join(__dirname, '..', '..', 'tiaozhan', 'data', 'game.db');
let tzDb = null;
try { tzDb = new Database(TZ_DB_PATH, { readonly: true }); } catch (e) { console.error('tiaozhan DB:', e.message); }

const AUTH_DB_PATH = process.env.AUTH_DB_PATH || path.join(__dirname, '..', '..', 'auth-service', 'data', 'auth.db');
let authDb = null;
try {
  authDb = new Database(AUTH_DB_PATH);
  // Add suspended column if not exists
  try { authDb.exec("ALTER TABLE users ADD COLUMN suspended INTEGER DEFAULT 0"); } catch {}
} catch (e) { console.error('auth DB:', e.message); }

// HIDDEN: forum and store DB connections, will re-enable later
// const FORUM_DB_PATH = process.env.FORUM_DB_PATH || path.join(__dirname, '..', '..', 'forum', 'data', 'forum.db');
// let forumDb = null;
// try { forumDb = new Database(FORUM_DB_PATH); } catch (e) { console.error('forum DB:', e.message); }
// const STORE_DB_PATH = process.env.STORE_DB_PATH || path.join(__dirname, '..', '..', 'store', 'data', 'store.db');
// let storeDb = null;
// try { storeDb = new Database(STORE_DB_PATH); } catch (e) { console.error('store DB:', e.message); }

// Analytics/usage tracking DB
const ANALYTICS_DB_PATH = process.env.ANALYTICS_DB_PATH || path.join(__dirname, '..', 'data', 'analytics.db');
const analyticsDir = path.dirname(ANALYTICS_DB_PATH);
if (!existsSync(analyticsDir)) {
  mkdirSync(analyticsDir, { recursive: true });
}
let analyticsDb = null;
try {
  analyticsDb = new Database(ANALYTICS_DB_PATH);
  analyticsDb.exec(`
    CREATE TABLE IF NOT EXISTS usage_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_name TEXT NOT NULL,
      event_type TEXT DEFAULT 'pageview',
      user_id TEXT,
      ip TEXT,
      user_agent TEXT,
      referer TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_usage_app ON usage_events(app_name);
    CREATE INDEX IF NOT EXISTS idx_usage_created ON usage_events(created_at);
  `);
} catch (e) { console.error('analytics DB:', e.message); }

const app = express();
app.use(cors());
app.use(express.static('dist'));
app.use(express.json());

// ─── Auth Middleware ───

function authMiddleware(req, res, next) {
  // Only protect API routes
  if (!req.path.startsWith('/api/')) return next();
  const excluded = ['/api/login', '/api/health', '/api/analytics/track'];
  if (excluded.includes(req.path)) return next();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' });
  }
  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ error: '登录已过期' });
  }
}
app.use(authMiddleware);

// ─── Login ───

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = jwt.sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({ token, username: ADMIN_USER });
  }
  return res.status(401).json({ error: '用户名或密码错误' });
});

app.get('/api/verify', (req, res) => {
  res.json({ valid: true, username: req.admin?.username });
});

// ─── PM2 / System / Stats (existing, unchanged) ───

app.get('/api/services', (req, res) => {
  try {
    const out = execSync('pm2 jlist', { encoding: 'utf8', timeout: 5000 });
    const processes = JSON.parse(out);
    res.json(processes.map(p => ({
      name: p.name, id: p.pm_id, status: p.pm2_env.status,
      uptime: p.pm2_env.pm_uptime, cpu: p.monit.cpu, memory: p.monit.memory,
      port: p.pm2_env.PORT || 'N/A',
    })));
  } catch { res.json([]); }
});

app.get('/api/system', (req, res) => {
  try {
    const disk = execSync("df -h / | tail -1 | awk '{print $3 \"/\" $2 \" (\" $5 \")\"}'", { encoding: 'utf8', timeout: 3000 }).trim();
    const mem = execSync("free -h | grep Mem | awk '{print $3 \"/\" $2}'", { encoding: 'utf8', timeout: 3000 }).trim();
    const load = execSync("uptime | awk -F'load average:' '{print $2}'", { encoding: 'utf8', timeout: 3000 }).trim();
    const node = execSync('node -v', { encoding: 'utf8', timeout: 3000 }).trim();
    res.json({ disk, memory: mem, load, node, hostname: '47.114.77.124' });
  } catch { res.json({}); }
});

app.get('/api/stats', (req, res) => {
  try {
    const env = readFileSync('/grandkidsgo/apps/travel-guide/.env', 'utf8');
    const line = env.split('\n').find(l => l.startsWith('DATABASE_URL='));
    if (!line) return res.json({});
    const dbUrl = line.substring('DATABASE_URL='.length).replace(/\?schema=.*$/, '');
    const run = (sql) => {
      try { return parseInt(execSync(`psql "${dbUrl}" -t -c "${sql}"`, { encoding: 'utf8', timeout: 5000 }).trim()) || 0; } catch { return 0; }
    };
    res.json({
      users: run('SELECT COUNT(*) FROM users'),
      guides: run("SELECT COUNT(*) FROM guides WHERE is_publish = true"),
      sections: run('SELECT COUNT(*) FROM guide_sections'),
      ratings: run('SELECT COUNT(*) FROM ratings'),
      comments: run('SELECT COUNT(*) FROM comments'),
      likes: run('SELECT COUNT(*) FROM likes'),
      favorites: run('SELECT COUNT(*) FROM favorites'),
    });
  } catch { res.json({}); }
});

app.get('/api/analytics', (req, res) => {
  try {
    const env = readFileSync('/grandkidsgo/apps/travel-guide/.env', 'utf8');
    const line = env.split('\n').find(l => l.startsWith('DATABASE_URL='));
    if (!line) return res.json({});
    const dbUrl = line.substring('DATABASE_URL='.length).replace(/\?schema=.*$/, '');
    const run = (sql) => {
      try { return parseInt(execSync(`psql "${dbUrl}" -t -c "${sql}"`, { encoding: 'utf8', timeout: 5000 }).trim()) || 0; } catch { return 0; }
    };
    res.json({
      totalViews: run("SELECT COUNT(*) FROM analytics_events WHERE event = 'pageview'"),
      todayViews: run("SELECT COUNT(*) FROM analytics_events WHERE event = 'pageview' AND created_at >= CURRENT_DATE"),
      uniquePages: run("SELECT COUNT(DISTINCT path) FROM analytics_events WHERE event = 'pageview'"),
      eventCount: run("SELECT COUNT(*) FROM analytics_events"),
    });
  } catch { res.json({}); }
});

app.get('/api/moderation', (req, res) => {
  try {
    const env = readFileSync('/grandkidsgo/apps/travel-guide/.env', 'utf8');
    const line = env.split('\n').find(l => l.startsWith('DATABASE_URL='));
    if (!line) return res.json({});
    const dbUrl = line.substring('DATABASE_URL='.length).replace(/\?schema=.*$/, '');
    const run = (sql) => {
      try { return parseInt(execSync(`psql "${dbUrl}" -t -c "${sql}"`, { encoding: 'utf8', timeout: 5000 }).trim()) || 0; } catch { return 0; }
    };
    const getList = (status) => {
      try {
        const cmd = `psql "${dbUrl}" -t -A -F'|' -c "SELECT id, content_type, substring(content, 1, 100), reason, created_at FROM content_reviews WHERE status = '${status}' ORDER BY created_at DESC LIMIT 20"`;
        const out = execSync(cmd, { encoding: 'utf8', timeout: 5000 }).trim();
        return out.split('\n').filter(Boolean).map(l => {
          const [id, ct, c, r, ca] = l.split('|');
          return { id, contentType: ct, content: c, reason: r, createdAt: ca };
        });
      } catch { return []; }
    };
    res.json({
      pendingCount: run("SELECT COUNT(*) FROM content_reviews WHERE status = 'pending'"),
      pendingList: getList('pending'),
    });
  } catch { res.json({}); }
});

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ─── Analytics / Usage Tracking ───

app.post('/api/analytics/track', (req, res) => {
  if (!analyticsDb) return res.json({ ok: false, reason: 'no_db' });
  const { appName, event } = req.body || {};
  if (!appName) return res.json({ ok: false, reason: 'missing_app' });
  try {
    analyticsDb.prepare(
      'INSERT INTO usage_events (app_name, event_type) VALUES (?, ?)'
    ).run(appName, event || 'pageview');
    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: false, reason: e.message });
  }
});

// ===================== Quiz Bank Management =====================

app.get('/api/admin/questions', (req, res) => {
  if (!tzDb) return res.json({ list: [], total: 0 });
  const { keyword, category, difficulty, page = '1', pageSize = '20' } = req.query;
  const p = Math.max(1, parseInt(page)), ps = Math.min(100, Math.max(1, parseInt(pageSize)));
  const conditions = []; const params = [];

  if (category && category !== 'all') { conditions.push('category = ?'); params.push(category); }
  if (difficulty && difficulty !== 'all') { conditions.push('difficulty = ?'); params.push(parseInt(difficulty)); }
  if (keyword && keyword.trim()) { conditions.push('(question LIKE ? OR options LIKE ?)'); params.push(`%${keyword.trim()}%`, `%${keyword.trim()}%`); }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const total = tzDb.prepare(`SELECT COUNT(*) as cnt FROM quiz_questions ${where}`).get(...params).cnt;
  const list = tzDb.prepare(`SELECT * FROM quiz_questions ${where} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...params, ps, (p - 1) * ps);

  res.json({ list: list.map(q => ({ ...q, options: JSON.parse(q.options) })), total, page: p, pageSize: ps });
});

app.get('/api/admin/questions/download', async (req, res) => {
  if (!tzDb) return res.status(500).json({ error: '题库数据库不可用' });
  const { keyword, category, difficulty } = req.query;
  const conditions = []; const params = [];
  if (category && category !== 'all') { conditions.push('category = ?'); params.push(category); }
  if (difficulty && difficulty !== 'all') { conditions.push('difficulty = ?'); params.push(parseInt(difficulty)); }
  if (keyword && keyword.trim()) { conditions.push('(question LIKE ? OR options LIKE ?)'); params.push(`%${keyword.trim()}%`, `%${keyword.trim()}%`); }
  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const rows = tzDb.prepare(`SELECT * FROM quiz_questions ${where} ORDER BY id`).all(...params);
  const catLabel = { chinese: '语文', science: '科学', english: '英语', general: '常识', math: '数学' };
  try {
    const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, HeadingLevel } = await import('docx');
    const headerRow = new TableRow({
      tableHeader: true,
      children: ['编号', '分类', '题目', '选项', '正确答案', '难度'].map(h =>
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20 })], alignment: AlignmentType.CENTER })] })
      )
    });
    const dataRows = rows.map((q, i) => {
      const opts = JSON.parse(q.options);
      const correctOpt = String.fromCharCode(65 + q.answer);
      const diffLabel = ['简单', '中等', '困难'][q.difficulty - 1] || '简单';
      return new TableRow({
        children: [
          String(i + 1), catLabel[q.category] || q.category, q.question,
          opts.map((o, j) => `${String.fromCharCode(65 + j)}. ${o}`).join('  '),
          correctOpt, diffLabel
        ].map(cell =>
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: cell, size: 18 })] })] })
        )
      });
    });
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({ children: [new TextRun({ text: `童慧行 - 题库导出 (${rows.length} 题)`, bold: true, size: 28 })], alignment: AlignmentType.CENTER, spacing: { after: 300 } }),
          new Paragraph({ children: [new TextRun({ text: `导出时间: ${new Date().toLocaleString('zh-CN')}`, size: 18 })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
          new Table({ rows: [headerRow, ...dataRows], width: { size: 100, type: WidthType.PERCENTAGE } })
        ]
      }]
    });
    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=quiz-bank-${Date.now()}.docx`);
    res.send(buffer);
  } catch (e) {
    res.status(500).json({ error: '生成文档失败: ' + e.message });
  }
});

// ===================== User Management =====================

app.get('/api/admin/users', (req, res) => {
  if (!authDb) return res.json({ list: [], total: 0 });
  const { keyword, page = '1', pageSize = '20' } = req.query;
  const p = Math.max(1, parseInt(page)), ps = Math.min(100, Math.max(1, parseInt(pageSize)));
  const conditions = []; const params = [];

  if (keyword && keyword.trim()) {
    conditions.push('(username LIKE ? OR nickname LIKE ? OR phone LIKE ?)');
    const kw = `%${keyword.trim()}%`;
    params.push(kw, kw, kw);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const total = authDb.prepare(`SELECT COUNT(*) as cnt FROM users ${where}`).get(...params).cnt;
  const list = authDb.prepare(`SELECT id, username, COALESCE(nickname, '') as nickname, COALESCE(phone, '') as phone, COALESCE(email, '') as email, role, COALESCE(suspended, 0) as suspended, created_at, updated_at FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, ps, (p - 1) * ps);

  res.json({ list, total, page: p, pageSize: ps });
});

app.get('/api/admin/users/download', async (req, res) => {
  if (!authDb) return res.status(500).json({ error: '用户数据库不可用' });
  const { keyword } = req.query;
  const conditions = []; const params = [];
  if (keyword && keyword.trim()) {
    conditions.push('(username LIKE ? OR nickname LIKE ? OR phone LIKE ?)');
    const kw = `%${keyword.trim()}%`;
    params.push(kw, kw, kw);
  }
  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const list = authDb.prepare(`SELECT id, username, COALESCE(nickname, '') as nickname, COALESCE(phone, '') as phone, COALESCE(email, '') as email, role, created_at FROM users ${where} ORDER BY created_at DESC`).all(...params);

  try {
    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('用户列表');
    ws.columns = [
      { header: '用户ID', key: 'id', width: 32 },
      { header: '用户名', key: 'username', width: 20 },
      { header: '昵称', key: 'nickname', width: 20 },
      { header: '手机号', key: 'phone', width: 16 },
      { header: '邮箱', key: 'email', width: 24 },
      { header: '角色', key: 'role', width: 10 },
      { header: '注册时间', key: 'created_at', width: 22 },
    ];
    ws.getRow(1).font = { bold: true };
    list.forEach(u => ws.addRow(u));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=users-${Date.now()}.xlsx`);
    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    res.status(500).json({ error: '生成表格失败: ' + e.message });
  }
});

// Suspend user
app.post('/api/admin/users/:id/suspend', (req, res) => {
  if (!authDb) return res.status(500).json({ error: '数据库不可用' });
  try {
    authDb.prepare('UPDATE users SET suspended = 1, updated_at = datetime(\'now\') WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Unsuspend user
app.post('/api/admin/users/:id/unsuspend', (req, res) => {
  if (!authDb) return res.status(500).json({ error: '数据库不可用' });
  try {
    authDb.prepare('UPDATE users SET suspended = 0, updated_at = datetime(\'now\') WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete user
app.delete('/api/admin/users/:id', (req, res) => {
  if (!authDb) return res.status(500).json({ error: '数据库不可用' });
  try {
    authDb.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// HIDDEN: Forum management API routes, will re-enable later
/*
// ===================== Forum Management =====================

app.get('/api/admin/forum/posts', (req, res) => {
  if (!forumDb) return res.json({ list: [], total: 0 });
  const { keyword, page = '1', pageSize = '20' } = req.query;
  const p = Math.max(1, parseInt(page)), ps = Math.min(100, Math.max(1, parseInt(pageSize)));
  const conditions = []; const params = [];

  if (keyword && keyword.trim()) {
    conditions.push('(p.title LIKE ? OR p.content LIKE ? OR u.username LIKE ?)');
    const kw = `%${keyword.trim()}%`;
    params.push(kw, kw, kw);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const total = forumDb.prepare(`SELECT COUNT(*) as cnt FROM posts p LEFT JOIN users u ON p.user_id = u.id ${where}`).get(...params).cnt;
  const list = forumDb.prepare(`
    SELECT p.id, p.title, p.content, p.status, p.view_count, p.like_count, p.comment_count, p.created_at, p.updated_at,
           COALESCE(u.username, '未知') as username, COALESCE(p.board_id, '') as board_id
    FROM posts p LEFT JOIN users u ON p.user_id = u.id ${where}
    ORDER BY p.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, ps, (p - 1) * ps);

  res.json({ list, total, page: p, pageSize: ps });
});

// Hide post (set status to 'hidden')
app.post('/api/admin/forum/posts/:id/hide', (req, res) => {
  if (!forumDb) return res.status(500).json({ error: '数据库不可用' });
  try {
    forumDb.prepare("UPDATE posts SET status = 'hidden', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Unhide post (set status back to 'normal')
app.post('/api/admin/forum/posts/:id/unhide', (req, res) => {
  if (!forumDb) return res.status(500).json({ error: '数据库不可用' });
  try {
    forumDb.prepare("UPDATE posts SET status = 'normal', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete post
app.delete('/api/admin/forum/posts/:id', (req, res) => {
  if (!forumDb) return res.status(500).json({ error: '数据库不可用' });
  try {
    const postId = req.params.id;
    forumDb.prepare('DELETE FROM comments WHERE post_id = ?').run(postId);
    forumDb.prepare("DELETE FROM likes WHERE target_type = 'post' AND target_id = ?").run(postId);
    forumDb.prepare('DELETE FROM posts WHERE id = ?').run(postId);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
*/

// ===================== Analytics =====================

const categoryLabel = { chinese: '语文', science: '科学', english: '英语', general: '常识', math: '数学', mixed: '综合' };

app.get('/api/admin/analytics/overview', (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate || '1970-01-01';
    const end = endDate || '2099-12-31';
    let result = { users: {}, quiz: {}, forum: {}, store: {}, points: {}, usage: {} };

    // ── Users ──
    if (authDb) {
      result.users.total = authDb.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
      result.users.growth = authDb.prepare(`SELECT DATE(created_at) as d, COUNT(*) as cnt FROM users WHERE created_at >= ? AND created_at <= ? GROUP BY d ORDER BY d`).all(start + ' 00:00:00', end + ' 23:59:59');
      result.users.roleDist = authDb.prepare('SELECT role, COUNT(*) as cnt FROM users GROUP BY role').all();
      result.users.suspendedCount = authDb.prepare('SELECT COUNT(*) as cnt FROM users WHERE suspended = 1').get().cnt;
    }

    // ── Quiz (keep for dashboard but Analytics.vue ignores it) ──
    if (tzDb) {
      result.quiz.totalQuestions = tzDb.prepare('SELECT COUNT(*) as cnt FROM quiz_questions').get().cnt;
      result.quiz.byCategory = tzDb.prepare('SELECT category, COUNT(*) as cnt FROM quiz_questions GROUP BY category').all();
      result.quiz.byDifficulty = tzDb.prepare('SELECT difficulty, COUNT(*) as cnt FROM quiz_questions GROUP BY difficulty').all();
      result.quiz.totalPlayers = tzDb.prepare('SELECT COUNT(*) as cnt FROM users').get().cnt;
      result.quiz.totalGames = tzDb.prepare('SELECT COALESCE(SUM(games_played), 0) as cnt FROM users').get().cnt;
    }

    // HIDDEN: forum and store analytics, will re-enable later
    /*
    // ── Forum (posts / comments / likes growth) ──
    if (forumDb) {
      result.forum.totalPosts = forumDb.prepare("SELECT COUNT(*) as cnt FROM posts WHERE status = 'normal'").get().cnt;
      result.forum.hiddenPosts = forumDb.prepare("SELECT COUNT(*) as cnt FROM posts WHERE status = 'hidden'").get().cnt;
      result.forum.totalComments = forumDb.prepare('SELECT COUNT(*) as cnt FROM comments').get().cnt;
      result.forum.totalLikes = forumDb.prepare('SELECT COUNT(*) as cnt FROM likes').get().cnt;

      result.forum.postGrowth = forumDb.prepare(
        `SELECT DATE(created_at) as d, COUNT(*) as cnt FROM posts WHERE created_at >= ? AND created_at <= ? GROUP BY d ORDER BY d`
      ).all(start + ' 00:00:00', end + ' 23:59:59');

      result.forum.commentGrowth = forumDb.prepare(
        `SELECT DATE(created_at) as d, COUNT(*) as cnt FROM comments WHERE created_at >= ? AND created_at <= ? GROUP BY d ORDER BY d`
      ).all(start + ' 00:00:00', end + ' 23:59:59');

      result.forum.likeGrowth = forumDb.prepare(
        `SELECT DATE(created_at) as d, COUNT(*) as cnt FROM likes WHERE created_at >= ? AND created_at <= ? GROUP BY d ORDER BY d`
      ).all(start + ' 00:00:00', end + ' 23:59:59');
    }

    // ── Store (orders) ──
    if (storeDb) {
      result.store.totalOrders = storeDb.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status = 'completed'").get().cnt;
      result.store.totalPointsSpent = storeDb.prepare('SELECT COALESCE(SUM(points_spent), 0) as cnt FROM orders').get().cnt;
      result.store.orderGrowth = storeDb.prepare(
        `SELECT DATE(created_at) as d, COUNT(*) as cnt FROM orders WHERE created_at >= ? AND created_at <= ? AND status = 'completed' GROUP BY d ORDER BY d`
      ).all(start + ' 00:00:00', end + ' 23:59:59');
    }
    */

    // ── Points (accumulated / redeemed) ──
    if (authDb) {
      result.points.totalEarned = authDb.prepare('SELECT COALESCE(SUM(total_earned), 0) as cnt FROM points').get().cnt;
      result.points.totalSpent = authDb.prepare('SELECT COALESCE(SUM(total_spent), 0) as cnt FROM points').get().cnt;
      result.points.growth = authDb.prepare(
        `SELECT DATE(created_at) as d,
                SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as earned,
                SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as spent
         FROM point_transactions WHERE created_at >= ? AND created_at <= ? GROUP BY d ORDER BY d`
      ).all(start + ' 00:00:00', end + ' 23:59:59');
    }

    // ── Sub-app usage ──
    if (analyticsDb) {
      result.usage.totalEvents = analyticsDb.prepare('SELECT COUNT(*) as cnt FROM usage_events').get().cnt;
      result.usage.byApp = analyticsDb.prepare(
        'SELECT app_name, COUNT(*) as cnt FROM usage_events GROUP BY app_name ORDER BY cnt DESC'
      ).all();
      result.usage.appGrowth = analyticsDb.prepare(
        `SELECT DATE(created_at) as d, app_name, COUNT(*) as cnt
         FROM usage_events WHERE created_at >= ? AND created_at <= ?
         GROUP BY d, app_name ORDER BY d`
      ).all(start + ' 00:00:00', end + ' 23:59:59');
    }

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===================== SPA fallback =====================
app.get('*', (req, res) => {
  try {
    const html = readFileSync('dist/index.html', 'utf8');
    res.send(html);
  } catch {
    res.status(404).send('Admin site not built');
  }
});

const PORT = process.env.PORT || 3099;
app.listen(PORT, () => console.log('Admin API running on port ' + PORT));
