const db = require('../config/db');
const ApiError = require('../utils/ApiError');

/**
 * GET /activity/:entityType/:entityId has no workspace in its URL, unlike
 * every other route in this app — this resolves one so the route can
 * still chain into the existing requireWorkspaceRole middleware,
 * matching how loadTask/loadIssue/loadFile all set req.params.workspaceId
 * before their own RBAC check, rather than inventing a parallel
 * authorization path just for this one endpoint.
 */
async function resolveEntityWorkspace(req, res, next) {
  const { entityType, entityId } = req.params;

  const RESOLVERS = {
    task: 'SELECT p.workspace_id FROM tasks t JOIN projects p ON p.id = t.project_id WHERE t.id = $1',
    issue: 'SELECT p.workspace_id FROM issues i JOIN projects p ON p.id = i.project_id WHERE i.id = $1',
    project: 'SELECT workspace_id FROM projects WHERE id = $1',
    workspace: 'SELECT id AS workspace_id FROM workspaces WHERE id = $1',
  };

  const sql = RESOLVERS[entityType];
  if (!sql) return next(ApiError.badRequest(`Unsupported entityType: ${entityType}`));

  try {
    const { rows } = await db.query(sql, [entityId]);
    if (!rows[0]) return next(ApiError.notFound('Entity not found'));
    req.params.workspaceId = rows[0].workspace_id;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = resolveEntityWorkspace;
