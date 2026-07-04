import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, '..', 'data', 'moderation.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS violations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    username TEXT DEFAULT '',
    content_type TEXT NOT NULL,
    content_snippet TEXT DEFAULT '',
    reason TEXT NOT NULL,
    matched_word TEXT DEFAULT '',
    action TEXT NOT NULL DEFAULT 'warn',
    source_service TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS penalties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    violation_count INTEGER DEFAULT 1,
    penalty_level INTEGER DEFAULT 0,
    muted_until TEXT,
    banned INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    reporter_id TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    content_snippet TEXT DEFAULT '',
    reviewer_id TEXT,
    review_action TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    reviewed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS appeals (
    id TEXT PRIMARY KEY,
    violation_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    reviewer_id TEXT,
    review_note TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    reviewed_at TEXT,
    FOREIGN KEY (violation_id) REFERENCES violations(id)
  );
`);

export default db;
