const db = require('../config/db');
const notificationEvents = require('../utils/notificationEvents');

const SELECT_FIELDS = `
  n.id, n.user_id, n.type, n.title, n.message, n.entity_type, n.entity_id,
  n.actor_id, n.metadata, n.is_read, n.created_at, n.read_at,
  actor.name AS actor_name, actor.avatar_url AS actor_avatar
`;
const JOINS = `LEFT JOIN users actor ON actor.id = n.actor_id`;

/**
 * Creates one notification. Silently no-ops (returns null, doesn't
 * throw) when userId === actorId — the spec's explicit rule that
 * self-triggered events ("you assigned a task to yourself") shouldn't
 * notify the person who did it. Centralizing this check here means
 * every call site (task/issue/project/workspace/chat controllers) gets
 * it for free instead of each one needing to remember to check.
 */
async function createNotification({ userId, type, title, message, entityType, entityId, actorId, metadata }) {
  if (actorId && userId === actorId) return null;

  const { rows } = await db.query(
    `INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, actor_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [userId, type, title, message || null, entityType || null, entityId || null, actorId || null, metadata ? JSON.stringify(metadata) : null]
  );
  return findById(rows[0].id);
}

/**
 * Same self-notification skip, applied to a batch — e.g. notifying every
 * mentioned user in a comment except the comment's own author, or every
 * project member except whoever removed one of their peers.
 */
async function createBulkNotifications(userIds, payload) {
  const uniqueIds = [...new Set(userIds)].filter((id) => id !== payload.actorId);
  const created = [];
  for (const userId of uniqueIds) {
    // eslint-disable-next-line no-await-in-loop
    const n = await createNotification({ ...payload, userId });
    if (n) created.push(n);
  }
  return created;
}

async function findById(notificationId) {
  const { rows } = await db.query(`SELECT ${SELECT_FIELDS} FROM notifications n ${JOINS} WHERE n.id = $1`, [
    notificationId,
  ]);
  return rows[0] || null;
}

async function getUserNotifications(userId, { unreadOnly, entityType, cursor, limit = 20 } = {}) {
  const clauses = ['n.user_id = $1'];
  const params = [userId];
  let i = 2;

  if (unreadOnly) clauses.push('n.is_read = false');
  if (entityType) {
    clauses.push(`n.entity_type = $${i}`);
    params.push(entityType);
    i += 1;
  }
  if (cursor) {
    clauses.push(`n.created_at < (SELECT created_at FROM notifications WHERE id = $${i})`);
    params.push(cursor);
    i += 1;
  }

  params.push(Math.min(limit, 50));

  const { rows } = await db.query(
    `SELECT ${SELECT_FIELDS} FROM notifications n ${JOINS}
     WHERE ${clauses.join(' AND ')}
     ORDER BY n.created_at DESC
     LIMIT $${i}`,
    params
  );
  return rows;
}

async function getUnreadCount(userId) {
  const { rows } = await db.query('SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false', [
    userId,
  ]);
  return rows[0].count;
}

async function markAsRead(notificationId, userId) {
  const { rows } = await db.query(
    `UPDATE notifications SET is_read = true, read_at = now()
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [notificationId, userId]
  );
  if (!rows[0]) return null;
  return findById(notificationId);
}

async function markAllAsRead(userId) {
  const { rowCount } = await db.query(
    `UPDATE notifications SET is_read = true, read_at = now() WHERE user_id = $1 AND is_read = false`,
    [userId]
  );
  return rowCount;
}

async function deleteNotification(notificationId, userId) {
  const { rowCount } = await db.query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [
    notificationId,
    userId,
  ]);
  return rowCount > 0;
}

async function deleteAllForUser(userId) {
  const { rowCount } = await db.query('DELETE FROM notifications WHERE user_id = $1', [userId]);
  return rowCount;
}

/**
 * create + broadcast in one call — the pairing every trigger site
 * (task/issue/project/workspace/file/chat controllers) needs
 * identically, so none of them have to remember both steps themselves.
 */
async function notify(payload) {
  const notification = await createNotification(payload);
  if (notification) notificationEvents.emit('created', notification);
  return notification;
}

async function notifyMany(userIds, payload) {
  const created = await createBulkNotifications(userIds, payload);
  created.forEach((n) => notificationEvents.emit('created', n));
  return created;
}

/**
 * Notifies every mentioned user, shared identically by task comments,
 * issue comments, and chat messages — the "create a notification, skip
 * the author, dedupe repeats" logic is the same in all three; only the
 * type/title/entity differ per call site.
 */
async function notifyMentions(mentionedUserIds, payload) {
  return notifyMany(mentionedUserIds, payload);
}

module.exports = {
  createNotification,
  createBulkNotifications,
  findById,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllForUser,
  notify,
  notifyMany,
  notifyMentions,
};
