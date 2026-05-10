const express = require('express');
const cors = require('cors');
const config = require('./config');

require('./db/init');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const commentRoutes = require('./routes/comments');
const categoryRoutes = require('./routes/categories');
const roleRoutes = require('./routes/roles');
const statsRoutes = require('./routes/stats');
const logRoutes = require('./routes/logs');
const settingRoutes = require('./routes/settings');
const reportRoutes = require('./routes/reports');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/reports', reportRoutes);

app.get('/api/health', (req, res) => {
  res.json({ code: 200, message: 'Server is running' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ code: 500, message: '服务器错误' });
});

app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
});

module.exports = app;
