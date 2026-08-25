const db = require('../config/db');

async function list(taskId) {
  const { rows } = await db.query(
    `SELECT ta.id, ta.task_id, ta.user_id, ta.action, ta.details, ta.created_at,
            u.name AS actor_name
     FROM task_activity ta
     LEFT JOIN users u ON u.id = ta.user_id
     WHERE ta.task_id = $1
     ORDER BY ta.created_at DESC
     LIMIT 50`,
    [taskId]
  );
  return rows;
}

/**
 * Records one activity event. Deliberately a single narrow function
 * (rather than one-off inserts scattered through the controller) so that
 * wiring in a Socket.IO emit in Checkpoint 6 — "task-updated" etc. — means
 * touching this one place instead of hunting through every mutation.
 */
async function log(taskId, userId, action, details = null) {
  await db.query(
    'INSERT INTO task_activity (task_id, user_id, action, details) VALUES ($1, $2, $3, $4)',
    [taskId, userId, action, details ? JSON.stringify(details) : null]
  );
}

module.exports = { list, log };
