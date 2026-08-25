const db = require('../config/db');
const ApiError = require('../utils/ApiError');

/**
 * Loads the task referenced by :taskId, attaches it to req.task, and sets
 * req.params.workspaceId to its grandparent workspace (via the task's
 * project) — same pattern as loadProject in the Project module, so every
 * /api/tasks/:id/* route can chain straight into the existing
 * requireWorkspaceRole middleware unchanged.
 */
async function loadTask(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT t.*, p.workspace_id AS workspace_id
       FROM tasks t
       JOIN projects p ON p.id = t.project_id
       WHERE t.id = $1`,
      [req.params.taskId]
    );
    const task = rows[0];
    if (!task) return next(ApiError.notFound('Task not found'));

    req.task = task;
    req.params.workspaceId = task.workspace_id;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * For POST /api/tasks, where there's no :taskId yet — resolves the
 * workspace from req.body.projectId instead, so requireWorkspaceRole can
 * still run unmodified. Also attaches req.taskProject for the controller.
 */
async function resolveProjectFromBody(req, res, next) {
  try {
    const { rows } = await db.query('SELECT * FROM projects WHERE id = $1', [
      req.body.projectId,
    ]);
    const project = rows[0];
    if (!project) return next(ApiError.badRequest('projectId does not reference a real project'));

    req.taskProject = project;
    req.params.workspaceId = project.workspace_id;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { loadTask, resolveProjectFromBody };
