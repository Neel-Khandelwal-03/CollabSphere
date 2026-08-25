const db = require('../config/db');

/**
 * Creates a workspace and makes the creator its owner, atomically.
 */
async function create({ name, description, logoUrl, ownerId }) {
  return db.withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO workspaces (name, description, logo_url, owner_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, description, logo_url, owner_id, created_at, updated_at`,
      [name, description || null, logoUrl || null, ownerId]
    );
    const workspace = rows[0];

    await client.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role)
       VALUES ($1, $2, 'owner')`,
      [workspace.id, ownerId]
    );

    return workspace;
  });
}

/**
 * Lists every workspace the given user is a member of, with their role,
 * member count, and project count (counts non-archived projects — an
 * archived project still exists, but "how many projects is this
 * workspace running" reads more usefully as the active count).
 */
async function listForUser(userId) {
  const { rows } = await db.query(
    `SELECT
       w.id, w.name, w.description, w.logo_url, w.owner_id, w.created_at, w.updated_at,
       wm.role AS my_role,
       (SELECT COUNT(*) FROM workspace_members m WHERE m.workspace_id = w.id)::int AS member_count,
       (SELECT COUNT(*) FROM projects pr WHERE pr.workspace_id = w.id AND pr.archived = false)::int AS project_count
     FROM workspaces w
     JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = $1
     ORDER BY w.created_at DESC`,
    [userId]
  );
  return rows;
}

async function findById(workspaceId) {
  const { rows } = await db.query(
    `SELECT
       w.id, w.name, w.description, w.logo_url, w.owner_id, w.created_at, w.updated_at,
       (SELECT COUNT(*) FROM workspace_members m WHERE m.workspace_id = w.id)::int AS member_count,
       (SELECT COUNT(*) FROM projects pr WHERE pr.workspace_id = w.id AND pr.archived = false)::int AS project_count
     FROM workspaces w
     WHERE w.id = $1`,
    [workspaceId]
  );
  return rows[0] || null;
}

async function update(workspaceId, fields) {
  const allowed = ['name', 'description', 'logo_url'];
  const sets = [];
  const values = [];
  let i = 1;
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key} = $${i}`);
      values.push(fields[key]);
      i += 1;
    }
  }
  if (sets.length === 0) return findById(workspaceId);

  values.push(workspaceId);
  const { rows } = await db.query(
    `UPDATE workspaces SET ${sets.join(', ')} WHERE id = $${i}
     RETURNING id, name, description, logo_url, owner_id, created_at, updated_at`,
    values
  );
  return rows[0] || null;
}

async function remove(workspaceId) {
  await db.query('DELETE FROM workspaces WHERE id = $1', [workspaceId]);
}

module.exports = { create, listForUser, findById, update, remove };
