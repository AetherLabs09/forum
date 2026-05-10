const express = require('express');
const db = require('../db/init');
const { generateId } = require('../utils');
const { authMiddleware, permissionMiddleware } = require('../middleware/auth');
const { logOperation } = require('../middleware/logger');

const router = express.Router();

router.use(authMiddleware);

router.get('/list', (req, res) => {
  const { keyword, status } = req.query;
  let sql = 'SELECT * FROM categories WHERE 1=1';
  const params = [];
  if (keyword) {
    sql += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  sql += ' ORDER BY sort_order ASC, created_at DESC';
  const list = db.prepare(sql).all(...params);
  res.json({ code: 200, data: list });
});

router.get('/:id', (req, res) => {
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!category) {
    return res.status(404).json({ code: 404, message: '分类不存在' });
  }
  const managers = db.prepare(`
    SELECT u.id, u.username, u.nickname
    FROM category_managers cm
    LEFT JOIN users u ON cm.user_id = u.id
    WHERE cm.category_id = ?
  `).all(req.params.id);
  category.managers = managers;
  const postCount = db.prepare('SELECT COUNT(*) as count FROM posts WHERE category_id = ?').get(req.params.id)?.count || 0;
  category.postCount = postCount;
  res.json({ code: 200, data: category });
});

router.post('/', permissionMiddleware('admin'), (req, res) => {
  const { name, description, sortOrder } = req.body;
  if (!name) {
    return res.status(400).json({ code: 400, message: '分类名称不能为空' });
  }
  const id = generateId();
  db.prepare('INSERT INTO categories (id, name, description, sort_order) VALUES (?, ?, ?, ?)')
    .run(id, name, description, sortOrder || 0);
  logOperation(req.user.id, req.user.username, '创建分类', 'category', id, `创建分类: ${name}`, req.ip);
  res.json({ code: 200, message: '创建成功' });
});

router.put('/:id', permissionMiddleware('admin'), (req, res) => {
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!category) {
    return res.status(404).json({ code: 404, message: '分类不存在' });
  }
  const { name, description, sortOrder, status } = req.body;
  db.prepare('UPDATE categories SET name = ?, description = ?, sort_order = ?, status = ? WHERE id = ?')
    .run(name || category.name, description || category.description, sortOrder ?? category.sort_order, status || category.status, req.params.id);
  logOperation(req.user.id, req.user.username, '更新分类', 'category', req.params.id, `更新分类: ${category.name}`, req.ip);
  res.json({ code: 200, message: '更新成功' });
});

router.delete('/:id', permissionMiddleware('admin'), (req, res) => {
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!category) {
    return res.status(404).json({ code: 404, message: '分类不存在' });
  }
  const postCount = db.prepare('SELECT COUNT(*) as count FROM posts WHERE category_id = ?').get(req.params.id)?.count || 0;
  if (postCount > 0) {
    return res.status(400).json({ code: 400, message: '该分类下有帖子，无法删除' });
  }
  db.prepare('DELETE FROM category_managers WHERE category_id = ?').run(req.params.id);
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  logOperation(req.user.id, req.user.username, '删除分类', 'category', req.params.id, `删除分类: ${category.name}`, req.ip);
  res.json({ code: 200, message: '删除成功' });
});

router.put('/:id/managers', permissionMiddleware('admin'), (req, res) => {
  const { userIds } = req.body;
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  if (!category) {
    return res.status(404).json({ code: 404, message: '分类不存在' });
  }
  db.prepare('DELETE FROM category_managers WHERE category_id = ?').run(req.params.id);
  if (userIds && Array.isArray(userIds)) {
    const insert = db.prepare('INSERT INTO category_managers (id, category_id, user_id) VALUES (?, ?, ?)');
    userIds.forEach(userId => insert.run(generateId(), req.params.id, userId));
  }
  logOperation(req.user.id, req.user.username, '设置分类管理员', 'category', req.params.id, `设置分类 ${category.name} 的管理员`, req.ip);
  res.json({ code: 200, message: '设置成功' });
});

module.exports = router;
