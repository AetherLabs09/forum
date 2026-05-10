const express = require('express');
const db = require('../db/init');
const { generateId } = require('../utils');
const { authMiddleware, permissionMiddleware } = require('../middleware/auth');
const { logOperation } = require('../middleware/logger');

const router = express.Router();

router.use(authMiddleware);

router.get('/list', (req, res) => {
  const { targetType, status, page = 1, pageSize = 10 } = req.query;
  let sql = `SELECT r.*, u.username as reporter_name,
             CASE r.target_type
               WHEN 'post' THEN (SELECT title FROM posts WHERE id = r.target_id)
               WHEN 'comment' THEN (SELECT content FROM comments WHERE id = r.target_id)
               ELSE ''
             END as target_title
             FROM reports r
             LEFT JOIN users u ON r.reporter_id = u.id
             WHERE 1=1`;
  const params = [];
  if (targetType) {
    sql += ' AND r.target_type = ?';
    params.push(targetType);
  }
  if (status) {
    sql += ' AND r.status = ?';
    params.push(status);
  }
  const countSql = sql.replace(/SELECT r\.\*.*?FROM reports r/, 'SELECT COUNT(*) as total FROM reports r');
  const total = db.prepare(countSql).get(...params)?.total || 0;
  sql += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  params.push(parseInt(pageSize), offset);
  const list = db.prepare(sql).all(...params);
  res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});

router.put('/:id/handle', permissionMiddleware('admin', 'moderator'), (req, res) => {
  const { result, action } = req.body;
  const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id);
  if (!report) {
    return res.status(404).json({ code: 404, message: '举报不存在' });
  }
  db.prepare("UPDATE reports SET status = 'handled', handler_id = ?, handle_result = ?, handled_at = CURRENT_TIMESTAMP WHERE id = ?")
    .run(req.user.id, result, req.params.id);
  if (action === 'hide_post' && report.target_type === 'post') {
    db.prepare('UPDATE posts SET is_hidden = 1 WHERE id = ?').run(report.target_id);
  } else if (action === 'hide_comment' && report.target_type === 'comment') {
    db.prepare('UPDATE comments SET is_hidden = 1 WHERE id = ?').run(report.target_id);
  }
  logOperation(req.user.id, req.user.username, '处理举报', 'report', req.params.id, `处理举报: ${result}`, req.ip);
  res.json({ code: 200, message: '处理成功' });
});

module.exports = router;
