const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const config = require('../config');

function generateTokens(user) {
  const accessToken = jwt.sign(
    { sub: user.id, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.accessExpiresIn }
  );

  // Long-lived token for cross-app auth sync (grandkidsgo_token cookie)
  const syncToken = jwt.sign(
    { sub: user.id, role: user.role },
    config.jwt.secret,
    { expiresIn: '7d' }
  );

  const refreshToken = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(
    `INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)`
  ).run(uuidv4(), user.id, refreshToken, expiresAt);

  return { accessToken, syncToken, refreshToken, expiresAt };
}

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch {
    return null;
  }
}

function verifyRefreshToken(token) {
  const session = db.prepare(
    `SELECT s.*, u.role FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime('now')`
  ).get(token);
  return session || null;
}

function revokeSession(token) {
  db.prepare(`DELETE FROM sessions WHERE token = ?`).run(token);
}

function revokeAllUserSessions(userId) {
  db.prepare(`DELETE FROM sessions WHERE user_id = ?`).run(userId);
}

function setTokenCookie(res, accessToken, syncToken) {
  const sharedOpts = {
    sameSite: 'lax',
    path: '/',
  };

  // httpOnly cookie for server-side auth — session cookie (no expires), cleared on browser close
  // DO NOT add domain here: otherwise this short-lived cookie would shadow the
  // Authorization header in sub-app proxied requests (see middleware/auth.js)
  res.cookie('access_token', accessToken, {
    ...sharedOpts,
    httpOnly: true,
    secure: true,
  });

  // Non-httpOnly cookie for client-side JS cross-app auth sync — session cookie (no expires)
  // MUST have domain=.grandand.com so all sub-apps can read it via document.cookie
  res.cookie('grandkidsgo_token', syncToken, {
    ...sharedOpts,
    httpOnly: false,
    secure: !!config.cookieDomain,
    ...(config.cookieDomain ? { domain: config.cookieDomain } : {}),
  });
}

module.exports = {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
  revokeSession,
  revokeAllUserSessions,
  setTokenCookie,
};
