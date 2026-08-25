const { Router } = require('express');
const authRoutes = require('./auth.routes');
const workspaceRoutes = require('./workspace.routes');
const projectRoutes = require('./project.routes');
const taskRoutes = require('./task.routes');
const issueRoutes = require('./issue.routes');
const chatRoutes = require('./chat.routes');

const router = Router();

router.get('/health', (req, res) => res.json({ success: true, message: 'ok' }));
router.use('/auth', authRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/issues', issueRoutes);
router.use('/chat', chatRoutes);

// Future modules mount here:
// router.use('/files', fileRoutes);
// router.use('/notifications', notificationRoutes);

module.exports = router;
