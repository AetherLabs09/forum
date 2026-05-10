const express = require('express');
const db = require('../db/init');
const { authMiddleware, permissionMiddleware } = require('../middleware/auth');
const { logOperation } = require('../middleware/logger');

const router = express.Router();

router.use(authMiddleware);

router.get('/permissions', (req, res) => {
  const permissions = {
    admin: ['users', 'posts', 'comments', 'categories', 'roles', 'settings', 'logs', 'stats'],
    moderator: ['posts', 'comments', 'categories', 'stats'],
    user: []
  };
  res.json({ code: 200, data: permissions[req.user.role] || [] });
});

router.get('/list', permissionMiddleware('admin'), (req, res) => {
  const list = db.prepare('SELECT * FROM users WHERE role IN (?, ?) ORDER BY created_at DESC').all('admin', 'moderator');
  const result = list.map(u => ({
    id: u.id,
    username: u.username,
    nickname: u.nickname,
    role: u.role,
    created_at: u.created_at
  }));
  res.json({ code: 200, data: result });
});

router.put('/user/:id/role', permissionMiddleware('admin'), (req, res) => {
  const { role } = req.body;
  if (!['admin', 'moderator', 'user'].includes(role)) {
    return res.status(400).json({ code: 400, message: '无效的角色' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    return res.status(404).json({ code: 404, message: '用户不存在' });
  }
  if (user.role === 'admin' && role !== 'admin') {
    const adminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get().count;
    if (adminCount <= 1) {
      return res.status(400).json({ code: 400, message: '至少需要保留一个超级管理员' });
    }
  }
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  logOperation(req.user.id, req.user.username, '修改用户角色', 'user', req.params.id, `将 ${user.username} 的角色改为 ${role}`, req.ip);
  res.json({ code: 200, message: '角色修改成功' });
});

module.exports = router;
