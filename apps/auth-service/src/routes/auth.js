const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { generateTokens, verifyRefreshToken, revokeSession, revokeAllUserSessions, setTokenCookie } = require('../utils/jwt');
const { authenticate } = require('../middleware/auth');
const { sendSms } = require('../sms');

const router = express.Router();

// POST /api/auth/register - Register with username + password + phone
router.post('/register', async (req, res) => {
  const { username, password, phone, verificationCode, nickname, gender, birthday, childNickname, childGender, childBirthday } = req.body;

  if (!username || !password) {
    return res.status(400).json({ code: 'INVALID_INPUT', message: '用户名和密码不能为空' });
  }
  if (username.length < 2 || username.length > 20) {
    return res.status(400).json({ code: 'INVALID_USERNAME', message: '用户名长度需在2-20个字符之间' });
  }
  if (password.length < 6) {
    return res.status(400).json({ code: 'INVALID_PASSWORD', message: '密码长度不能少于6位' });
  }

  // If phone provided, verify code
  if (phone) {
    if (!verificationCode) {
      return res.status(400).json({ code: 'VERIFICATION_REQUIRED', message: '手机号验证码不能为空' });
    }
    const valid = db.prepare(
      `SELECT * FROM verification_codes WHERE phone = ? AND code = ? AND purpose = 'register' AND used = 0 AND expires_at > datetime('now')`
    ).get(phone, verificationCode);
    if (!valid) {
      return res.status(400).json({ code: 'INVALID_VERIFICATION_CODE', message: '验证码错误或已过期' });
    }
    db.prepare(`UPDATE verification_codes SET used = 1 WHERE id = ?`).run(valid.id);
  }

  // Check duplicates
  const existing = db.prepare(`SELECT id FROM users WHERE username = ? OR phone = ?`).get(username, phone);
  if (existing) {
    return res.status(409).json({ code: 'USER_EXISTS', message: '用户名或手机号已注册' });
  }

  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, 10);

  db.prepare(
    `INSERT INTO users (id, username, phone, password_hash, nickname, gender, birthday) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, username, phone || null, passwordHash, nickname || username, gender || null, birthday || null);

  // Create initial child record
  if (childNickname) {
    const childId = uuidv4();
    const autoNickname = childGender === '男' ? '超帅' : childGender === '女' ? '小可爱' : '宝贝';
    db.prepare(
      `INSERT INTO children (id, user_id, nickname, gender, birthday) VALUES (?, ?, ?, ?, ?)`
    ).run(childId, id, childNickname || autoNickname, childGender || null, childBirthday || null);
  }

  // Create points record
  db.prepare(`INSERT INTO points (user_id, balance, total_earned) VALUES (?, 0, 0)`).run(id);

  const tokens = generateTokens({ id, role: 'user' });

  setTokenCookie(res, tokens.accessToken, tokens.syncToken);

  // Fetch created user with children
  const user = db.prepare(`SELECT id, username, nickname, phone, gender, birthday FROM users WHERE id = ?`).get(id);
  const children = db.prepare(`SELECT * FROM children WHERE user_id = ?`).all(id);

  res.json({
    code: 'OK',
    data: {
      user: { ...user, children },
      ...tokens,
    },
  });
});

// POST /api/auth/login - Login with username/phone + password
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ code: 'INVALID_INPUT', message: '用户名和密码不能为空' });
  }

  const user = db.prepare(`SELECT * FROM users WHERE username = ? OR phone = ?`).get(username, username);
  if (!user) {
    return res.status(401).json({ code: 'INVALID_CREDENTIALS', message: '用户名或密码错误' });
  }

  // Check if account is suspended
  if (user.suspended) {
    return res.status(403).json({ code: 'ACCOUNT_SUSPENDED', message: '账号已被暂停，请联系管理员' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ code: 'INVALID_CREDENTIALS', message: '用户名或密码错误' });
  }

  const tokens = generateTokens(user);

  setTokenCookie(res, tokens.accessToken, tokens.syncToken);

  res.json({
    code: 'OK',
    data: {
      user: { id: user.id, username: user.username, nickname: user.nickname, avatar: user.avatar, phone: user.phone },
      ...tokens,
    },
  });
});

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ code: 'INVALID_INPUT', message: 'refreshToken 不能为空' });
  }

  const session = verifyRefreshToken(refreshToken);
  if (!session) {
    return res.status(401).json({ code: 'REFRESH_EXPIRED', message: '刷新令牌已过期' });
  }

  revokeSession(refreshToken);
  const tokens = generateTokens({ id: session.user_id, role: session.role });

  setTokenCookie(res, tokens.accessToken, tokens.syncToken);

  res.json({ code: 'OK', data: tokens });
});

// POST /api/auth/logout - Logout
router.post('/logout', (req, res) => {
  const refreshToken = req.body.refreshToken;
  if (refreshToken) {
    revokeSession(refreshToken);
  }
  res.clearCookie('access_token', { path: '/' }); // host-only cookie (no domain)
  res.clearCookie('grandkidsgo_token', { domain: '.grandand.com', path: '/' }); // shared cross-app cookie
  res.json({ code: 'OK' });
});

// POST /api/auth/send-code - Send SMS verification code
router.post('/send-code', async (req, res) => {
  const { phone, purpose } = req.body;
  if (!phone) {
    return res.status(400).json({ code: 'INVALID_INPUT', message: '手机号不能为空' });
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  db.prepare(
    `INSERT INTO verification_codes (id, phone, code, purpose, expires_at) VALUES (?, ?, ?, ?, ?)`
  ).run(uuidv4(), phone, code, purpose || 'register', expiresAt);

  try {
    await sendSms(phone, code, purpose);
    res.json({ code: 'OK', message: '验证码已发送' });
  } catch (err) {
    console.error('[SMS] Failed to send:', err.message);
    res.status(500).json({ code: 'SMS_FAILED', message: '短信发送失败，请稍后重试' });
  }
});

// POST /api/auth/parent-consent - Parent consent for under-14 users
router.post('/parent-consent', async (req, res) => {
  const { userId, parentName, parentPhone, verificationCode } = req.body;
  if (!userId || !parentName || !parentPhone || !verificationCode) {
    return res.status(400).json({ code: 'INVALID_INPUT', message: '家长姓名、手机号和验证码不能为空' });
  }

  // Verify parent's phone code
  const valid = db.prepare(
    `SELECT * FROM verification_codes WHERE phone = ? AND code = ? AND purpose = 'parent_consent' AND used = 0 AND expires_at > datetime('now')`
  ).get(parentPhone, verificationCode);
  if (!valid) {
    return res.status(400).json({ code: 'INVALID_CODE', message: '验证码错误或已过期' });
  }
  db.prepare(`UPDATE verification_codes SET used = 1 WHERE id = ?`).run(valid.id);

  // Save consent
  const existing = db.prepare(`SELECT child_user_id FROM parent_consent WHERE child_user_id = ?`).get(userId);
  if (existing) {
    db.prepare(`UPDATE parent_consent SET parent_name = ?, parent_phone = ?, consent_at = datetime('now'), verified = 1, updated_at = datetime('now') WHERE child_user_id = ?`)
      .run(parentName, parentPhone, userId);
  } else {
    db.prepare(`INSERT INTO parent_consent (child_user_id, parent_name, parent_phone, consent_at, verified) VALUES (?, ?, ?, datetime('now'), 1)`)
      .run(userId, parentName, parentPhone);
  }

  // Enable youth mode for this user
  db.prepare(`INSERT OR REPLACE INTO youth_mode_settings (user_id, enabled, daily_time_limit_minutes, night_mode_enabled) VALUES (?, 1, 40, 1)`)
    .run(userId);

  res.json({ code: 'OK', message: '家长同意已确认，青少年模式已启用' });
});

// POST /api/auth/verify-code - Verify code (for password reset flow)
router.post('/verify-code', (req, res) => {
  const { phone, code, purpose } = req.body;
  const valid = db.prepare(
    `SELECT * FROM verification_codes WHERE phone = ? AND code = ? AND purpose = ? AND used = 0 AND expires_at > datetime('now')`
  ).get(phone, code, purpose || 'register');
  if (!valid) {
    return res.status(400).json({ code: 'INVALID_CODE', message: '验证码错误或已过期' });
  }
  db.prepare(`UPDATE verification_codes SET used = 1 WHERE id = ?`).run(valid.id);
  res.json({ code: 'OK' });
});

// POST /api/auth/reset-password - Reset password with verification code
router.post('/reset-password', (req, res) => {
  const { phone, code, newPassword } = req.body;
  const valid = db.prepare(
    `SELECT * FROM verification_codes WHERE phone = ? AND code = ? AND purpose = 'reset_password' AND used = 0 AND expires_at > datetime('now')`
  ).get(phone, code);
  if (!valid) {
    return res.status(400).json({ code: 'INVALID_CODE', message: '验证码错误或已过期' });
  }
  db.prepare(`UPDATE verification_codes SET used = 1 WHERE id = ?`).run(valid.id);

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE phone = ?`).run(hash, phone);
  revokeAllUserSessions(db.prepare(`SELECT id FROM users WHERE phone = ?`).get(phone)?.id);

  res.json({ code: 'OK' });
});

