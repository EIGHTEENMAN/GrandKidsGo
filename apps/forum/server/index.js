import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3005;
const JWT_SECRET = process.env.JWT_SECRET || 'grandkidsgo-forum-dev';
const MODERATION_URL = process.env.MODERATION_URL || 'http://localhost:3020';

async function checkContent(text, userId, username, contentType, sourceService) {
  try {
    const r = await fetch(`${MODERATION_URL}/api/moderation/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, userId, username, contentType, sourceService }),
    });
    return await r.json();
  } catch {
    // If moderation service is down, block content to comply with 先审后发
    return { passed: false, action: 'block', reason: '审核服务暂时不可用，请稍后再试' };
  }
}

const app = express();
app.use(express.json());

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: '未登录' });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: '登录已过期' }); }
}

function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try { req.user = jwt.verify(header.slice(7), JWT_SECRET); } catch { /* ignore */ }
  }
  next();
}

function requireActiveUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: '未登录' });
  const user = db.prepare('SELECT suspended FROM users WHERE id = ?').get(req.user.id);
  if (user?.suspended) return res.status(403).json({ error: '账号已被限制使用，无法执行此操作' });
  next();
}

// Auth
app.post('/api/auth', (req, res) => {
  const { userId, username } = req.body;
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!existing) db.prepare('INSERT INTO users (id, username) VALUES (?, ?)').run(userId, username);
  const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// Boards
app.get('/api/boards', (_req, res) => {
  const boards = db.prepare('SELECT * FROM boards ORDER BY sort_order').all();
  res.json(boards);
});

// Posts
app.post('/api/posts', auth, requireActiveUser, async (req, res) => {
  const { boardId, title, content } = req.body;
  if (!boardId || !title?.trim() || !content?.trim()) return res.status(400).json({ error: '缺少必填字段' });
  const board = db.prepare('SELECT id FROM boards WHERE id = ?').get(boardId);
  if (!board) return res.status(404).json({ error: '版块不存在' });

  // Content moderation
  const modResult = await checkContent(title + '\n' + content, req.user.id, req.user.username, 'post', 'forum');
  if (modResult.action === 'block') {
    return res.status(403).json({ error: `内容违规: ${modResult.reason}` });
  }

  db.prepare('INSERT INTO users (id, username) VALUES (?, ?) ON CONFLICT(id) DO NOTHING')
    .run(req.user.id, req.user.username);

  const id = uuidv4();
  db.prepare(
    'INSERT INTO posts (id, board_id, user_id, title, content) VALUES (?, ?, ?, ?, ?)'
  ).run(id, boardId, req.user.id, title.trim(), content.trim());
  db.prepare('UPDATE boards SET post_count = post_count + 1 WHERE id = ?').run(boardId);
  db.prepare(`
    UPDATE posts SET hot_score = (
      (like_count * 3.0 + comment_count * 2.0) /
      (julianday('now') - julianday(created_at) + 1.0)
    ) WHERE id = ?
  `).run(id);
  res.json({ id });
});

app.get('/api/posts', optionalAuth, (req, res) => {
  const { boardId, page = 1, sort = 'hot', limit = 20 } = req.query;
  const offset = (Math.max(1, Number(page)) - 1) * Number(limit);
  const orderBy = sort === 'latest' ? 'p.created_at DESC' : sort === 'newest' ? 'p.created_at DESC' : 'p.hot_score DESC, p.created_at DESC';

  let where = 'WHERE 1=1';
  const params = [];
  if (boardId) { where += ' AND p.board_id = ?'; params.push(boardId); }

  const posts = db.prepare(`
    SELECT p.id, p.title, p.board_id, p.view_count, p.like_count, p.comment_count,
           p.hot_score, p.is_pinned, p.is_essence, p.created_at,
           u.username, u.avatar,
           b.name as board_name,
           substr(p.content, 1, 200) as excerpt
    FROM posts p
    JOIN users u ON u.id = p.user_id
    JOIN boards b ON b.id = p.board_id
    ${where}
    ORDER BY p.is_pinned DESC, ${orderBy}
    LIMIT ? OFFSET ?
  `).all(...params, Number(limit), offset);

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM posts p ${where}`).get(...params).cnt;

  // Add user's likes
  if (req.user?.id) {
    const liked = db.prepare(
      "SELECT target_id FROM likes WHERE target_type = 'post' AND user_id = ?"
    ).all(req.user.id).map(r => r.target_id);
    for (const p of posts) p.isLiked = liked.includes(p.id);
  }

  res.json({ posts, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) });
});

