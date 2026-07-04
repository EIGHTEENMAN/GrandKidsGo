const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('./config');

const dbDir = path.dirname(config.db.path);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(config.db.path, {
  nativeBinding: path.join(__dirname, '..', 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node'),
});

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    phone TEXT UNIQUE,
    wechat_openid TEXT UNIQUE,
    email TEXT,
    password_hash TEXT,
    nickname TEXT,
    avatar TEXT,
    role TEXT DEFAULT 'user',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS verification_codes (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL,
    code TEXT NOT NULL,
    purpose TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS points (
    user_id TEXT PRIMARY KEY,
    balance INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    total_spent INTEGER DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS point_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_verification_codes_phone ON verification_codes(phone, purpose);

  CREATE TABLE IF NOT EXISTS children (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    nickname TEXT NOT NULL,
    gender TEXT,
    age INTEGER,
    birthday TEXT,
    avatar TEXT,
    password_hash TEXT,
    game_level INTEGER DEFAULT 1,
    game_score INTEGER DEFAULT 0,
    challenge_points INTEGER DEFAULT 0,
    challenge_rank INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS learning_progress (
    id TEXT PRIMARY KEY,
    child_id TEXT NOT NULL,
    subject TEXT NOT NULL CHECK(subject IN ('poetry','classics','general','english','challenge')),
    items_learned INTEGER DEFAULT 0,
    time_spent_minutes INTEGER DEFAULT 0,
    accuracy REAL DEFAULT 0,
    last_studied_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (child_id) REFERENCES children(id),
    UNIQUE(child_id, subject)
  );

  CREATE TABLE IF NOT EXISTS parent_consent (
    child_user_id TEXT PRIMARY KEY,
    parent_name TEXT,
    parent_phone TEXT,
    consent_at TEXT,
    verified INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS youth_mode_settings (
    user_id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 1,
    daily_time_limit_minutes INTEGER DEFAULT 40,
    night_mode_enabled INTEGER DEFAULT 1,
    social_limited INTEGER DEFAULT 1,
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS daily_usage (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    date TEXT NOT NULL,
    minutes_used INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, date)
  );

  CREATE TABLE IF NOT EXISTS study_logs (
    id TEXT PRIMARY KEY,
    child_id TEXT NOT NULL,
    date TEXT NOT NULL,
    subject TEXT NOT NULL,
    items_learned INTEGER DEFAULT 0,
    time_spent_minutes INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (child_id) REFERENCES children(id),
    UNIQUE(child_id, date, subject)
  );

  CREATE INDEX IF NOT EXISTS idx_children_user ON children(user_id);
  CREATE INDEX IF NOT EXISTS idx_learning_progress_child ON learning_progress(child_id);
  CREATE INDEX IF NOT EXISTS idx_daily_usage_user ON daily_usage(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_study_logs_child_date ON study_logs(child_id, date);
`);

// Add new columns to users (safe migration)
try { db.exec(`ALTER TABLE users ADD COLUMN gender TEXT`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN birthday TEXT`); } catch (e) {}
try { db.exec(`ALTER TABLE users ADD COLUMN suspended INTEGER DEFAULT 0`); } catch (e) {}
try { db.exec(`ALTER TABLE children ADD COLUMN birthday TEXT`); } catch (e) {}
try { db.exec(`ALTER TABLE children ADD COLUMN password_hash TEXT`); } catch (e) {}
try { db.exec(`ALTER TABLE children ADD COLUMN game_level INTEGER DEFAULT 1`); } catch (e) {}
try { db.exec(`ALTER TABLE children ADD COLUMN game_score INTEGER DEFAULT 0`); } catch (e) {}
try { db.exec(`ALTER TABLE children ADD COLUMN challenge_points INTEGER DEFAULT 0`); } catch (e) {}
try { db.exec(`ALTER TABLE children ADD COLUMN challenge_rank INTEGER DEFAULT 0`); } catch (e) {}

// Periodic cleanup: delete expired sessions every 5 minutes
setInterval(() => {
  db.prepare(`DELETE FROM sessions WHERE expires_at < datetime('now')`).run();
  db.prepare(`DELETE FROM verification_codes WHERE expires_at < datetime('now')`).run();
}, 5 * 60 * 1000);

// Monthly point expiry (1st of each month at midnight)
// 用每天 0 点检查一次的方式实现，避免 setTimeout 超过 32 位 int 上限（24.8 天）
// 导致 Node 强制把 delay 设为 1ms 并持续刷 TimeoutOverflowWarning 警告（曾导致 /var/log/syslog 占 15G）
const checkMonthlyPointExpiry = () => {
  const now = new Date();
  if (now.getDate() === 1 && now.getHours() === 0) {
    db.prepare(`DELETE FROM point_transactions WHERE created_at < datetime('now', '-12 months')`).run();
  }
};
setInterval(checkMonthlyPointExpiry, 60 * 60 * 1000); // 每小时检查一次
checkMonthlyPointExpiry(); // 启动时执行一次

module.exports = db;