// GET /api/auth/me - Get current user
router.get('/me', authenticate, (req, res) => {
  const user = db.prepare(`SELECT id, username, phone, nickname, avatar, gender, birthday, role, created_at FROM users WHERE id = ?`).get(req.user.id);
  if (!user) {
    return res.status(404).json({ code: 'USER_NOT_FOUND', message: '用户不存在' });
  }
  const points = db.prepare(`SELECT balance FROM points WHERE user_id = ?`).get(user.id);
  const children = db.prepare(`SELECT * FROM children WHERE user_id = ? ORDER BY created_at ASC`).all(user.id);
  res.json({ code: 'OK', data: { ...user, points: points?.balance || 0, children } });
});

// POST /api/auth/phone-login - Phone + verification code login (auto-register)
router.post('/phone-login', async (req, res) => {
  const { phone, code, nickname, gender, birthday, childNickname, childGender, childBirthday } = req.body;
  if (!phone || !code) {
    return res.status(400).json({ code: 'INVALID_INPUT', message: '手机号和验证码不能为空' });
  }

  const valid = db.prepare(
    `SELECT * FROM verification_codes WHERE phone = ? AND code = ? AND used = 0 AND expires_at > datetime('now')`
  ).get(phone, code);
  if (!valid) {
    return res.status(400).json({ code: 'INVALID_CODE', message: '验证码错误或已过期' });
  }
  db.prepare(`UPDATE verification_codes SET used = 1 WHERE id = ?`).run(valid.id);

  // Find existing user or auto-register
  let user = db.prepare(`SELECT * FROM users WHERE phone = ?`).get(phone);
  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    const id = uuidv4();
    const defaultName = nickname || ('user_' + phone.substring(phone.length - 4));
    db.prepare(
      `INSERT INTO users (id, phone, username, nickname, gender, birthday) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, phone, defaultName, defaultName, gender || null, birthday || null);
    db.prepare(`INSERT INTO points (user_id, balance, total_earned) VALUES (?, 0, 0)`).run(id);

    // Create initial child record
    if (childNickname) {
      const childId = uuidv4();
      const autoChildName = childGender === '男' ? '超帅' : childGender === '女' ? '小可爱' : '宝贝';
      db.prepare(
        `INSERT INTO children (id, user_id, nickname, gender, birthday) VALUES (?, ?, ?, ?, ?)`
      ).run(childId, id, childNickname || autoChildName, childGender || null, childBirthday || null);
    }

    user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(id);
  }

  const tokens = generateTokens(user);
  setTokenCookie(res, tokens.accessToken, tokens.syncToken);

  const children = db.prepare(`SELECT * FROM children WHERE user_id = ?`).all(user.id);

  res.json({
    code: 'OK',
    data: {
      user: { id: user.id, username: user.username, nickname: user.nickname, avatar: user.avatar, phone: user.phone, gender: user.gender, birthday: user.birthday, children },
      isNewUser,
      ...tokens,
    },
  });
});

module.exports = router;
