const express = require('express');
const db = require('../db/init');
const { generateId } = require('../utils');
const { authMiddleware, permissionMiddleware } = require('../middleware/auth');
const { logOperation } = require('../middleware/logger');

const router = express.Router();

router.use(authMiddleware);

router.get('/list', (req, res) => {
  const { keyword, categoryId, status, page = 1, pageSize = 10 } = req.query;
  let sql = `SELECT p.*, u.username as author_name, u.nickname as author_nickname, c.name as category_name
             FROM posts p
             LEFT JOIN users u ON p.author_id = u.id
             LEFT JOIN categories c ON p.category_id = c.id
             WHERE 1=1`;
  const params = [];
  if (keyword) {
    sql += ' AND (p.title LIKE ? OR p.content LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (categoryId) {
    sql += ' AND p.category_id = ?';
    params.push(categoryId);
  }
  if (status) {
    if (status === 'hidden') {
      sql += ' AND p.is_hidden = 1';
    } else {
      sql += ' AND p.status = ? AND p.is_hidden = 0';
      params.push(status);
    }
  }
  const countSql = sql.replace(/SELECT p\.\*, u\.username.*?FROM posts p/, 'SELECT COUNT(*) as total FROM posts p');
  const total = db.prepare(countSql).get(...params)?.total || 0;
  sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  params.push(parseInt(pageSize), offset);
  const list = db.prepare(sql).all(...params);
  res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});

router.get('/:id', (req, res) => {
  const post = db.prepare(`
    SELECT p.*, u.username as author_name, u.nickname as author_nickname, c.name as category_name
    FROM posts p
    LEFT JOIN users u ON p.author_id = u.id
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `).get(req.params.id);
  if (!post) {
    return res.status(404).json({ code: 404, message: '帖子不存在' });
  }
  const comments = db.prepare(`
    SELECT c.*, u.username as author_name, u.nickname as author_nickname
    FROM comments c
    LEFT JOIN users u ON c.author_id = u.id
    WHERE c.post_id = ? AND c.is_hidden = 0
    ORDER BY c.created_at ASC
  `).all(req.params.id);
  post.comments = comments;
  res.json({ code: 200, data: post });
});

router.post('/', (req, res) => {
  const { title, content, categoryId } = req.body;
  if (!title || !content) {
    return res.status(400).json({ code: 400, message: '标题和内容不能为空' });
  }
  const id = generateId();
  db.prepare('INSERT INTO posts (id, title, content, author_id, category_id) VALUES (?, ?, ?, ?, ?)')
    .run(id, title, content, req.user.id, categoryId);
  logOperation(req.user.id, req.user.username, '发布帖子', 'post', id, `发布帖子: ${title}`, req.ip);
  res.json({ code: 200, message: '发布成功' });
});

router.put('/:id', (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) {
    return res.status(404).json({ code: 404, message: '帖子不存在' });
  }
  if (post.author_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ code: 403, message: '无权限修改此帖子' });
  }
  const { title, content, categoryId } = req.body;
  db.prepare('UPDATE posts SET title = ?, content = ?, category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(title || post.title, content || post.content, categoryId || post.category_id, req.params.id);
  logOperation(req.user.id, req.user.username, '更新帖子', 'post', req.params.id, `更新帖子: ${post.title}`, req.ip);
  res.json({ code: 200, message: '更新成功' });
});

router.put('/:id/top', permissionMiddleware('admin', 'moderator'), (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) {
    return res.status(404).json({ code: 404, message: '帖子不存在' });
  }
  const newTop = post.is_top ? 0 : 1;
  db.prepare('UPDATE posts SET is_top = ? WHERE id = ?').run(newTop, req.params.id);
  logOperation(req.user.id, req.user.username, newTop ? '置顶帖子' : '取消置顶', 'post', req.params.id, post.title, req.ip);
  res.json({ code: 200, message: newTop ? '已置顶' : '已取消置顶' });
});

router.put('/:id/essence', permissionMiddleware('admin', 'moderator'), (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) {
    return res.status(404).json({ code: 404, message: '帖子不存在' });
  }
  const newEssence = post.is_essence ? 0 : 1;
  db.prepare('UPDATE posts SET is_essence = ? WHERE id = ?').run(newEssence, req.params.id);
  logOperation(req.user.id, req.user.username, newEssence ? '加精帖子' : '取消加精', 'post', req.params.id, post.title, req.ip);
  res.json({ code: 200, message: newEssence ? '已加精' : '已取消加精' });
});

router.put('/:id/hide', permissionMiddleware('admin', 'moderator'), (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) {
    return res.status(404).json({ code: 404, message: '帖子不存在' });
  }
  const newHidden = post.is_hidden ? 0 : 1;
  db.prepare('UPDATE posts SET is_hidden = ? WHERE id = ?').run(newHidden, req.params.id);
  logOperation(req.user.id, req.user.username, newHidden ? '隐藏帖子' : '显示帖子', 'post', req.params.id, post.title, req.ip);
  res.json({ code: 200, message: newHidden ? '已隐藏' : '已显示' });
});

router.delete('/:id', permissionMiddleware('admin', 'moderator'), (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) {
    return res.status(404).json({ code: 404, message: '帖子不存在' });
  }
  db.prepare('DELETE FROM comments WHERE post_id = ?').run(req.params.id);
  db.prepare('DELETE FROM posts WHERE id = ?').run(req.params.id);
  logOperation(req.user.id, req.user.username, '删除帖子', 'post', req.params.id, `删除帖子: ${post.title}`, req.ip);
  res.json({ code: 200, message: '删除成功' });
});

router.post('/batch-delete', permissionMiddleware('admin', 'moderator'), (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ code: 400, message: '请选择要删除的帖子' });
  }
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`DELETE FROM comments WHERE post_id IN (${placeholders})`).run(...ids);
  db.prepare(`DELETE FROM posts WHERE id IN (${placeholders})`).run(...ids);
  logOperation(req.user.id, req.user.username, '批量删除帖子', 'post', ids.join(','), `批量删除 ${ids.length} 篇帖子`, req.ip);
  res.json({ code: 200, message: '批量删除成功' });
});

module.exports = router;
