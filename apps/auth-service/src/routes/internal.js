/**
 * 内部服务 API（service-to-service 调，**不**对外暴露）
 * 走天下 v2.0 第九节 D：勋章兑换积分
 *
 * POST /api/internal/points/add
 *  - Header: x-service-token (与 auth-service .env 的 INTERNAL_SERVICES_TOKEN 匹配)
 *  - Body: { userId, points, source, refId }
 *  - 用途：travel-guide 等模块给用户加积分
 *
 * 安全：
 *  - IP 白名单（生产部署在内网同机器时可放宽）
 *  - token 高熵（v1 上线期用 dev-internal-token）
 *  - 操作留痕到 audit log
 */

const express = require('express');
const db = require('../db');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const EXPECTED_TOKEN = process.env.INTERNAL_SERVICES_TOKEN || 'dev-internal-token';

// 内部服务来源白名单（同机器部署时所有内网调用都可放行；生产可收紧）
function isInternalOrigin(req) {
  const raw = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || '';
  // req.ip 在 trust proxy 下是规范化后的；raw 可能是 ::ffff:127.0.0.1
  const ip = String(raw).replace(/^::ffff:/, '');
  return ip === '127.0.0.1' || ip === '::1' || ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.');
}

function serviceAuth(req, res, next) {
  const token = req.headers['x-service-token'];
  if (token !== EXPECTED_TOKEN) {
    return res.status(403).json({ code: 'FORBIDDEN', message: 'service token 错' });
  }
  if (!isInternalOrigin(req)) {
    return res.status(403).json({ code: 'FORBIDDEN', message: '来源 IP 不在白名单' });
  }
  next();
}

router.post('/points/add', serviceAuth, (req, res) => {
  const { userId, points, source, refId, description } = req.body || {};
  if (!userId || typeof points !== 'number' || points <= 0) {
    return res.status(400).json({ code: 'INVALID_INPUT', message: 'userId / points(>0) 必填' });
  }
  if (points > 10000) {
    return res.status(400).json({ code: 'INVALID_POINTS', message: '单次最多 10000 积分' });
  }

  const allowedSources = ['badge_exchange', 'weekly_bonus', 'monthly_bonus', 'annual_bonus', 'manual'];
  const safeSource = allowedSources.includes(source) ? source : 'manual';

  try {
    // 确保 points 记录存在
    const exist = db.prepare(`SELECT user_id FROM points WHERE user_id = ?`).get(userId);
    if (!exist) {
      db.prepare(`INSERT INTO points (user_id, balance, total_earned) VALUES (?, 0, 0)`).run(userId);
    }

    db.prepare(
      `UPDATE points
       SET balance = balance + ?,
           total_earned = total_earned + ?,
           updated_at = datetime('now')
       WHERE user_id = ?`,
    ).run(points, points, userId);

    const txId = uuidv4();
    db.prepare(
      `INSERT INTO point_transactions (id, user_id, amount, type, description) VALUES (?, ?, ?, ?, ?)`,
    ).run(txId, userId, points, safeSource, description || `来源: ${safeSource}${refId ? ` (${refId})` : ''}`);

    const balance = db.prepare(`SELECT balance FROM points WHERE user_id = ?`).get(userId);
    return res.json({ code: 'OK', data: { txId, balance: balance?.balance ?? 0, added: points } });
  } catch (e) {
    console.error('[internal/points/add]', e.message);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: e.message });
  }
});

router.post('/points/revert', serviceAuth, (req, res) => {
  // 撤回场景：用户撤回素材 → 自动撤销积分
  const { userId, points, source, refId } = req.body || {};
  if (!userId || typeof points !== 'number' || points <= 0) {
    return res.status(400).json({ code: 'INVALID_INPUT', message: 'userId / points(>0) 必填' });
  }
  try {
    const balance = db.prepare(`SELECT balance FROM points WHERE user_id = ?`).get(userId);
    if (!balance || balance.balance < points) {
      return res.status(400).json({ code: 'INSUFFICIENT_BALANCE', message: '余额不足（已消费部分不追回）' });
    }
    db.prepare(
      `UPDATE points
       SET balance = balance - ?,
           updated_at = datetime('now')
       WHERE user_id = ?`,
    ).run(points, userId);
    const txId = uuidv4();
    db.prepare(
      `INSERT INTO point_transactions (id, user_id, amount, type, description) VALUES (?, ?, ?, ?, ?)`,
    ).run(txId, userId, -points, `${source}_revert`, `撤回: ${source}${refId ? ` (${refId})` : ''}`);
    return res.json({ code: 'OK', data: { txId, balance: balance.balance - points, reverted: points } });
  } catch (e) {
    console.error('[internal/points/revert]', e.message);
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: e.message });
  }
});

module.exports = router;
