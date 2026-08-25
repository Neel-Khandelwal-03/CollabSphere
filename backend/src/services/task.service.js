const db = require('../config/db');

const SORT_MAP = {
  newest: 't.created_at DESC',
  oldest: 't.created_at ASC',
  priority: "array_position(ARRAY['critical','high','medium','low']::task_priority[], t.priority)",
  deadline: 't.due_date ASC NULLS LAST',
  alphabetical: 't.title ASC',
};

const SELECT_FIELDS = `
  t.id, t.project_id, t.title, t.description, t.status, t.priority,
  t.due_date, t.estimated_hours, t.created_by, t.assigned_to, t.position,
  t.created_at, t.updated_at,
  creator.name AS created_by_name,
  assignee.name AS assignee_name, assignee.avatar_url AS assignee_avatar,
  p.name AS project_name, p.workspace_id,
  w.name AS workspace_name,
  (SELECT COUNT(*) FROM task_comments c WHERE c.task_id = t.id)::int AS comment_count,
  (SELECT COUNT(*) FROM task_attachments a WHERE a.task_id = t.id)::int AS attachment_count,
  COALESCE(lbl.labels, '[]'::json) AS labels
`;

const JOINS = `
  JOIN projects p ON p.id = t.project_id
  JOIN workspaces w ON w.id = p.workspace_id
  LEFT JOIN users creator ON creator.id = t.created_by
  LEFT JOIN users assignee ON assignee.id = t.assigned_to
  LEFT JOIN LATERAL (
    SELECT json_agg(json_build_object('id', l.id, 'name', l.name, 'color', l.color)) AS labels
    FROM task_label_map tlm
    JOIN task_labels l ON l.id = tlm.label_id
    WHERE tlm.task_id = t.id
  ) lbl ON true
`;

function buildFilters({ search, status, priority, projectId, assignedTo, labelId }, startIndex) {
  const clauses = [];
  const params = [];
  let i = startIndex;

  if (status) {
    clauses.push(`t.status = $${i}`);
    params.push(status);
    i += 1;
  }
  if (priority) {
    clauses.push(`t.priority = $${i}`);
    params.push(priority);
    i += 1;
  }
  if (projectId) {
    clauses.push(`t.project_id = $${i}`);
    params.push(projectId);
    i += 1;
  }
  if (assignedTo) {
    clauses.push(`t.assigned_to = $${i}`);
    params.push(assignedTo);
    i += 1;
  }
  if (labelId) {
    clauses.push(`EXISTS (SELECT 1 FROM task_label_map tlm2 WHERE tlm2.task_id = t.id AND tlm2.label_id = $${i})`);
    params.push(labelId);
    i += 1;
  }
  if (search) {
    clauses.push(`(t.title ILIKE $${i} OR t.description ILIKE $${i})`);
    params.push(`%${search}%`);
    i += 1;
  }

  return { whereFragment: clauses.length ? `AND ${clauses.join(' AND ')}` : '', params, nextIndex: i };
}

/**
 * Every task in every project the given user's workspaces contain, with
 * search/filter/sort/pagination — mirrors project.service.js's
 * listForUser shape and query-param contract.
 */
async function listForUser(userId, filters) {
  const { whereFragment, params, nextIndex } = buildFilters(filters, 2);
  const sort = SORT_MAP[filters.sort] || SORT_MAP.newest;
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 25;
  const offset = (page - 1) * pageSize;

  const countResult = await db.query(
    `SELECT COUNT(*)::int AS total
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     JOIN workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = $1
     WHERE 1=1 ${whereFragment}`,
    [userId, ...params]
  );

  const { rows } = await db.query(
    `
    SELECT ${SELECT_FIELDS}
    FROM tasks t
    ${JOINS}
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id AND wm.user_id = $1
    WHERE 1=1 ${whereFragment}
    ORDER BY ${sort}
    LIMIT $${nextIndex} OFFSET $${nextIndex + 1}
    `,
    [userId, ...params, pageSize, offset]
  );

  return { tasks: rows, total: countResult.rows[0].total, page, pageSize };
}

/**
 * Every task in one project, sorted for direct Kanban-column rendering.
 * Caller (route middleware) has already confirmed workspace access.
 */
async function listForProject(projectId) {
  const { rows } = await db.query(
    `
    SELECT ${SELECT_FIELDS}
    FROM tasks t
    ${JOINS}
    WHERE t.project_id = $1
    ORDER BY t.status, t.position ASC
    `,
    [projectId]
  );
  return rows;
}

async function findById(taskId) {
  const { rows } = await db.query(
    `SELECT ${SELECT_FIELDS} FROM tasks t ${JOINS} WHERE t.id = $1`,
    [taskId]
  );
  return rows[0] || null;
}

