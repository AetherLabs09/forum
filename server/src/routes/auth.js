const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/init');
const config = require('../config');
const { generateId } = require('../utils');
const { authMiddleware } = require('../middleware/auth');
const { logOperation } = require('../middleware/logger');

const router = express.Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user) {
    return res.status(401).json({ code: 401, message: '用户名或密码错误' });
  }
  if (user.status !== 'active') {
    return res.status(403).json({ code: 403, message: '账号已被禁用' });
  }
  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ code: 401, message: '用户名或密码错误' });
  }
  db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
  const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: config.jwtExpire });
  logOperation(user.id, user.username, '登录系统', 'user', user.id, '登录成功', req.ip);
  res.json({
    code: 200,
    message: '登录成功',
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        role: user.role
      }
    }
  });
});

router.get('/info', authMiddleware, (req, res) => {
  res.json({
    code: 200,
    data: req.user
  });
});

router.post('/logout', authMiddleware, (req, res) => {
  logOperation(req.user.id, req.user.username, '退出系统', 'user', req.user.id, '退出登录', req.ip);
  res.json({ code: 200, message: '退出成功' });
});

module.exports = router;
