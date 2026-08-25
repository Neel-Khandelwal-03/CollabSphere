const db = require('../config/db');

async function listMembers(projectId) {
  const { rows } = await db.query(
    `SELECT pm.id, pm.project_id, pm.user_id, pm.created_at,
            u.name, u.email, u.avatar_url, u.designation
     FROM project_members pm
     JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = $1
     ORDER BY pm.created_at ASC`,
    [projectId]
  );
  return rows;
}

async function findMemberById(projectId, memberId) {
  const { rows } = await db.query(
    `SELECT id, project_id, user_id, created_at FROM project_members
     WHERE project_id = $1 AND id = $2`,
    [projectId, memberId]
  );
  return rows[0] || null;
}

async function isAlreadyMember(projectId, userId) {
  const { rows } = await db.query(
    'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  );
  return !!rows[0];
}

async function addMember(projectId, userId, addedBy) {
  const { rows } = await db.query(
    `INSERT INTO project_members (project_id, user_id, added_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (project_id, user_id) DO NOTHING
     RETURNING id, project_id, user_id, created_at`,
    [projectId, userId, addedBy]
  );
  return rows[0] || null;
}

async function removeMember(memberId) {
  await db.query('DELETE FROM project_members WHERE id = $1', [memberId]);
}

module.exports = { listMembers, findMemberById, isAlreadyMember, addMember, removeMember };