app.get('/api/posts/:id', optionalAuth, (req, res) => {
  db.prepare('UPDATE posts SET view_count = view_count + 1 WHERE id = ?').run(req.params.id);
  const post = db.prepare(`
    SELECT p.*, u.username, u.avatar, b.name as board_name
    FROM posts p JOIN users u ON u.id = p.user_id JOIN boards b ON b.id = p.board_id
    WHERE p.id = ?
  `).get(req.params.id);
  if (!post) return res.status(404).json({ error: '帖子不存在' });
  if (req.user?.id) {
    const liked = db.prepare("SELECT id FROM likes WHERE target_type='post' AND target_id=? AND user_id=?").get(req.params.id, req.user.id);
    post.isLiked = !!liked;
  }
  res.json(post);
});

// Comments
app.get('/api/posts/:id/comments', (req, res) => {
  const comments = db.prepare(`
    SELECT c.*, u.username, u.avatar,
      (SELECT COUNT(*) FROM comments WHERE parent_id = c.id) as reply_count
    FROM comments c JOIN users u ON u.id = c.user_id
    WHERE c.post_id = ? ORDER BY c.created_at ASC
  `).all(req.params.id);

  // Build threaded structure
  const map = new Map();
  const roots = [];
  for (const c of comments) {
    c.replies = [];
    map.set(c.id, c);
    if (!c.parent_id || !map.has(c.parent_id)) roots.push(c);
    else map.get(c.parent_id).replies.push(c);
  }
  res.json(roots);
});

app.post('/api/posts/:id/comments', auth, requireActiveUser, async (req, res) => {
  const { content, parentId } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: '内容不能为空' });
  const post = db.prepare('SELECT id FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: '帖子不存在' });

  // Content moderation
  const modResult = await checkContent(content, req.user.id, req.user.username, 'comment', 'forum');
  if (modResult.action === 'block') {
    return res.status(403).json({ error: `内容违规: ${modResult.reason}` });
  }

  if (parentId) {
    const parent = db.prepare('SELECT id, post_id, user_id FROM comments WHERE id = ?').get(parentId);
    if (!parent || parent.post_id !== req.params.id) return res.status(400).json({ error: '父评论不存在' });
    // Notify parent comment author
    if (parent.user_id !== req.user.id) {
      db.prepare('INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, ?, ?, ?)')
        .run(parent.user_id, 'reply', `${req.user.username} 回复了你的评论`, req.params.id);
    }
  }

  const id = uuidv4();
  db.prepare('INSERT INTO comments (id, post_id, user_id, content, parent_id) VALUES (?, ?, ?, ?, ?)')
    .run(id, req.params.id, req.user.id, content.trim(), parentId || null);
  db.prepare('UPDATE posts SET comment_count = comment_count + 1 WHERE id = ?').run(req.params.id);

  // Notify post author
  const post2 = db.prepare('SELECT user_id FROM posts WHERE id = ?').get(req.params.id);
  if (post2?.user_id !== req.user.id) {
    db.prepare('INSERT INTO notifications (user_id, type, content, related_id) VALUES (?, ?, ?, ?)')
      .run(post2.user_id, 'comment', `${req.user.username} 评论了你的帖子`, req.params.id);
  }

  res.json({ id });
});

