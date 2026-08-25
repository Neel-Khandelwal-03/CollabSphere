const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const workspaceService = require('../services/workspace.service');
const memberService = require('../services/workspaceMember.service');
const activityService = require('../services/workspaceActivity.service');

// POST /api/workspaces
const createWorkspace = asyncHandler(async (req, res) => {
  const { name, description, logoUrl } = req.body;
  const workspace = await workspaceService.create({
    name,
    description,
    logoUrl,
    ownerId: req.user.id,
  });
  res.status(201).json({ success: true, data: { workspace } });
});

// GET /api/workspaces
const listWorkspaces = asyncHandler(async (req, res) => {
  const workspaces = await workspaceService.listForUser(req.user.id);
  res.json({ success: true, data: { workspaces } });
});

// GET /api/workspaces/:workspaceId
// Gated by requireWorkspaceRole('viewer') — any member can view.
const getWorkspace = asyncHandler(async (req, res) => {
  const workspace = await workspaceService.findById(req.params.workspaceId);
  if (!workspace) throw ApiError.notFound('Workspace not found');
  const recentActivity = await activityService.listRecentActivity(req.params.workspaceId);
  res.json({ success: true, data: { workspace, myRole: req.workspaceRole, recentActivity } });
});

// PUT /api/workspaces/:workspaceId
// Gated by requireWorkspaceRole('admin').
const updateWorkspace = asyncHandler(async (req, res) => {
  const { name, description, logoUrl } = req.body;
  const workspace = await workspaceService.update(req.params.workspaceId, {
    name,
    description,
    logo_url: logoUrl,
  });
  if (!workspace) throw ApiError.notFound('Workspace not found');
  res.json({ success: true, data: { workspace } });
});

// DELETE /api/workspaces/:workspaceId
// Gated by requireWorkspaceRole('owner').
const deleteWorkspace = asyncHandler(async (req, res) => {
  const workspace = await workspaceService.findById(req.params.workspaceId);
  if (!workspace) throw ApiError.notFound('Workspace not found');
  await workspaceService.remove(req.params.workspaceId);
  res.json({ success: true, message: 'Workspace deleted' });
});

// GET /api/workspaces/:workspaceId/members
// Gated by requireWorkspaceRole('viewer').
const listMembers = asyncHandler(async (req, res) => {
  const members = await memberService.listMembers(req.params.workspaceId);
  res.json({ success: true, data: { members } });
});

// PATCH /api/workspaces/:workspaceId/members/:memberId
// Gated by requireWorkspaceRole('admin'). Fine-grained business rules
// (not coarse role gating, so they stay here rather than in middleware):
// the owner's role can't be changed here, and nobody can be promoted to
// owner through this endpoint — ownership transfer is a deliberate,
// separate action this module doesn't expose yet.
const updateMemberRole = asyncHandler(async (req, res) => {
  const { workspaceId, memberId } = req.params;
  const { role } = req.body;

  const member = await memberService.findMemberById(workspaceId, memberId);
  if (!member) throw ApiError.notFound('Member not found in this workspace');
  if (member.role === 'owner') {
    throw ApiError.forbidden("The workspace owner's role can't be changed here");
  }

  const updated = await memberService.updateRole(memberId, role);
  res.json({ success: true, data: { member: updated } });
});

// DELETE /api/workspaces/:workspaceId/members/:memberId
// Gated by requireWorkspaceRole('admin').
const removeMember = asyncHandler(async (req, res) => {
  const { workspaceId, memberId } = req.params;

  const member = await memberService.findMemberById(workspaceId, memberId);
  if (!member) throw ApiError.notFound('Member not found in this workspace');
  if (member.role === 'owner') {
    throw ApiError.forbidden('The workspace owner cannot be removed');
  }

  await memberService.removeMember(memberId);
  res.json({ success: true, message: 'Member removed' });
});

// POST /api/workspaces/:workspaceId/leave
// Gated by requireWorkspaceRole('viewer') — any member can leave except
// the sole owner (they must delete the workspace or hand off ownership
// first — not yet exposed by this module).
const leaveWorkspace = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params;
  const member = await memberService.findMemberByUserId(workspaceId, req.user.id);
  if (!member) throw ApiError.notFound('You are not a member of this workspace');

  if (member.role === 'owner') {
    throw ApiError.badRequest(
      'The workspace owner cannot leave. Delete the workspace or transfer ownership first.'
    );
  }

  await memberService.removeMember(member.id);
  res.json({ success: true, message: 'You have left the workspace' });
});

module.exports = {
  createWorkspace,
  listWorkspaces,
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
  listMembers,
  updateMemberRole,
  removeMember,
  leaveWorkspace,
};
