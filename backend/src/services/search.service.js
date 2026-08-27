const db = require('../config/db');

/**
 * Every single search query below is scoped to workspaces the searching
 * user actually belongs to — never a global search across all data in
 * the database. This is the one rule that makes the RBAC requirement
 * hold: a private workspace's projects/tasks/issues/files/members are
 * structurally unreachable through this service for anyone outside it,
 * not filtered out after the fact.
 */
const MY_WORKSPACES = '(SELECT workspace_id FROM workspace_members WHERE user_id = $1)';

async function searchWorkspaces(userId, term, limit) {
  const { rows } = await db.query(
    `SELECT w.id, w.name, w.description
     FROM workspaces w
     WHERE w.id IN ${MY_WORKSPACES} AND w.name ILIKE $2
     ORDER BY w.name
     LIMIT $3`,
    [userId, `%${term}%`, limit]
  );
  return rows.map((r) => ({
    type: 'workspace',
    id: r.id,
    title: r.name,
    description: r.description,
    href: `/workspaces/${r.id}`,
  }));
}

async function searchProjects(userId, term, limit) {
  const { rows } = await db.query(
    `SELECT p.id, p.name, p.description, w.name AS workspace_name
     FROM projects p
     JOIN workspaces w ON w.id = p.workspace_id
     WHERE p.workspace_id IN ${MY_WORKSPACES} AND p.name ILIKE $2
     ORDER BY p.name
     LIMIT $3`,
    [userId, `%${term}%`, limit]
  );
  return rows.map((r) => ({
    type: 'project',
    id: r.id,
    title: r.name,
    description: r.workspace_name,
    href: `/projects/${r.id}`,
  }));
}

async function searchTasks(userId, term, limit) {
  const { rows } = await db.query(
    `SELECT t.id, t.title, t.status, p.name AS project_name
     FROM tasks t
     JOIN projects p ON p.id = t.project_id
     WHERE p.workspace_id IN ${MY_WORKSPACES} AND t.title ILIKE $2
     ORDER BY t.title
     LIMIT $3`,
    [userId, `%${term}%`, limit]
  );
  return rows.map((r) => ({
    type: 'task',
    id: r.id,
    title: r.title,
    description: `${r.project_name} · ${r.status}`,
    href: `/tasks?open=${r.id}`,
  }));
}

async function searchIssues(userId, term, limit) {
  const { rows } = await db.query(
    `SELECT i.id, i.title, i.status, i.severity, p.name AS project_name
     FROM issues i
     JOIN projects p ON p.id = i.project_id
     WHERE p.workspace_id IN ${MY_WORKSPACES} AND i.title ILIKE $2
     ORDER BY i.title
     LIMIT $3`,
    [userId, `%${term}%`, limit]
  );
  return rows.map((r) => ({
    type: 'issue',
    id: r.id,
    title: r.title,
    description: `${r.project_name} · ${r.status} · ${r.severity}`,
    href: `/issues?open=${r.id}`,
  }));
}

/** Only people who share at least one workspace with the searcher — not a global user directory. */
async function searchUsers(userId, term, limit) {
  const { rows } = await db.query(
    `SELECT DISTINCT u.id, u.name, u.email, u.avatar_url
     FROM users u
     JOIN workspace_members wm ON wm.user_id = u.id
     WHERE wm.workspace_id IN ${MY_WORKSPACES} AND u.name ILIKE $2 AND u.id != $1
     ORDER BY u.name
     LIMIT $3`,
    [userId, `%${term}%`, limit]
  );
  return rows.map((r) => ({
    type: 'user',
    id: r.id,
    title: r.name,
    description: r.email,
    avatarUrl: r.avatar_url,
    href: '/chat',
  }));
}

/** Unions the general-purpose files table with task/issue attachments, mirroring file.service.js's existing union approach rather than duplicating it. */
async function searchFiles(userId, term, limit) {
  const { rows } = await db.query(
    `SELECT id, name, href FROM (
       SELECT f.id, f.original_name AS name, ('/workspaces/' || f.workspace_id || '?tab=files') AS href, f.original_name AS sort_key
       FROM files f WHERE f.workspace_id IN ${MY_WORKSPACES} AND f.original_name ILIKE $2

       UNION ALL

       SELECT ta.id, ta.file_name AS name, ('/tasks?open=' || ta.task_id) AS href, ta.file_name AS sort_key
       FROM task_attachments ta
       JOIN tasks t ON t.id = ta.task_id
       JOIN projects p ON p.id = t.project_id
       WHERE p.workspace_id IN ${MY_WORKSPACES} AND ta.file_name ILIKE $2

       UNION ALL

       SELECT ia.id, ia.file_name AS name, ('/issues?open=' || ia.issue_id) AS href, ia.file_name AS sort_key
       FROM issue_attachments ia
       JOIN issues i ON i.id = ia.issue_id
       JOIN projects p2 ON p2.id = i.project_id
       WHERE p2.workspace_id IN ${MY_WORKSPACES} AND ia.file_name ILIKE $2
     ) combined
     ORDER BY sort_key
     LIMIT $3`,
    [userId, `%${term}%`, limit]
  );
  return rows.map((r) => ({ type: 'file', id: r.id, title: r.name, description: null, href: r.href }));
}

const SEARCHERS = {
  workspace: searchWorkspaces,
  project: searchProjects,
  task: searchTasks,
  issue: searchIssues,
  user: searchUsers,
  file: searchFiles,
};

/**
 * `type` restricts to one category (used by the full results page's
 * category tabs); omitted, runs all six in parallel with a small
 * per-category limit (used by the quick command-palette dropdown).
 * Deliberately excludes chat/DM content entirely — the spec's explicit
 * instruction not to search private messages unless the privacy model
 * clearly supports it, which it doesn't.
 */
async function search(userId, term, { type, limit = 5 } = {}) {
  const trimmed = term.trim();
  if (!trimmed) return {};

  if (type && SEARCHERS[type]) {
    const results = await SEARCHERS[type](userId, trimmed, Math.min(limit, 50));
    return { [type]: results };
  }

  const entries = Object.entries(SEARCHERS);
  const results = await Promise.all(entries.map(([, fn]) => fn(userId, trimmed, limit)));
  return Object.fromEntries(entries.map(([key], i) => [key, results[i]]));
}

module.exports = { search };
