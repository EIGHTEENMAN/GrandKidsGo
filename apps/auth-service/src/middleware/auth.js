const { verifyAccessToken } = require('../utils/jwt');

function authenticate(req, res, next) {
  // Try Authorization header first (explicit per-request token), then cookie fallback
  // Cookie-based access_token now has domain=.grandand.com and is sent to all subdomains;
  // the Authorization header carries the correct token (syncToken or accessToken),
  // while the cookie may hold a stale short-lived accessToken.
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  }

  if (!token) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: '未登录' });
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    return res.status(401).json({ code: 'TOKEN_EXPIRED', message: '登录已过期，请重新登录' });
  }

  req.user = { id: payload.sub, role: payload.role };
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ code: 'FORBIDDEN', message: '无权限' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
