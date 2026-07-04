import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, '..', 'data', 'forum.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, username TEXT NOT NULL, avatar TEXT DEFAULT '',
    role TEXT DEFAULT 'user', suspended INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS boards (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0, post_count INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY, board_id TEXT NOT NULL, user_id TEXT NOT NULL,
    title TEXT NOT NULL, content TEXT NOT NULL,
    view_count INTEGER DEFAULT 0, like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0, hot_score REAL DEFAULT 0,
    is_pinned INTEGER DEFAULT 0, is_essence INTEGER DEFAULT 0,
    status TEXT DEFAULT 'normal',
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (board_id) REFERENCES boards(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY, post_id TEXT NOT NULL, user_id TEXT NOT NULL,
    content TEXT NOT NULL, parent_id TEXT,
    like_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT, target_type TEXT NOT NULL,
    target_id TEXT NOT NULL, user_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(target_type, target_id, user_id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL,
    type TEXT NOT NULL, content TEXT, related_id TEXT,
    is_read INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_type TEXT NOT NULL, target_id TEXT NOT NULL,
    reporter_id TEXT NOT NULL, reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')), handled_at TEXT
  );
`);

// Migration: add suspended column for existing databases
try { db.exec('ALTER TABLE users ADD COLUMN suspended INTEGER DEFAULT 0'); } catch {}

// Seed boards
const boardCount = db.prepare('SELECT COUNT(*) as cnt FROM boards').get();
if (boardCount.cnt === 0) {
  const boards = [
    ['parenting', '亲子交流', '分享育儿经验、亲子互动心得', 1],
    ['education', '学习教育', '讨论儿童教育方法、学习资源', 2],
    ['travel', '亲子旅行', '旅行攻略、出行经验交流', 3],
    ['fun', '趣味分享', '好玩的、有趣的内容分享', 4],
    ['feedback', '建议反馈', '对童慧行平台的建议和反馈', 5],
  ];
  const insert = db.prepare('INSERT INTO boards (id, name, description, sort_order) VALUES (?, ?, ?, ?)');
  db.transaction(() => { for (const b of boards) insert.run(...b); })();
}

// Hot score update trigger (simplified Reddit algorithm)
db.exec(`
  CREATE TRIGGER IF NOT EXISTS update_hot_score AFTER UPDATE OF like_count, comment_count ON posts
  BEGIN
    UPDATE posts SET hot_score = (
      (NEW.like_count * 3.0 + NEW.comment_count * 2.0) /
      (julianday('now') - julianday(NEW.created_at) + 1.0)
    ) WHERE id = NEW.id;
  END;
`);

// Recalculate all hot scores
db.exec(`
  UPDATE posts SET hot_score = (
    (like_count * 3.0 + comment_count * 2.0) /
    (julianday('now') - julianday(created_at) + 1.0)
  );
`);

export default db;
