const { generateId } = require('../utils');
const db = require('../db/init');

function logOperation(userId, username, action, targetType, targetId, details, ipAddress) {
  db.prepare(`
    INSERT INTO operation_logs (id, user_id, username, action, target_type, target_id, details, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(generateId(), userId, username, action, targetType, targetId, details, ipAddress);
}

module.exports = { logOperation };
