const db = require('../config/db');

const SORT_MAP = {
  newest: 'i.created_at DESC',
  oldest: 'i.created_at ASC',
  priority: "array_position(ARRAY['critical','high','medium','low']::issue_priority[], i.priority)",
  severity: "array_position(ARRAY['blocker','critical','major','minor']::issue_severity[], i.severity)",
  status: "array_position(ARRAY['open','reopened','in_progress','resolved','closed']::issue_status[], i.status)",
  alphabetical: 'i.title ASC',
};

const SELECT_FIELDS = `
  i.id, i.project_id, i.issue_number, i.linked_task_id, i.title, i.description,
  i.type, i.priority, i.status, i.severity, i.reporter_id, i.assignee_id,
  i.created_at, i.updated_at, i.closed_at,
  reporter.name AS reporter_name, reporter.avatar_url AS reporter_avatar,
  assignee.name AS assignee_name, assignee.avatar_url AS assignee_avatar,
  p.name AS project_name, p.workspace_id,
  w.name AS workspace_name,
  t.title AS linked_task_title,
  (SELECT COUNT(*) FROM issue_comments c WHERE c.issue_id = i.id)::int AS comment_count,
  COALESCE(lbl.labels, '[]'::json) AS labels
`;

const JOINS = `
  JOIN projects p ON p.id = i.project_id
  JOIN workspaces w ON w.id = p.workspace_id
  LEFT JOIN users reporter ON reporter.id = i.reporter_id
  LEFT JOIN users assignee ON assignee.id = i.assignee_id
  LEFT JOIN tasks t ON t.id = i.linked_task_id
  LEFT JOIN LATERAL (
    SELECT json_agg(json_build_object('id', l.id, 'name', l.name, 'color', l.color)) AS labels
    FROM issue_label_map ilm
    JOIN task_labels l ON l.id = ilm.label_id
    WHERE ilm.issue_id = i.id
  ) lbl ON true
`;

function buildFilters(f, startIndex) {
  const clauses = [];
  const params = [];
  let i = startIndex;

  const eq = (col, val) => {
    if (val === undefined || val === null || val === '') return;
    clauses.push(`i.${col} = $${i}`);
    params.push(val);
    i += 1;
  };

  eq('status', f.status);
  eq('priority', f.priority);
  eq('severity', f.severity);
  eq('type', f.type);
  eq('project_id', f.projectId);
  eq('assignee_id', f.assignedTo);
  eq('reporter_id', f.reporterId);

  if (f.linkedTaskId === 'none') {
    clauses.push('i.linked_task_id IS NULL');
  } else if (f.linkedTaskId) {
    clauses.push(`i.linked_task_id = $${i}`);
    params.push(f.linkedTaskId);
    i += 1;
  }

  if (f.createdAfter) {
    clauses.push(`i.created_at >= $${i}`);
    params.push(f.createdAfter);
    i += 1;
  }
  if (f.createdBefore) {
    clauses.push(`i.created_at <= $${i}`);
    params.push(f.createdBefore);
    i += 1;
  }
  if (f.updatedAfter) {
    clauses.push(`i.updated_at >= $${i}`);
    params.push(f.updatedAfter);
    i += 1;
  }
  if (f.updatedBefore) {
    clauses.push(`i.updated_at <= $${i}`);
    params.push(f.updatedBefore);
    i += 1;
  }

  if (f.search) {
    // "Search by Issue ID" (spec) is interpreted as the human-facing
    // sequential number, not the UUID — nobody types a UUID into a search
    // box. A purely numeric search term also matches issue_number exactly.
    const isNumeric = /^\d+$/.test(f.search.trim());
    if (isNumeric) {
      clauses.push(`(i.title ILIKE $${i} OR i.description ILIKE $${i} OR i.issue_number = $${i + 1})`);
      params.push(`%${f.search}%`, parseInt(f.search.trim(), 10));
      i += 2;
    } else {
      clauses.push(`(i.title ILIKE $${i} OR i.description ILIKE $${i})`);
      params.push(`%${f.search}%`);
      i += 1;
    }
  }

  return { whereFragment: clauses.length ? `AND ${clauses.join(' AND ')}` : '', params, nextIndex: i };
}

async function listForUser(userId, filters) {
  const { whereFragment, params, nextIndex } = buildFilters(filters, 2);
  const sort = SORT_MAP[filters.sort] || SORT_MAP.newest;
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 25;
  const offset = (page - 1) * pageSize;

  const countResult = await db.query(
    `SELECT COUNT(*)::int AS total
     FROM issues i
     JOIN projects p ON p.id = i.project_id
     JOIN workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = $1
     WHERE 1=1 ${whereFragment}`,
    [userId, ...params]
  );

  const { rows } = await db.query(
    `
    SELECT ${SELECT_FIELDS}
    FROM issues i
    ${JOINS}
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = $1
    WHERE 1=1 ${whereFragment}
    ORDER BY ${sort}
    LIMIT $${nextIndex} OFFSET $${nextIndex + 1}
    `,
    [userId, ...params, pageSize, offset]
  );

  return { issues: rows, total: countResult.rows[0].total, page, pageSize };
}

