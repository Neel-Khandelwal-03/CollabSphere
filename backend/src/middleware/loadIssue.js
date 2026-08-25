const db = require('../config/db');
const ApiError = require('../utils/ApiError');

/**
 * Loads the issue referenced by :issueId, attaches it to req.issue, and
 * sets req.params.workspaceId to its grandparent workspace — identical
 * pattern to loadTask.js and loadProject.js. (POST /api/issues, which has
 * no :issueId yet, reuses loadTask.js's resolveProjectFromBody directly
 * rather than duplicating an equivalent function here — it's already
 * fully generic, keyed off req.body.projectId.)
 */
async function loadIssue(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT i.*, p.workspace_id AS workspace_id
       FROM issues i
       JOIN projects p ON p.id = i.project_id
       WHERE i.id = $1`,
      [req.params.issueId]
    );
    const issue = rows[0];
    if (!issue) return next(ApiError.notFound('Issue not found'));

    req.issue = issue;
    req.params.workspaceId = issue.workspace_id;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = loadIssue;
