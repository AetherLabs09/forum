const express = require('express');
const db = require('../db/init');
const { authMiddleware, permissionMiddleware } = require('../middleware/auth');
const { logOperation } = require('../middleware/logger');

const router = express.Router();

router.use(authMiddleware);

router.get('/list', permissionMiddleware('admin'), (req, res) => {
  const logs = db.prepare(`
    SELECT ol.*, u.username, u.nickname
    FROM operation_logs ol
    LEFT JOIN users u ON ol.user_id = u.id
    ORDER BY ol.created_at DESC
    LIMIT 100
  `).all();
  res.json({ code: 200, data: logs });
});

router.get('/', permissionMiddleware('admin'), (req, res) => {
  const { keyword, action, startDate, endDate, page = 1, pageSize = 20 } = req.query;
  let sql = `SELECT ol.*, u.username, u.nickname
             FROM operation_logs ol
             LEFT JOIN users u ON ol.user_id = u.id
             WHERE 1=1`;
  const params = [];
  if (keyword) {
    sql += ' AND (u.username LIKE ? OR ol.details LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (action) {
    sql += ' AND ol.action = ?';
    params.push(action);
  }
  if (startDate) {
    sql += ' AND date(ol.created_at) >= ?';
    params.push(startDate);
  }
  if (endDate) {
    sql += ' AND date(ol.created_at) <= ?';
    params.push(endDate);
  }
  const countSql = sql.replace(/SELECT ol\.\*.*?FROM operation_logs ol/, 'SELECT COUNT(*) as total FROM operation_logs ol');
  const total = db.prepare(countSql).get(...params)?.total || 0;
  sql += ' ORDER BY ol.created_at DESC LIMIT ? OFFSET ?';
  const offset = (parseInt(page) - 1) * parseInt(pageSize);
  params.push(parseInt(pageSize), offset);
  const list = db.prepare(sql).all(...params);
  res.json({ code: 200, data: { list, total, page: parseInt(page), pageSize: parseInt(pageSize) } });
});

router.delete('/clean', permissionMiddleware('admin'), (req, res) => {
  const { days = 30 } = req.body;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
  const cutoffStr = cutoffDate.toISOString().split('T')[0];
  db.prepare(`DELETE FROM operation_logs WHERE date(created_at) < ?`).run(cutoffStr);
  logOperation(req.user.id, req.user.username, '清理日志', 'logs', null, `清理 ${days} 天前的日志`, req.ip);
  res.json({ code: 200, message: '清理成功' });
});

module.exports = router;
