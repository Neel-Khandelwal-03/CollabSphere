const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const notificationController = require('../controllers/notification.controller');
const { notificationIdValidators, listNotificationsQueryValidators } = require('../middleware/notificationValidators');

const router = Router();

router.use(authenticate);

router.get('/', listNotificationsQueryValidators, validate, notificationController.listNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.patch('/read-all', notificationController.markAllAsRead);
router.patch('/:notificationId/read', notificationIdValidators, validate, notificationController.markAsRead);
router.delete('/:notificationId', notificationIdValidators, validate, notificationController.deleteNotification);
router.delete('/', notificationController.deleteAllNotifications);

module.exports = router;
