const express = require('express');
const db = require('../db/init');
const { generateId } = require('../utils');
const { authMiddleware, permissionMiddleware } = require('../middleware/auth');
const { logOperation } = require('../middleware/logger');

const router = express.Router();

router.use(authMiddleware);

router.get('/list', (req, res) => {
  const { keyword, postId, status, page = 1, pageSize = 10 } = req.query;
  let sql = `SELECT c.*, u.username as author_name, u.nickname as author_nickname, p.title as post_title
             FROM comments c
             LEFT JOIN users u ON c.author_id = u.id
             LEFT JOIN posts p ON c.post_id = p.id
             WHERE 1=1`;
  const params = [];
  if (keyword) {
    sql += ' AND c.content LIKE ?';
    params.push(`%${keyword}%`);
  }
  if (postId) {
    sql += ' AND c.post_id = ?';
    params.push(postId);
  }
  if (status === 'hidden') {
    sql += ' AND c.is_hidden = 1';
  } else if (status) {
    sql += ' AND c.status = ? AND c.is_hidden = 0';
    params.push(status);
  }
  const countSql = sql.replace(/SELECT c\.\*, u\.username.*?FROM comments c/, 'SELECT COUNT(*) as total FROM comments c');
  const total = db.prepare(countSql).get(...params)?.total || 0;
  sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  params.push(parseInt(pageSize), offset);
  const list = db.prepare(sql).all(...params);
  res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});

router.get('/:id', (req, res) => {
  const comment = db.prepare(`
    SELECT c.*, u.username as author_name, u.nickname as author_nickname, p.title as post_title
    FROM comments c
    LEFT JOIN users u ON c.author_id = u.id
    LEFT JOIN posts p ON c.post_id = p.id
    WHERE c.id = ?
  `).get(req.params.id);
  if (!comment) {
    return res.status(404).json({ code: 404, message: '评论不存在' });
  }
  res.json({ code: 200, data: comment });
});

router.put('/:id/hide', permissionMiddleware('admin', 'moderator'), (req, res) => {
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!comment) {
    return res.status(404).json({ code: 404, message: '评论不存在' });
  }
  const newHidden = comment.is_hidden ? 0 : 1;
  db.prepare('UPDATE comments SET is_hidden = ? WHERE id = ?').run(newHidden, req.params.id);
  logOperation(req.user.id, req.user.username, newHidden ? '隐藏评论' : '显示评论', 'comment', req.params.id, comment.content.substring(0, 50), req.ip);
  res.json({ code: 200, message: newHidden ? '已隐藏' : '已显示' });
});

router.delete('/:id', permissionMiddleware('admin', 'moderator'), (req, res) => {
  const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(req.params.id);
  if (!comment) {
    return res.status(404).json({ code: 404, message: '评论不存在' });
  }
  db.prepare('DELETE FROM comments WHERE id = ?').run(req.params.id);
  logOperation(req.user.id, req.user.username, '删除评论', 'comment', req.params.id, comment.content.substring(0, 50), req.ip);
  res.json({ code: 200, message: '删除成功' });
});

router.post('/batch-delete', permissionMiddleware('admin', 'moderator'), (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ code: 400, message: '请选择要删除的评论' });
  }
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`DELETE FROM comments WHERE id IN (${placeholders})`).run(...ids);
  logOperation(req.user.id, req.user.username, '批量删除评论', 'comment', ids.join(','), `批量删除 ${ids.length} 条评论`, req.ip);
  res.json({ code: 200, message: '批量删除成功' });
});

module.exports = router;