// Like
app.post('/api/like', auth, requireActiveUser, (req, res) => {
  const { targetType, targetId } = req.body;
  if (!['post', 'comment'].includes(targetType)) return res.status(400).json({ error: '无效类型' });

  const existing = db.prepare("SELECT id FROM likes WHERE target_type=? AND target_id=? AND user_id=?").get(targetType, targetId, req.user.id);
  if (existing) {
    db.prepare('DELETE FROM likes WHERE id = ?').run(existing.id);
    const col = targetType === 'post' ? 'like_count' : 'like_count';
    const table = targetType === 'post' ? 'posts' : 'comments';
    db.prepare(`UPDATE ${table} SET ${col} = MAX(0, ${col} - 1) WHERE id = ?`).run(targetId);
    res.json({ liked: false });
  } else {
    db.prepare("INSERT INTO likes (target_type, target_id, user_id) VALUES (?, ?, ?)").run(targetType, targetId, req.user.id);
    const col = targetType === 'post' ? 'like_count' : 'like_count';
    const table = targetType === 'post' ? 'posts' : 'comments';
    db.prepare(`UPDATE ${table} SET ${col} = ${col} + 1 WHERE id = ?`).run(targetId);
    res.json({ liked: true });
  }
});

// Notifications
app.get('/api/notifications', auth, (req, res) => {
  const list = db.prepare(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50'
  ).all(req.user.id);
  const unread = db.prepare(
    'SELECT COUNT(*) as cnt FROM notifications WHERE user_id = ? AND is_read = 0'
  ).get(req.user.id).cnt;
  res.json({ list, unread });
});

app.post('/api/notifications/read', auth, (_req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(_req.user.id);
  res.json({ success: true });
});

// Reports
app.post('/api/reports', auth, requireActiveUser, (req, res) => {
  const { targetType, targetId, reason } = req.body;
  if (!targetType || !targetId || !reason?.trim()) return res.status(400).json({ error: '缺少必填字段' });
  if (!['post', 'comment'].includes(targetType)) return res.status(400).json({ error: '无效类型' });

  db.prepare(
    'INSERT INTO reports (target_type, target_id, reporter_id, reason) VALUES (?, ?, ?, ?)'
  ).run(targetType, targetId, req.user.id, reason.trim());
  res.json({ success: true });
});

// Search
app.get('/api/search', (req, res) => {
  const { q } = req.query;
  if (!q?.trim()) return res.json({ posts: [] });
  const posts = db.prepare(`
    SELECT p.id, p.title, substr(p.content, 1, 200) as excerpt, p.created_at,
           u.username, b.name as board_name
    FROM posts p JOIN users u ON u.id = p.user_id JOIN boards b ON b.id = p.board_id
    WHERE p.title LIKE ? OR p.content LIKE ?
    ORDER BY p.hot_score DESC LIMIT 20
  `).all(`%${q}%`, `%${q}%`);
  res.json({ posts });
});

// Proxy /api/auth/* to auth-service for shared login (cross-app sync)
app.all(/^\/api\/auth\//, async (req, res) => {
  try {
    const targetUrl = 'http://127.0.0.1:3007' + req.originalUrl;
    const r = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || '',
        'Cookie': req.headers.cookie || '',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });
    // Forward Set-Cookie headers (auth-service sets grandkidsgo_token/access_token cookies)
    if (typeof r.headers.getSetCookie === 'function') {
      const setCookie = r.headers.getSetCookie();
      if (setCookie && setCookie.length > 0) {
        res.setHeader('Set-Cookie', setCookie);
      }
    }
    const data = await r.json();
    res.status(r.status).json(data);
  } catch {
    res.status(502).json({ code: 'ERROR', message: 'auth-service unavailable' });
  }
});

// Serve frontend
app.use(express.static(path.join(__dirname, '..', 'dist')));
app.use((_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[forum] running on port ${PORT}`);
});

export default app;
