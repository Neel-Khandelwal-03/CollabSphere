const db = require('../config/db');
const ApiError = require('../utils/ApiError');

/**
 * Loads the project referenced by :projectId, attaches it to req.project,
 * and sets req.params.workspaceId to its parent workspace. This lets every
 * /api/projects/:id/* route chain straight into the existing
 * requireWorkspaceRole middleware from the Workspace module unchanged —
 * no parallel "requireProjectRole" RBAC logic to keep in sync.
 */
async function loadProject(req, res, next) {
  try {
    const { rows } = await db.query('SELECT * FROM projects WHERE id = $1', [
      req.params.projectId,
    ]);
    const project = rows[0];
    if (!project) return next(ApiError.notFound('Project not found'));

    req.project = project;
    req.params.workspaceId = project.workspace_id;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = loadProject;
