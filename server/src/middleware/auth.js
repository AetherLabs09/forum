const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db/init');

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ code: 401, message: '未登录' });
  }
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const user = db.prepare('SELECT id, username, nickname, role, status FROM users WHERE id = ?').get(decoded.userId);
    if (!user || user.status !== 'active') {
      return res.status(401).json({ code: 401, message: '用户不存在或已被禁用' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ code: 401, message: 'token无效' });
  }
}

function permissionMiddleware(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ code: 403, message: '无权限访问' });
    }
    next();
  };
}

module.exports = { authMiddleware, permissionMiddleware };
