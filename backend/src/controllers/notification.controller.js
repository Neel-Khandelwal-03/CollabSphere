const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const notificationService = require('../services/notification.service');

// GET /api/notifications — cursor-based pagination via ?cursor=<notificationId>,
// matching the same cursor style message.service.js's list() already uses.
const listNotifications = asyncHandler(async (req, res) => {
  const { unreadOnly, entityType, cursor, limit } = req.query;
  const notifications = await notificationService.getUserNotifications(req.user.id, {
    unreadOnly: unreadOnly === 'true',
    entityType,
    cursor,
    limit: limit ? parseInt(limit, 10) : undefined,
  });
  res.json({ success: true, data: { notifications } });
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user.id);
  res.json({ success: true, data: { count } });
});

// PATCH /api/notifications/:id/read — markAsRead's WHERE clause already
// requires user_id = req.user.id, so this can never touch another
// user's row; a mismatched id just means "no rows updated," not a
// privilege escalation, but it's still surfaced as 404 rather than a
// silent 200 to avoid implying success that didn't happen.
const markAsRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.params.notificationId, req.user.id);
  if (!notification) throw ApiError.notFound('Notification not found');
  res.json({ success: true, data: { notification } });
});

const markAllAsRead = asyncHandler(async (req, res) => {
  const count = await notificationService.markAllAsRead(req.user.id);
  res.json({ success: true, message: `${count} notification(s) marked as read` });
});

const deleteNotification = asyncHandler(async (req, res) => {
  const deleted = await notificationService.deleteNotification(req.params.notificationId, req.user.id);
  if (!deleted) throw ApiError.notFound('Notification not found');
  res.json({ success: true, message: 'Notification deleted' });
});

const deleteAllNotifications = asyncHandler(async (req, res) => {
  const count = await notificationService.deleteAllForUser(req.user.id);
  res.json({ success: true, message: `${count} notification(s) deleted` });
});

module.exports = {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
};
