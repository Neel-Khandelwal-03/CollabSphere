const db = require('../config/db');

const SELECT_FIELDS = `
  m.id, m.conversation_id, m.sender_id, m.content, m.edited_at, m.created_at, m.file_id, m.mentions,
  u.name AS sender_name, u.avatar_url AS sender_avatar,
  f.original_name AS file_name, f.secure_url AS file_url, f.mime_type AS file_type,
  f.file_size AS file_size, f.resource_type AS file_resource_type
`;
const JOINS = `LEFT JOIN users u ON u.id = m.sender_id LEFT JOIN files f ON f.id = m.file_id`;

/**
 * Newest-first page of a conversation's messages, optionally paging
 * backward in time from a given message (infinite-scroll-up convention).
 * Returned already reversed to oldest-first, since that's how a chat
 * thread renders.
 */
async function list(conversationId, { before, limit = 50 } = {}) {
  const params = [conversationId];
  let beforeClause = '';
  if (before) {
    params.push(before);
    beforeClause = `AND m.created_at < (SELECT created_at FROM messages WHERE id = $${params.length})`;
  }
  params.push(limit);

  const { rows } = await db.query(
    `SELECT ${SELECT_FIELDS} FROM messages m ${JOINS}
     WHERE m.conversation_id = $1 ${beforeClause}
     ORDER BY m.created_at DESC
     LIMIT $${params.length}`,
    params
  );
  return rows.reverse();
}

async function findById(messageId) {
  const { rows } = await db.query(
    `SELECT ${SELECT_FIELDS} FROM messages m ${JOINS} WHERE m.id = $1`,
    [messageId]
  );
  return rows[0] || null;
}

async function create(conversationId, senderId, content, fileId = null, mentions = []) {
  const { rows } = await db.query(
    'INSERT INTO messages (conversation_id, sender_id, content, file_id, mentions) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [conversationId, senderId, content, fileId, JSON.stringify(mentions)]
  );
  return findById(rows[0].id);
}

async function update(messageId, content) {
  const { rows } = await db.query(
    `UPDATE messages SET content = $1, edited_at = now() WHERE id = $2
     RETURNING id, conversation_id, sender_id, content, edited_at, created_at`,
    [content, messageId]
  );
  return rows[0] || null;
}

async function remove(messageId) {
  await db.query('DELETE FROM messages WHERE id = $1', [messageId]);
}

/**
 * Marks everything up to (and including) the given message as read for
 * this user in this conversation — the "last read pointer" read-receipt
 * model. `last_read_at` is resolved server-side from the message's own
 * stored `created_at` via a subquery, rather than accepting a timestamp
 * from the caller: Postgres timestamps carry microsecond precision, but
 * the `pg` driver maps them to JS `Date`, which only has millisecond
 * precision. Round-tripping a message's `created_at` out to JS and back
 * in as `last_read_at` silently truncated it, making the subsequent
 * `created_at > last_read_at` unread check always true — a message could
 * never actually be marked read. Caught by testing the full mark-read
 * round trip, not by reasoning about the SQL in isolation.
 */
async function markRead(conversationId, userId, messageId) {
  await db.query(
    `INSERT INTO conversation_reads (conversation_id, user_id, last_read_message_id, last_read_at)
     SELECT $1, $2, $3, m.created_at FROM messages m WHERE m.id = $3
     ON CONFLICT (conversation_id, user_id)
     DO UPDATE SET last_read_message_id = EXCLUDED.last_read_message_id, last_read_at = EXCLUDED.last_read_at
     WHERE EXCLUDED.last_read_at > conversation_reads.last_read_at`,
    [conversationId, userId, messageId]
  );
}

async function getReadState(conversationId, userId) {
  const { rows } = await db.query(
    'SELECT last_read_message_id, last_read_at FROM conversation_reads WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, userId]
  );
  return rows[0] || null;
}

/** Unread message count for a user across every conversation they can see, keyed by conversation_id. */
async function unreadCountsForUser(userId, conversationIds) {
  if (conversationIds.length === 0) return {};
  const { rows } = await db.query(
    `SELECT m.conversation_id, COUNT(*)::int AS unread
     FROM messages m
     LEFT JOIN conversation_reads cr ON cr.conversation_id = m.conversation_id AND cr.user_id = $1
     WHERE m.conversation_id = ANY($2::uuid[])
       AND m.sender_id IS DISTINCT FROM $1
       AND (cr.last_read_at IS NULL OR m.created_at > cr.last_read_at)
     GROUP BY m.conversation_id`,
    [userId, conversationIds]
  );
  return Object.fromEntries(rows.map((r) => [r.conversation_id, r.unread]));
}

/** Who has read up to at least the given message — backs the "seen by" UI. */
async function readByForMessage(conversationId, messageId) {
  const { rows } = await db.query(
    `SELECT cr.user_id, u.name
     FROM conversation_reads cr
     JOIN users u ON u.id = cr.user_id
     WHERE cr.conversation_id = $1
       AND cr.last_read_at >= (SELECT created_at FROM messages WHERE id = $2)`,
    [conversationId, messageId]
  );
  return rows;
}

/**
 * Every participant's current read pointer for a conversation. Returned
 * alongside the initial message page (see chat.controller.js) so a
 * client can render "seen by" state immediately on load — without this,
 * a client would only learn about reads that happen to occur *after* it
 * connects, via the live 'read:update' socket event, and would show
 * everything as unseen on every fresh page load regardless of actual
 * history. Caught while designing the frontend's read-receipt UI, before
 * writing a single line of that UI against an endpoint that couldn't
 * actually support it.
 */
async function getReadStatesForConversation(conversationId) {
  const { rows } = await db.query(
    `SELECT cr.user_id, u.name AS user_name, cr.last_read_message_id, cr.last_read_at
     FROM conversation_reads cr
     JOIN users u ON u.id = cr.user_id
     WHERE cr.conversation_id = $1`,
    [conversationId]
  );
  return rows;
}

module.exports = {
  list,
  findById,
  create,
  update,
  remove,
  markRead,
  getReadState,
  unreadCountsForUser,
  readByForMessage,
  getReadStatesForConversation,
};