async function create({ projectId, title, description, status, priority, dueDate, estimatedHours, assignedTo, createdBy }) {
  return db.withTransaction(async (client) => {
    const targetStatus = status || 'backlog';
    const { rows: countRows } = await client.query(
      'SELECT COUNT(*)::int AS count FROM tasks WHERE project_id = $1 AND status = $2::task_status',
      [projectId, targetStatus]
    );
    const position = countRows[0].count;

    const { rows } = await client.query(
      `INSERT INTO tasks (project_id, title, description, status, priority, due_date, estimated_hours, assigned_to, created_by, position)
       VALUES ($1, $2, $3, $4::task_status, COALESCE($5::task_priority, 'medium'), $6, $7, $8, $9, $10)
       RETURNING id`,
      [projectId, title, description || null, targetStatus, priority, dueDate || null, estimatedHours || null, assignedTo || null, createdBy, position]
    );
    return rows[0].id;
  });
}

async function update(taskId, fields) {
  const allowed = ['title', 'description', 'priority', 'due_date', 'estimated_hours', 'assigned_to'];
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
  if (sets.length === 0) return findById(taskId);

  values.push(taskId);
  await db.query(`UPDATE tasks SET ${sets.join(', ')} WHERE id = $${i}`, values);
  return findById(taskId);
}

/**
 * Moves a task to (newStatus, newPosition), shifting every other task in
 * the affected column(s) to keep `position` a dense 0-based sequence.
 * Used by both the drag-and-drop endpoint and the simpler "change status"
 * convenience endpoint (which just computes newPosition = end-of-column).
 */
async function move(taskId, newStatus, newPosition) {
  return db.withTransaction(async (client) => {
    const { rows } = await client.query(
      'SELECT project_id, status, position FROM tasks WHERE id = $1 FOR UPDATE',
      [taskId]
    );
    const task = rows[0];
    if (!task) return false;

    const { project_id: projectId, status: oldStatus, position: oldPosition } = task;

    if (oldStatus !== newStatus) {
      await client.query(
        'UPDATE tasks SET position = position - 1 WHERE project_id = $1 AND status = $2 AND position > $3',
        [projectId, oldStatus, oldPosition]
      );
      await client.query(
        'UPDATE tasks SET position = position + 1 WHERE project_id = $1 AND status = $2::task_status AND position >= $3',
        [projectId, newStatus, newPosition]
      );
      await client.query(
        'UPDATE tasks SET status = $1::task_status, position = $2 WHERE id = $3',
        [newStatus, newPosition, taskId]
      );
    } else if (newPosition > oldPosition) {
      await client.query(
        `UPDATE tasks SET position = position - 1
         WHERE project_id = $1 AND status = $2 AND position > $3 AND position <= $4 AND id <> $5`,
        [projectId, oldStatus, oldPosition, newPosition, taskId]
      );
      await client.query('UPDATE tasks SET position = $1 WHERE id = $2', [newPosition, taskId]);
    } else if (newPosition < oldPosition) {
      await client.query(
        `UPDATE tasks SET position = position + 1
         WHERE project_id = $1 AND status = $2 AND position >= $3 AND position < $4 AND id <> $5`,
        [projectId, oldStatus, newPosition, oldPosition, taskId]
      );
      await client.query('UPDATE tasks SET position = $1 WHERE id = $2', [newPosition, taskId]);
    }
    // else: same status, same position — no-op.

    // Deliberately NOT calling findById() here: this closure runs inside
    // an open transaction on a dedicated client, while findById() uses a
    // different pooled connection. Reading back through that separate
    // connection before COMMIT would see pre-move data (this was an
    // actual bug, caught by testing the HTTP layer, not just the
    // service layer in isolation — fixed by returning a plain boolean
    // and having the caller re-fetch via findById() after this resolves
    // and the transaction has committed).
    return true;
  });
}

async function countInColumn(projectId, status) {
  const { rows } = await db.query(
    'SELECT COUNT(*)::int AS count FROM tasks WHERE project_id = $1 AND status = $2::task_status',
    [projectId, status]
  );
  return rows[0].count;
}

async function remove(taskId) {
  return db.withTransaction(async (client) => {
    const { rows } = await client.query(
      'SELECT project_id, status, position FROM tasks WHERE id = $1 FOR UPDATE',
      [taskId]
    );
    const task = rows[0];
    if (!task) return;

    await client.query('DELETE FROM tasks WHERE id = $1', [taskId]);
    await client.query(
      'UPDATE tasks SET position = position - 1 WHERE project_id = $1 AND status = $2 AND position > $3',
      [task.project_id, task.status, task.position]
    );
  });
}

module.exports = {
  listForUser,
  listForProject,
  findById,
  create,
  update,
  move,
  countInColumn,
  remove,
};
