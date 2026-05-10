const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/init');
const { generateId } = require('../utils');
const { authMiddleware, permissionMiddleware } = require('../middleware/auth');
const { logOperation } = require('../middleware/logger');

const router = express.Router();

router.use(authMiddleware);

router.get('/list', (req, res) => {
  const { keyword, role, status, page = 1, pageSize = 10 } = req.query;
  let sql = 'SELECT id, username, nickname, email, avatar, role, status, created_at, last_login FROM users WHERE 1=1';
  const params = [];
  if (keyword) {
    sql += ' AND (username LIKE ? OR nickname LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (role) {
    sql += ' AND role = ?';
    params.push(role);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  const countSql = sql.replace('SELECT id, username, nickname, email, avatar, role, status, created_at, last_login', 'SELECT COUNT(*) as total');
  const total = db.prepare(countSql).get(...params)?.total || 0;
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  params.push(parseInt(pageSize), offset);
  const list = db.prepare(sql).all(...params);
  res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});

router.get('/:id', (req, res) => {
  const user = db.prepare('SELECT id, username, nickname, email, avatar, role, status, created_at, last_login FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    return res.status(404).json({ code: 404, message: '用户不存在' });
  }
  res.json({ code: 200, data: user });
});

router.post('/', permissionMiddleware('admin'), (req, res) => {
  const { username, password, nickname, email, role } = req.body;
  if (!username || !password) {
    return res.status(400).json({ code: 400, message: '用户名和密码不能为空' });
  }
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) {
    return res.status(400).json({ code: 400, message: '用户名已存在' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const id = generateId();
  db.prepare('INSERT INTO users (id, username, password, nickname, email, role) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, username, hash, nickname || username, email, role || 'user');
  logOperation(req.user.id, req.user.username, '创建用户', 'user', id, `创建用户: ${username}`, req.ip);
  res.json({ code: 200, message: '创建成功' });
});

router.put('/:id', permissionMiddleware('admin'), (req, res) => {
  const { nickname, email, role } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    return res.status(404).json({ code: 404, message: '用户不存在' });
  }
  db.prepare('UPDATE users SET nickname = ?, email = ?, role = ? WHERE id = ?')
    .run(nickname || user.nickname, email || user.email, role || user.role, req.params.id);
  logOperation(req.user.id, req.user.username, '更新用户', 'user', req.params.id, `更新用户信息: ${user.username}`, req.ip);
  res.json({ code: 200, message: '更新成功' });
});

router.put('/:id/status', permissionMiddleware('admin'), (req, res) => {
  const { status } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    return res.status(404).json({ code: 404, message: '用户不存在' });
  }
  if (user.role === 'admin') {
    return res.status(400).json({ code: 400, message: '不能禁用超级管理员' });
  }
  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, req.params.id);
  logOperation(req.user.id, req.user.username, '修改用户状态', 'user', req.params.id, `${user.username}状态改为: ${status}`, req.ip);
  res.json({ code: 200, message: '操作成功' });
});

router.put('/:id/reset-password', permissionMiddleware('admin'), (req, res) => {
  const { password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    return res.status(404).json({ code: 404, message: '用户不存在' });
  }
  const hash = bcrypt.hashSync(password || '123456', 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.params.id);
  logOperation(req.user.id, req.user.username, '重置密码', 'user', req.params.id, `重置用户 ${user.username} 的密码`, req.ip);
  res.json({ code: 200, message: '密码已重置为: 123456' });
});

router.delete('/:id', permissionMiddleware('admin'), (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) {
    return res.status(404).json({ code: 404, message: '用户不存在' });
  }
  if (user.role === 'admin') {
    return res.status(400).json({ code: 400, message: '不能删除超级管理员' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  logOperation(req.user.id, req.user.username, '删除用户', 'user', req.params.id, `删除用户: ${user.username}`, req.ip);
  res.json({ code: 200, message: '删除成功' });
});

module.exports = router;
