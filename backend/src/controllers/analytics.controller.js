const asyncHandler = require('../utils/asyncHandler');
const analyticsService = require('../services/analytics.service');

function pickRange(query) {
  return { range: query.range, from: query.from };
}

// GET /api/analytics/dashboard
const getDashboard = asyncHandler(async (req, res) => {
  const data = await analyticsService.getDashboardAnalytics(req.user.id, pickRange(req.query));
  const upcomingDeadlines = await analyticsService.getUpcomingDeadlines(req.user.id);
  res.json({ success: true, data: { ...data, upcomingDeadlines } });
});

// GET /api/workspaces/:workspaceId/analytics — requireWorkspaceRole('viewer')
const getWorkspaceAnalytics = asyncHandler(async (req, res) => {
  const data = await analyticsService.getWorkspaceAnalytics(req.params.workspaceId, pickRange(req.query));
  const teamContribution = await analyticsService.getTeamContribution(req.params.workspaceId, pickRange(req.query));
  const activityOverTime = await analyticsService.getActivityOverTime(req.params.workspaceId, pickRange(req.query));
  res.json({ success: true, data: { ...data, teamContribution, activityOverTime } });
});

// GET /api/projects/:projectId/analytics — requireWorkspaceRole('viewer') via loadProject
const getProjectAnalytics = asyncHandler(async (req, res) => {
  const data = await analyticsService.getProjectAnalytics(req.params.projectId);
  const priorityBreakdown = await analyticsService.getTaskPriorityBreakdown(req.params.projectId);
  const weeklyProgress = await analyticsService.getWeeklyTaskProgress(req.params.projectId, pickRange(req.query));
  res.json({ success: true, data: { ...data, tasksByPriority: priorityBreakdown, weeklyProgress } });
});

module.exports = { getDashboard, getWorkspaceAnalytics, getProjectAnalytics };
