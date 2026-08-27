const { Router } = require('express');
const authRoutes = require('./auth.routes');
const workspaceRoutes = require('./workspace.routes');
const projectRoutes = require('./project.routes');
const taskRoutes = require('./task.routes');
const issueRoutes = require('./issue.routes');
const chatRoutes = require('./chat.routes');
const fileRoutes = require('./file.routes');
const notificationRoutes = require('./notification.routes');
const activityRoutes = require('./activity.routes');
const analyticsRoutes = require('./analytics.routes');
const searchRoutes = require('./search.routes');

const router = Router();

router.get('/health', (req, res) => res.json({ success: true, message: 'ok' }));
router.use('/auth', authRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/issues', issueRoutes);
router.use('/chat', chatRoutes);
router.use('/files', fileRoutes);
router.use('/notifications', notificationRoutes);
router.use('/activity', activityRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/search', searchRoutes);

module.exports = router;
