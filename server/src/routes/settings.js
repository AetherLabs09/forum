const express = require('express');
const db = require('../db/init');
const { authMiddleware, permissionMiddleware } = require('../middleware/auth');
const { logOperation } = require('../middleware/logger');

const router = express.Router();

router.use(authMiddleware);

router.get('/', (req, res) => {
  const settings = db.prepare('SELECT * FROM system_settings').all();
  const result = {};
  settings.forEach(s => {
    result[s.key] = s.value;
  });
  res.json({ code: 200, data: result });
});

router.put('/', permissionMiddleware('admin'), (req, res) => {
  const settings = req.body;
  const update = db.prepare('UPDATE system_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?');
  Object.entries(settings).forEach(([key, value]) => {
    update.run(value, key);
  });
  logOperation(req.user.id, req.user.username, '修改系统设置', 'settings', null, '修改系统配置', req.ip);
  res.json({ code: 200, message: '设置保存成功' });
});

module.exports = router;
