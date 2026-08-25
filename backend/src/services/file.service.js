const db = require('../config/db');

const SORT_MAP = {
  newest: 'created_at DESC',
  oldest: 'created_at ASC',
  name_asc: 'original_name ASC',
  name_desc: 'original_name DESC',
  largest: 'file_size DESC NULLS LAST',
  smallest: 'file_size ASC NULLS LAST',
};

/**
 * The shape every source (files, task_attachments, issue_attachments) is
 * normalized into before being UNIONed — a common column set is what
 * lets one query, one set of filters, and one sort apply uniformly
 * across three differently-shaped tables without duplicating a single
 * row's worth of storage.
 */
function buildUnionQuery({ workspaceScopeSql }) {
  return `
    WITH combined AS (
      SELECT
        f.id, 'general'::text AS source_type, NULL::uuid AS source_id, NULL::text AS source_title,
        f.original_name AS file_name, f.file_url, f.secure_url, f.mime_type, f.resource_type,
        f.file_size, f.uploaded_by, f.workspace_id, f.project_id, f.created_at
      FROM files f
      WHERE ${workspaceScopeSql('f')}

      UNION ALL

      SELECT
        ta.id, 'task'::text AS source_type, ta.task_id AS source_id, t.title AS source_title,
        ta.file_name, ta.file_url, ta.file_url AS secure_url, ta.file_type AS mime_type, ta.resource_type,
        ta.file_size, ta.uploaded_by, p.workspace_id, t.project_id, ta.created_at
      FROM task_attachments ta
      JOIN tasks t ON t.id = ta.task_id
      JOIN projects p ON p.id = t.project_id
      WHERE ${workspaceScopeSql('p')}

      UNION ALL

      SELECT
        ia.id, 'issue'::text AS source_type, ia.issue_id AS source_id, i.title AS source_title,
        ia.file_name, ia.file_url, ia.file_url AS secure_url, ia.file_type AS mime_type, ia.resource_type,
        ia.file_size, ia.uploaded_by, p2.workspace_id, i.project_id, ia.created_at
      FROM issue_attachments ia
      JOIN issues i ON i.id = ia.issue_id
      JOIN projects p2 ON p2.id = i.project_id
      WHERE ${workspaceScopeSql('p2')}
    )
  `;
}

function buildFilters(f, startIndex) {
  const clauses = [];
  const params = [];
  let i = startIndex;

  if (f.projectId) {
    clauses.push(`c.project_id = $${i}`);
    params.push(f.projectId);
    i += 1;
  }
  if (f.uploadedBy) {
    clauses.push(`c.uploaded_by = $${i}`);
    params.push(f.uploadedBy);
    i += 1;
  }
  if (f.mimeType) {
    clauses.push(`c.mime_type = $${i}`);
    params.push(f.mimeType);
    i += 1;
  } else if (f.category === 'image') {
    clauses.push(`c.mime_type LIKE 'image/%'`);
  } else if (f.category === 'document') {
    clauses.push(`c.mime_type NOT LIKE 'image/%' OR c.mime_type IS NULL`);
  }
  if (f.createdAfter) {
    clauses.push(`c.created_at >= $${i}`);
    params.push(f.createdAfter);
    i += 1;
  }
  if (f.createdBefore) {
    clauses.push(`c.created_at <= $${i}`);
    params.push(f.createdBefore);
    i += 1;
  }
  if (f.search) {
    clauses.push(`c.file_name ILIKE $${i}`);
    params.push(`%${f.search}%`);
    i += 1;
  }

  return { whereFragment: clauses.length ? `AND ${clauses.join(' AND ')}` : '', params, nextIndex: i };
}

async function listForWorkspace(workspaceId, filters = {}) {
  const cte = buildUnionQuery({ workspaceScopeSql: (alias) => `${alias}.workspace_id = $1` });
  const { whereFragment, params, nextIndex } = buildFilters(filters, 2);
  const sort = SORT_MAP[filters.sort] || SORT_MAP.newest;
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 24;
  const offset = (page - 1) * pageSize;

  const countResult = await db.query(
    `${cte} SELECT COUNT(*)::int AS total FROM combined c WHERE 1=1 ${whereFragment}`,
    [workspaceId, ...params]
  );

  const { rows } = await db.query(
    `${cte}
     SELECT c.*, u.name AS uploaded_by_name, u.avatar_url AS uploaded_by_avatar
     FROM combined c
     LEFT JOIN users u ON u.id = c.uploaded_by
     WHERE 1=1 ${whereFragment}
     ORDER BY c.${sort}
     LIMIT $${nextIndex} OFFSET $${nextIndex + 1}`,
    [workspaceId, ...params, pageSize, offset]
  );

  return { files: rows, total: countResult.rows[0].total, page, pageSize };
}

async function listForProject(projectId, workspaceId, filters = {}) {
  const cte = buildUnionQuery({ workspaceScopeSql: (alias) => `${alias}.workspace_id = $1` });
  const scopedFilters = { ...filters, projectId };
  const { whereFragment, params, nextIndex } = buildFilters(scopedFilters, 2);
  const sort = SORT_MAP[filters.sort] || SORT_MAP.newest;
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 24;
  const offset = (page - 1) * pageSize;

  const countResult = await db.query(
    `${cte} SELECT COUNT(*)::int AS total FROM combined c WHERE 1=1 ${whereFragment}`,
    [workspaceId, ...params]
  );

  const { rows } = await db.query(
    `${cte}
     SELECT c.*, u.name AS uploaded_by_name, u.avatar_url AS uploaded_by_avatar
     FROM combined c
     LEFT JOIN users u ON u.id = c.uploaded_by
     WHERE 1=1 ${whereFragment}
     ORDER BY c.${sort}
     LIMIT $${nextIndex} OFFSET $${nextIndex + 1}`,
    [workspaceId, ...params, pageSize, offset]
  );

  return { files: rows, total: countResult.rows[0].total, page, pageSize };
}

async function findById(fileId) {
  const { rows } = await db.query(
    `SELECT f.*, u.name AS uploaded_by_name, u.avatar_url AS uploaded_by_avatar
     FROM files f LEFT JOIN users u ON u.id = f.uploaded_by
     WHERE f.id = $1`,
    [fileId]
  );
  return rows[0] || null;
}

async function create({ workspaceId, projectId, uploadedBy, originalName, publicId, fileUrl, secureUrl, resourceType, mimeType, fileSize, folder }) {
  const { rows } = await db.query(
    `INSERT INTO files (workspace_id, project_id, uploaded_by, original_name, public_id, file_url, secure_url, resource_type, mime_type, file_size, folder)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [workspaceId, projectId || null, uploadedBy, originalName, publicId, fileUrl, secureUrl, resourceType, mimeType, fileSize, folder]
  );
  return findById(rows[0].id);
}

async function remove(fileId) {
  await db.query('DELETE FROM files WHERE id = $1', [fileId]);
}

module.exports = { listForWorkspace, listForProject, findById, create, remove };
