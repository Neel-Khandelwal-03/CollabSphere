const db = require('../config/db');

async function listMembers(workspaceId) {
  const { rows } = await db.query(
    `SELECT
       wm.id, wm.workspace_id, wm.role, wm.joined_at,
       u.id AS user_id, u.name, u.email, u.avatar_url, u.designation
     FROM workspace_members wm
     JOIN users u ON u.id = wm.user_id
     WHERE wm.workspace_id = $1
     ORDER BY
       CASE wm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'member' THEN 2 ELSE 3 END,
       wm.joined_at ASC`,
    [workspaceId]
  );
  return rows;
}

async function findMemberById(workspaceId, memberId) {
  const { rows } = await db.query(
    `SELECT wm.id, wm.workspace_id, wm.user_id, wm.role, wm.joined_at, u.email, u.name
     FROM workspace_members wm
     JOIN users u ON u.id = wm.user_id
     WHERE wm.workspace_id = $1 AND wm.id = $2`,
    [workspaceId, memberId]
  );
  return rows[0] || null;
}

async function findMemberByUserId(workspaceId, userId) {
  const { rows } = await db.query(
    `SELECT id, workspace_id, user_id, role, joined_at
     FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
    [workspaceId, userId]
  );
  return rows[0] || null;
}

async function addMember(workspaceId, userId, role = 'member') {
  const { rows } = await db.query(
    `INSERT INTO workspace_members (workspace_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (workspace_id, user_id) DO NOTHING
     RETURNING id, workspace_id, user_id, role, joined_at`,
    [workspaceId, userId, role]
  );
  return rows[0] || findMemberByUserId(workspaceId, userId);
}

async function updateRole(memberId, role) {
  const { rows } = await db.query(
    `UPDATE workspace_members SET role = $1 WHERE id = $2
     RETURNING id, workspace_id, user_id, role, joined_at`,
    [role, memberId]
  );
  return rows[0] || null;
}

async function removeMember(memberId) {
  await db.query('DELETE FROM workspace_members WHERE id = $1', [memberId]);
}

async function countOwners(workspaceId) {
  const { rows } = await db.query(
    `SELECT COUNT(*)::int AS count FROM workspace_members
     WHERE workspace_id = $1 AND role = 'owner'`,
    [workspaceId]
  );
  return rows[0].count;
}

module.exports = {
  listMembers,
  findMemberById,
  findMemberByUserId,
  addMember,
  updateRole,
  removeMember,
  countOwners,
};
