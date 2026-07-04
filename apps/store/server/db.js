import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, '..', 'data', 'store.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, username TEXT NOT NULL,
    points INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT DEFAULT '',
    category TEXT NOT NULL, price INTEGER NOT NULL,
    image TEXT DEFAULT '', stock INTEGER DEFAULT -1,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS user_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL,
    product_id TEXT NOT NULL, quantity INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
    product_id TEXT NOT NULL, quantity INTEGER DEFAULT 1,
    points_spent INTEGER NOT NULL, status TEXT DEFAULT 'completed',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
`);

// Seed products
const productCount = db.prepare('SELECT COUNT(*) as cnt FROM products').get();
if (productCount.cnt === 0) {
  const products = [
    ['badge01', '社区达人徽章', '在个人资料和帖子中展示，彰显社区身份', '徽章', 100, '🏅', 1],
    ['badge02', '学霸徽章', '学习小能手专属徽章', '徽章', 200, '🎓', 2],
    ['badge03', '旅行家徽章', '热爱旅行的小朋友专属', '徽章', 300, '🌍', 3],
    ['avatar01', '小恐龙头像', '可爱的绿色小恐龙头像', '头像', 150, '🦕', 1],
    ['avatar02', '太空人头像', '探索宇宙的太空人头像', '头像', 250, '👨‍🚀', 2],
    ['avatar03', '魔法师头像', '会魔法的可爱小法师', '头像', 350, '🧙', 3],
    ['theme01', '星空主题', '深邃的星空界面主题', '主题', 500, '🌌', 1],
    ['theme02', '森林主题', '清新的森林风格主题', '主题', 500, '🌲', 2],
    ['theme03', '海洋主题', '蓝色的海洋风格主题', '主题', 500, '🌊', 3],
    ['special01', '优先发帖权', '发帖无需审核，直接发布', '特权', 1000, '⚡', 1],
    ['special02', '自定义头衔', '在个人资料设置自定义称号', '特权', 800, '👑', 2],
    ['special03', '大额上传', '上传文件大小限制提升至10MB', '特权', 600, '📤', 3],
  ];
  const insert = db.prepare(
    'INSERT INTO products (id, name, description, category, price, image, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  db.transaction(() => { for (const p of products) insert.run(...p); })();
}

export default db;
