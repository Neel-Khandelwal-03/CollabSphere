const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const labelService = require('../services/taskLabel.service');

// POST /api/workspaces/:workspaceId/labels — requireWorkspaceRole('admin')
const createLabel = asyncHandler(async (req, res) => {
  const { name, color } = req.body;

  const existing = await labelService.findByWorkspaceAndName(req.params.workspaceId, name);
  if (existing) throw ApiError.conflict('A label with this name already exists in this workspace');

  const label = await labelService.create(req.params.workspaceId, name, color);
  res.status(201).json({ success: true, data: { label } });
});

// GET /api/workspaces/:workspaceId/labels — requireWorkspaceRole('viewer')
const listLabels = asyncHandler(async (req, res) => {
  const labels = await labelService.listForWorkspace(req.params.workspaceId);
  res.json({ success: true, data: { labels } });
});

module.exports = { createLabel, listLabels };
