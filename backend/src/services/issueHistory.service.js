const db = require('../config/db');

async function list(issueId) {
  const { rows } = await db.query(
    `SELECT h.id, h.issue_id, h.action, h.old_value, h.new_value, h.created_at,
            u.name AS actor_name
     FROM issue_history h
     LEFT JOIN users u ON u.id = h.performed_by
     WHERE h.issue_id = $1
     ORDER BY h.created_at DESC
     LIMIT 50`,
    [issueId]
  );
  return rows;
}

/**
 * Records one history event. Single narrow function, same reasoning as
 * taskActivity.service.js's log() — one place for Checkpoint 6 to hang a
 * Socket.IO emit off of later without touching every call site.
 */
async function log(issueId, userId, action, oldValue = null, newValue = null) {
  await db.query(
    'INSERT INTO issue_history (issue_id, performed_by, action, old_value, new_value) VALUES ($1, $2, $3, $4, $5)',
    [issueId, userId, action, oldValue, newValue]
  );
}

module.exports = { list, log };
