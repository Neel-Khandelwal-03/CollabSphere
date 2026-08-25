const fileService = require('../services/file.service');
const ApiError = require('../utils/ApiError');

/**
 * Loads the file referenced by :fileId, attaches it to req.fileRecord
 * (not req.file — multer already owns that name for uploads), and sets
 * req.params.workspaceId so GET/download/delete can all chain into the
 * existing requireWorkspaceRole middleware unchanged — the same pattern
 * loadTask.js/loadIssue.js/loadConversation.js already established,
 * rather than re-deriving membership by hand inside the controller.
 */
async function loadFile(req, res, next) {
  try {
    const file = await fileService.findById(req.params.fileId);
    if (!file) return next(ApiError.notFound('File not found'));

    req.fileRecord = file;
    req.params.workspaceId = file.workspace_id;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/files carries workspaceId in the multipart body, not the
 * URL — this just promotes it to req.params.workspaceId so
 * requireWorkspaceRole picks it up the same way every other route does.
 */
function resolveWorkspaceFromBody(req, res, next) {
  if (!req.body.workspaceId) return next(ApiError.badRequest('workspaceId is required'));
  req.params.workspaceId = req.body.workspaceId;
  next();
}

module.exports = { loadFile, resolveWorkspaceFromBody };
