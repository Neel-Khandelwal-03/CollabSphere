const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const analyticsController = require('../controllers/analytics.controller');

const router = Router();

router.use(authenticate);

router.get('/dashboard', analyticsController.getDashboard);

module.exports = router;
