import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3006;
const JWT_SECRET = process.env.JWT_SECRET || 'grandkidsgo-store-dev';

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

function ensureUser(userId, username) {
  const existing = db.prepare('SELECT id, points FROM users WHERE id = ?').get(userId);
  if (!existing) {
    db.prepare('INSERT INTO users (id, username, points) VALUES (?, ?, 0)').run(userId, username);
    return { points: 0 };
  }
  return existing;
}

// Auth
app.post('/api/auth', (req, res) => {
  const { userId, username } = req.body;
  const user = ensureUser(userId, username);
  const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, points: user.points });
});

// Products
app.get('/api/products', (_req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY sort_order').all();
  res.json(products);
});

// User info (points + items)
app.get('/api/user', auth, (req, res) => {
  const user = db.prepare('SELECT id, username, points FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const items = db.prepare(`
    SELECT ui.product_id, ui.quantity, p.name, p.category, p.image
    FROM user_items ui JOIN products p ON p.id = ui.product_id
    WHERE ui.user_id = ?
  `).all(req.user.id);

  const orders = db.prepare(`
    SELECT o.id, o.product_id, p.name as product_name, p.image, o.quantity, o.points_spent, o.status, o.created_at
    FROM orders o JOIN products p ON p.id = o.product_id
    WHERE o.user_id = ? ORDER BY o.created_at DESC LIMIT 50
  `).all(req.user.id);

  res.json({ user, items, orders });
});

// Redeem product
app.post('/api/redeem', auth, (req, res) => {
  const { productId, quantity = 1 } = req.body;
  if (!productId) return res.status(400).json({ error: '缺少商品ID' });
  if (quantity < 1 || quantity > 99) return res.status(400).json({ error: '数量无效' });

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
  if (!product) return res.status(404).json({ error: '商品不存在' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const totalPrice = product.price * quantity;
  if (user.points < totalPrice) return res.status(400).json({ error: `积分不足，需要 ${totalPrice} 积分` });

  db.transaction(() => {
    db.prepare('UPDATE users SET points = points - ? WHERE id = ?').run(totalPrice, req.user.id);

    const existing = db.prepare('SELECT id, quantity FROM user_items WHERE user_id = ? AND product_id = ?').get(req.user.id, productId);
    if (existing) {
      db.prepare('UPDATE user_items SET quantity = quantity + ? WHERE id = ?').run(quantity, existing.id);
    } else {
      db.prepare('INSERT INTO user_items (user_id, product_id, quantity) VALUES (?, ?, ?)').run(req.user.id, productId, quantity);
    }

    const orderId = uuidv4();
    db.prepare('INSERT INTO orders (id, user_id, product_id, quantity, points_spent) VALUES (?, ?, ?, ?, ?)').run(orderId, req.user.id, productId, quantity, totalPrice);

    res.json({ id: orderId, points_left: user.points - totalPrice });
  })();
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
  console.log(`[store] running on port ${PORT}`);
});

export default app;
