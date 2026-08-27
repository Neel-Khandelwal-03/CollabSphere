const { param, query } = require('express-validator');

const notificationIdValidators = [param('notificationId').isUUID().withMessage('Invalid notification id')];

const listNotificationsQueryValidators = [
  query('unreadOnly').optional().isIn(['true', 'false']),
  query('entityType').optional().trim(),
  query('cursor').optional().isUUID(),
  query('limit').optional().isInt({ min: 1, max: 50 }),
];

module.exports = { notificationIdValidators, listNotificationsQueryValidators };
