const db = require('../config/db');

const SORT_MAP = {
  newest: 'p.created_at DESC',
  oldest: 'p.created_at ASC',
  deadline: 'p.deadline ASC NULLS LAST',
  alphabetical: 'p.name ASC',
};

/**
 * Builds the shared WHERE/ORDER BY fragments for both listForUser
 * (cross-workspace) and listForWorkspace, so search/filter/sort behave
 * identically no matter which list you're looking at.
 *
 * `baseParams` are params already positioned before this fragment starts
 * (e.g. $1 = user id or workspace id); returned placeholders continue
 * from there.
 */
function buildFilters({ search, status, priority, archived = 'false', sort = 'newest' }, startIndex) {
  const clauses = [];
  const params = [];
  let i = startIndex;

  if (archived === 'true') {
    clauses.push('p.archived = true');
  } else if (archived !== 'all') {
    clauses.push('p.archived = false');
  }

  if (status) {
    clauses.push(`p.status = $${i}`);
    params.push(status);
    i += 1;
  }

  if (priority) {
    clauses.push(`p.priority = $${i}`);
    params.push(priority);
    i += 1;
  }

  if (search) {
    clauses.push(`(p.name ILIKE $${i} OR p.description ILIKE $${i})`);
    params.push(`%${search}%`);
    i += 1;
  }

  const whereFragment = clauses.length ? `AND ${clauses.join(' AND ')}` : '';
  const orderFragment = SORT_MAP[sort] || SORT_MAP.newest;

  return { whereFragment, orderFragment, params };
}

const SELECT_FIELDS = `
  p.id, p.workspace_id, p.name, p.description, p.status, p.priority,
  p.start_date, p.deadline, p.created_by, p.archived, p.created_at, p.updated_at,
  creator.name AS created_by_name,
  w.name AS workspace_name,
  (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id)::int AS member_count,
  COALESCE(preview.members, '[]'::json) AS member_preview
`;

const JOINS = `
  LEFT JOIN users creator ON creator.id = p.created_by
  JOIN workspaces w ON w.id = p.workspace_id
  LEFT JOIN LATERAL (
    SELECT json_agg(json_build_object('id', u.id, 'name', u.name, 'avatar_url', u.avatar_url)) AS members
    FROM (
      SELECT u2.id, u2.name, u2.avatar_url
      FROM project_members pm2
      JOIN users u2 ON u2.id = pm2.user_id
      WHERE pm2.project_id = p.id
      ORDER BY pm2.created_at ASC
      LIMIT 5
    ) u
  ) preview ON true
`;

/**
 * Every project in every workspace the given user belongs to.
 */
async function listForUser(userId, filters) {
  const { whereFragment, orderFragment, params } = buildFilters(filters, 2);
  const { rows } = await db.query(
    `
    SELECT ${SELECT_FIELDS}
    FROM projects p
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = $1
    ${JOINS}
    WHERE 1=1 ${whereFragment}
    ORDER BY ${orderFragment}
    `,
    [userId, ...params]
  );
  return rows;
}

/**
 * Every project within one specific workspace. Caller (route middleware)
 * is responsible for confirming the requester has access to that workspace.
 */
async function listForWorkspace(workspaceId, filters) {
  const { whereFragment, orderFragment, params } = buildFilters(filters, 2);
  const { rows } = await db.query(
    `
    SELECT ${SELECT_FIELDS}
    FROM projects p
    ${JOINS}
    WHERE p.workspace_id = $1 ${whereFragment}
    ORDER BY ${orderFragment}
    `,
    [workspaceId, ...params]
  );
  return rows;
}

async function findById(projectId) {
  const { rows } = await db.query(
    `
    SELECT ${SELECT_FIELDS}
    FROM projects p
    ${JOINS}
    WHERE p.id = $1
    `,
    [projectId]
  );
  return rows[0] || null;
}

async function create({ workspaceId, name, description, status, priority, startDate, deadline, createdBy }) {
  const { rows } = await db.query(
    `INSERT INTO projects (workspace_id, name, description, status, priority, start_date, deadline, created_by)
     VALUES ($1, $2, $3, COALESCE($4::project_status, 'planning'), COALESCE($5::project_priority, 'medium'), $6, $7, $8)
     RETURNING id`,
    [workspaceId, name, description || null, status, priority, startDate || null, deadline || null, createdBy]
  );
  return findById(rows[0].id);
}

async function update(projectId, fields) {
  const allowed = ['name', 'description', 'status', 'priority', 'start_date', 'deadline'];
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
  if (sets.length === 0) return findById(projectId);

  values.push(projectId);
  await db.query(`UPDATE projects SET ${sets.join(', ')} WHERE id = $${i}`, values);
  return findById(projectId);
}

async function setArchived(projectId, archived) {
  await db.query(
    `UPDATE projects SET archived = $1, status = $2 WHERE id = $3`,
    [archived, archived ? 'archived' : 'active', projectId]
  );
  return findById(projectId);
}

async function remove(projectId) {
  await db.query('DELETE FROM projects WHERE id = $1', [projectId]);
}

module.exports = { listForUser, listForWorkspace, findById, create, update, setArchived, remove };
