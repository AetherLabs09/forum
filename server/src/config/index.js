module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: 'forum-admin-secret-key-2024',
  jwtExpire: '24h',
  dbPath: './data/forum.db'
}
