const express = require('express');
const db = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.get('/dashboard', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const todayUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE date(created_at) = ?").get(today)?.count || 0;
  const totalPosts = db.prepare('SELECT COUNT(*) as count FROM posts').get().count;
  const todayPosts = db.prepare("SELECT COUNT(*) as count FROM posts WHERE date(created_at) = ?").get(today)?.count || 0;
  const totalComments = db.prepare('SELECT COUNT(*) as count FROM comments').get().count;
  const todayComments = db.prepare("SELECT COUNT(*) as count FROM comments WHERE date(created_at) = ?").get(today)?.count || 0;
  const hiddenPosts = db.prepare('SELECT COUNT(*) as count FROM posts WHERE is_hidden = 1').get().count;
  const hiddenComments = db.prepare('SELECT COUNT(*) as count FROM comments WHERE is_hidden = 1').get().count;
  const pendingReports = db.prepare("SELECT COUNT(*) as count FROM reports WHERE status = 'pending'").get().count;
  const activeUsers = db.prepare("SELECT COUNT(*) as count FROM operation_logs WHERE date(created_at) = ?").get(today)?.count || 0;
  const categories = db.prepare('SELECT COUNT(*) as count FROM categories').get().count;

  const recentPosts = db.prepare(`
    SELECT p.id, p.title, p.created_at, u.username as author_name
    FROM posts p
    LEFT JOIN users u ON p.author_id = u.id
    ORDER BY p.created_at DESC
    LIMIT 5
  `).all();

  const trendData = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const users = db.prepare("SELECT COUNT(*) as count FROM users WHERE date(created_at) = ?").get(dateStr)?.count || 0;
    const posts = db.prepare("SELECT COUNT(*) as count FROM posts WHERE date(created_at) = ?").get(dateStr)?.count || 0;
    const comments = db.prepare("SELECT COUNT(*) as count FROM comments WHERE date(created_at) = ?").get(dateStr)?.count || 0;
    trendData.push({ date: dateStr, users, posts, comments });
  }

  res.json({
    code: 200,
    data: {
      stats: {
        totalUsers, todayUsers, totalPosts, todayPosts,
        totalComments, todayComments, hiddenPosts, hiddenComments,
        pendingReports, activeUsers, categories,
        violationCount: hiddenPosts + hiddenComments
      },
      recentPosts,
      trendData
    }
  });
});

router.get('/trend', (req, res) => {
  const { days = 7 } = req.query;
  const trendData = [];
  for (let i = parseInt(days) - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const users = db.prepare("SELECT COUNT(*) as count FROM users WHERE date(created_at) = ?").get(dateStr)?.count || 0;
    const posts = db.prepare("SELECT COUNT(*) as count FROM posts WHERE date(created_at) = ?").get(dateStr)?.count || 0;
    const comments = db.prepare("SELECT COUNT(*) as count FROM comments WHERE date(created_at) = ?").get(dateStr)?.count || 0;
    const logins = db.prepare("SELECT COUNT(*) as count FROM operation_logs WHERE date(created_at) = ? AND action = '登录系统'").get(dateStr)?.count || 0;
    trendData.push({ date: dateStr, users, posts, comments, logins });
  }
  res.json({ code: 200, data: trendData });
});

module.exports = router;
