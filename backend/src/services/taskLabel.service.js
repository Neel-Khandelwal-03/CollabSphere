const db = require('../config/db');

async function listForWorkspace(workspaceId) {
  const { rows } = await db.query(
    'SELECT id, workspace_id, name, color, created_at FROM task_labels WHERE workspace_id = $1 ORDER BY name ASC',
    [workspaceId]
  );
  return rows;
}

async function findById(labelId) {
  const { rows } = await db.query('SELECT * FROM task_labels WHERE id = $1', [labelId]);
  return rows[0] || null;
}

async function create(workspaceId, name, color) {
  const { rows } = await db.query(
    `INSERT INTO task_labels (workspace_id, name, color) VALUES ($1, $2, COALESCE($3, '#6E56CF'))
     RETURNING id, workspace_id, name, color, created_at`,
    [workspaceId, name, color]
  );
  return rows[0];
}

async function findByWorkspaceAndName(workspaceId, name) {
  const { rows } = await db.query(
    'SELECT * FROM task_labels WHERE workspace_id = $1 AND name = $2',
    [workspaceId, name]
  );
  return rows[0] || null;
}

async function attachToTask(taskId, labelId) {
  await db.query(
    'INSERT INTO task_label_map (task_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [taskId, labelId]
  );
}

async function detachFromTask(taskId, labelId) {
  await db.query('DELETE FROM task_label_map WHERE task_id = $1 AND label_id = $2', [taskId, labelId]);
}

async function attachToIssue(issueId, labelId) {
  await db.query(
    'INSERT INTO issue_label_map (issue_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [issueId, labelId]
  );
}

async function detachFromIssue(issueId, labelId) {
  await db.query('DELETE FROM issue_label_map WHERE issue_id = $1 AND label_id = $2', [issueId, labelId]);
}

module.exports = {
  listForWorkspace,
  findById,
  create,
  findByWorkspaceAndName,
  attachToTask,
  detachFromTask,
  attachToIssue,
  detachFromIssue,
};
