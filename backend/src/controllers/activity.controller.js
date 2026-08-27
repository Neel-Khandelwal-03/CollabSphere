const asyncHandler = require('../utils/asyncHandler');
const activityLogService = require('../services/activityLog.service');

function pickFilters(query) {
  return {
    actorId: query.actorId,
    entityType: query.entityType,
    category: query.category,
    createdAfter: query.createdAfter,
    createdBefore: query.createdBefore,
    cursor: query.cursor,
    limit: query.limit ? parseInt(query.limit, 10) : undefined,
  };
}

// GET /api/workspaces/:workspaceId/activity — requireWorkspaceRole('viewer')
const getWorkspaceActivity = asyncHandler(async (req, res) => {
  const activity = await activityLogService.getWorkspaceActivity(req.params.workspaceId, pickFilters(req.query));
  res.json({ success: true, data: { activity } });
});

// GET /api/projects/:projectId/activity — requireWorkspaceRole('viewer') via loadProject
const getProjectActivity = asyncHandler(async (req, res) => {
  const activity = await activityLogService.getProjectActivity(req.params.projectId, pickFilters(req.query));
  res.json({ success: true, data: { activity } });
});

// GET /api/activity/:entityType/:entityId — gated by resolveEntityWorkspace
// + requireWorkspaceRole('viewer'), see resolveEntityWorkspace.js.
const getEntityActivity = asyncHandler(async (req, res) => {
  const activity = await activityLogService.getEntityActivity(req.params.entityType, req.params.entityId);
  res.json({ success: true, data: { activity } });
});

module.exports = { getWorkspaceActivity, getProjectActivity, getEntityActivity };
