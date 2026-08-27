const db = require('../config/db');
const activityEvents = require('../utils/activityEvents');

const SELECT_FIELDS = `
  a.id, a.workspace_id, a.project_id, a.actor_id, a.action, a.entity_type, a.entity_id,
  a.old_value, a.new_value, a.metadata, a.created_at,
  actor.name AS actor_name, actor.avatar_url AS actor_avatar,
  p.name AS project_name
`;
const JOINS = `LEFT JOIN users actor ON actor.id = a.actor_id LEFT JOIN projects p ON p.id = a.project_id`;

/**
 * Records one activity entry. `action` is a dot-namespaced string
 * ('task.created', 'workspace.member_added', ...) rather than an ENUM,
 * for the same extensibility reasons notifications.type isn't one
 * either. Called additively alongside the existing taskActivity/
 * issueHistory log() calls at the same mutation points — not a
 * replacement for either.
 */
async function logActivity({ workspaceId, projectId, actorId, action, entityType, entityId, oldValue, newValue, metadata }) {
  await db.query(
    `INSERT INTO activity_logs (workspace_id, project_id, actor_id, action, entity_type, entity_id, old_value, new_value, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      workspaceId,
      projectId || null,
      actorId || null,
      action,
      entityType || null,
      entityId || null,
      oldValue !== undefined ? JSON.stringify(oldValue) : null,
      newValue !== undefined ? JSON.stringify(newValue) : null,
      metadata ? JSON.stringify(metadata) : null,
    ]
  );
}

function buildFilters(f, startIndex) {
  const clauses = [];
  const params = [];
  let i = startIndex;

  if (f.actorId) {
    clauses.push(`a.actor_id = $${i}`);
    params.push(f.actorId);
    i += 1;
  }
  if (f.entityType) {
    clauses.push(`a.entity_type = $${i}`);
    params.push(f.entityType);
    i += 1;
  }
  if (f.category) {
    const CATEGORY_ENTITY_TYPES = {
      tasks: ['task'],
      issues: ['issue'],
      projects: ['project'],
      members: ['workspace_member', 'project_member'],
      files: ['file'],
    };
    if (f.category === 'system') {
      clauses.push('a.entity_type IS NULL');
    } else if (CATEGORY_ENTITY_TYPES[f.category]) {
      clauses.push(`a.entity_type = ANY($${i})`);
      params.push(CATEGORY_ENTITY_TYPES[f.category]);
      i += 1;
    }
  }
  if (f.createdAfter) {
    clauses.push(`a.created_at >= $${i}`);
    params.push(f.createdAfter);
    i += 1;
  }
  if (f.createdBefore) {
    clauses.push(`a.created_at <= $${i}`);
    params.push(f.createdBefore);
    i += 1;
  }
  if (f.cursor) {
    clauses.push(`a.created_at < (SELECT created_at FROM activity_logs WHERE id = $${i})`);
    params.push(f.cursor);
    i += 1;
  }

  return { whereFragment: clauses.length ? `AND ${clauses.join(' AND ')}` : '', params, nextIndex: i };
}

async function getWorkspaceActivity(workspaceId, filters = {}) {
  const { whereFragment, params, nextIndex } = buildFilters(filters, 2);
  const { rows } = await db.query(
    `SELECT ${SELECT_FIELDS} FROM activity_logs a ${JOINS}
     WHERE a.workspace_id = $1 ${whereFragment}
     ORDER BY a.created_at DESC
     LIMIT $${nextIndex}`,
    [workspaceId, ...params, Math.min(filters.limit || 30, 100)]
  );
  return rows;
}

async function getProjectActivity(projectId, filters = {}) {
  const { whereFragment, params, nextIndex } = buildFilters(filters, 2);
  const { rows } = await db.query(
    `SELECT ${SELECT_FIELDS} FROM activity_logs a ${JOINS}
     WHERE a.project_id = $1 ${whereFragment}
     ORDER BY a.created_at DESC
     LIMIT $${nextIndex}`,
    [projectId, ...params, Math.min(filters.limit || 30, 100)]
  );
  return rows;
}

async function getEntityActivity(entityType, entityId, limit = 30) {
  const { rows } = await db.query(
    `SELECT ${SELECT_FIELDS} FROM activity_logs a ${JOINS}
     WHERE a.entity_type = $1 AND a.entity_id = $2
     ORDER BY a.created_at DESC
     LIMIT $3`,
    [entityType, entityId, Math.min(limit, 100)]
  );
  return rows;
}

/**
 * logActivity() + broadcast in one call, mirroring notification.service.js's
 * notify(). Broadcasts to the workspace room uniformly (not a separate
 * "project room" concept, which doesn't otherwise exist) — every project
 * belongs to exactly one workspace, and anyone authorized to see a
 * project's activity is necessarily already a member of that workspace
 * room; the frontend filters to the currently-open project locally.
 */
async function log(payload) {
  await logActivity(payload);
  activityEvents.emit('created', payload);
}

module.exports = { logActivity, getWorkspaceActivity, getProjectActivity, getEntityActivity, log };