async function listForProject(projectId, filters = {}) {
  const { whereFragment, params, nextIndex } = buildFilters(filters, 2);
  const sort = SORT_MAP[filters.sort] || SORT_MAP.newest;
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 25;
  const offset = (page - 1) * pageSize;

  const countResult = await db.query(
    `SELECT COUNT(*)::int AS total FROM issues i WHERE i.project_id = $1 ${whereFragment}`,
    [projectId, ...params]
  );

  const { rows } = await db.query(
    `
    SELECT ${SELECT_FIELDS}
    FROM issues i
    ${JOINS}
    WHERE i.project_id = $1 ${whereFragment}
    ORDER BY ${sort}
    LIMIT $${nextIndex} OFFSET $${nextIndex + 1}
    `,
    [projectId, ...params, pageSize, offset]
  );

  return { issues: rows, total: countResult.rows[0].total, page, pageSize };
}

async function countForProject(projectId) {
  const { rows } = await db.query('SELECT COUNT(*)::int AS count FROM issues WHERE project_id = $1', [
    projectId,
  ]);
  return rows[0].count;
}

async function findById(issueId) {
  const { rows } = await db.query(`SELECT ${SELECT_FIELDS} FROM issues i ${JOINS} WHERE i.id = $1`, [
    issueId,
  ]);
  return rows[0] || null;
}

/** Issues that reference a given task — feeds the Task drawer's "Related Issues". */
async function listForTask(taskId) {
  const { rows } = await db.query(
    `SELECT i.id, i.issue_number, i.title, i.status, i.priority, i.project_id
     FROM issues i WHERE i.linked_task_id = $1 ORDER BY i.created_at DESC`,
    [taskId]
  );
  return rows;
}

async function create({ projectId, title, description, type, priority, severity, reporterId, assigneeId, linkedTaskId }) {
  return db.withTransaction(async (client) => {
    const { rows: countRows } = await client.query(
      'SELECT COUNT(*)::int AS count FROM issues WHERE project_id = $1',
      [projectId]
    );
    const issueNumber = countRows[0].count + 1;

    const { rows } = await client.query(
      `INSERT INTO issues (project_id, issue_number, title, description, type, priority, severity, reporter_id, assignee_id, linked_task_id)
       VALUES ($1, $2, $3, $4, COALESCE($5::issue_type, 'bug'), COALESCE($6::issue_priority, 'medium'),
               COALESCE($7::issue_severity, 'minor'), $8, $9, $10)
       RETURNING id`,
      [projectId, issueNumber, title, description || null, type, priority, severity, reporterId, assigneeId || null, linkedTaskId || null]
    );
    return rows[0].id;
  });
}

async function update(issueId, fields) {
  const allowed = ['title', 'description', 'type'];
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
  if (sets.length === 0) return findById(issueId);

  values.push(issueId);
  await db.query(`UPDATE issues SET ${sets.join(', ')} WHERE id = $${i}`, values);
  return findById(issueId);
}

async function setStatus(issueId, status) {
  const closedAtClause = status === 'closed' ? 'now()' : 'NULL';
  await db.query(
    `UPDATE issues SET status = $1::issue_status, closed_at = ${closedAtClause} WHERE id = $2`,
    [status, issueId]
  );
  return findById(issueId);
}

async function setPriority(issueId, priority) {
  await db.query('UPDATE issues SET priority = $1::issue_priority WHERE id = $2', [priority, issueId]);
  return findById(issueId);
}

async function setSeverity(issueId, severity) {
  await db.query('UPDATE issues SET severity = $1::issue_severity WHERE id = $2', [severity, issueId]);
  return findById(issueId);
}

async function setAssignee(issueId, assigneeId) {
  await db.query('UPDATE issues SET assignee_id = $1 WHERE id = $2', [assigneeId, issueId]);
  return findById(issueId);
}

async function setLinkedTask(issueId, linkedTaskId) {
  await db.query('UPDATE issues SET linked_task_id = $1 WHERE id = $2', [linkedTaskId, issueId]);
  return findById(issueId);
}

async function remove(issueId) {
  await db.query('DELETE FROM issues WHERE id = $1', [issueId]);
}

module.exports = {
  listForUser,
  listForProject,
  countForProject,
  findById,
  listForTask,
  create,
  update,
  setStatus,
  setPriority,
  setSeverity,
  setAssignee,
  setLinkedTask,
  remove,
};
