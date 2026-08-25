const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const projectService = require('../services/project.service');
const projectMemberService = require('../services/projectMember.service');
const workspaceMemberService = require('../services/workspaceMember.service');

function pickListFilters(query) {
  return {
    search: query.search,
    status: query.status,
    priority: query.priority,
    archived: query.archived,
    sort: query.sort,
  };
}

// POST /api/projects
// Gated by requireWorkspaceRole('admin') — workspaceId comes from req.body,
// which the middleware already supports (see requireWorkspaceRole.js).
const createProject = asyncHandler(async (req, res) => {
  const { workspaceId, name, description, status, priority, startDate, deadline } = req.body;
  const project = await projectService.create({
    workspaceId,
    name,
    description,
    status,
    priority,
    startDate,
    deadline,
    createdBy: req.user.id,
  });
  res.status(201).json({ success: true, data: { project } });
});

// GET /api/projects — every project across every workspace the user is in.
const listMyProjects = asyncHandler(async (req, res) => {
  const projects = await projectService.listForUser(req.user.id, pickListFilters(req.query));
  res.json({ success: true, data: { projects } });
});

// GET /api/workspaces/:workspaceId/projects
// Gated by requireWorkspaceRole('viewer') (wired in workspace.routes.js).
const listWorkspaceProjects = asyncHandler(async (req, res) => {
  const projects = await projectService.listForWorkspace(
    req.params.workspaceId,
    pickListFilters(req.query)
  );
  res.json({ success: true, data: { projects } });
});

// GET /api/projects/:projectId
// Gated by loadProject + requireWorkspaceRole('viewer'). Includes the full
// member list here (rather than a separate GET .../members endpoint,
// which isn't in the spec's route list) since the Project Details page
// and Assign Members modal both need the complete roster, not just the
// 5-item preview used on the list page.
const getProject = asyncHandler(async (req, res) => {
  const members = await projectMemberService.listMembers(req.params.projectId);
  res.json({ success: true, data: { project: req.project, myRole: req.workspaceRole, members } });
});

// PUT /api/projects/:projectId
// Gated by loadProject + requireWorkspaceRole('admin').
const updateProject = asyncHandler(async (req, res) => {
  const { name, description, status, priority, startDate, deadline } = req.body;

  if (status === 'archived') {
    throw ApiError.badRequest('Use POST /projects/:id/archive to archive a project');
  }

  const project = await projectService.update(req.params.projectId, {
    name,
    description,
    status,
    priority,
    start_date: startDate,
    deadline,
  });
  res.json({ success: true, data: { project } });
});

// DELETE /api/projects/:projectId
// Gated by loadProject + requireWorkspaceRole('admin').
const deleteProject = asyncHandler(async (req, res) => {
  await projectService.remove(req.params.projectId);
  res.json({ success: true, message: 'Project deleted' });
});

// POST /api/projects/:projectId/archive
const archiveProject = asyncHandler(async (req, res) => {
  if (req.project.archived) {
    throw ApiError.badRequest('Project is already archived');
  }
  const project = await projectService.setArchived(req.params.projectId, true);
  res.json({ success: true, data: { project } });
});

// POST /api/projects/:projectId/restore
const restoreProject = asyncHandler(async (req, res) => {
  if (!req.project.archived) {
    throw ApiError.badRequest('Project is not archived');
  }
  const project = await projectService.setArchived(req.params.projectId, false);
  res.json({ success: true, data: { project } });
});

// POST /api/projects/:projectId/members
// Gated by loadProject + requireWorkspaceRole('admin'). The assignee must
// already be a member of the parent workspace — assigning an outsider to
// a project inside a workspace they can't otherwise see would be a hole.
const addProjectMember = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { userId } = req.body;

  const workspaceMembership = await workspaceMemberService.findMemberByUserId(
    req.project.workspace_id,
    userId
  );
  if (!workspaceMembership) {
    throw ApiError.badRequest('This user must be a member of the workspace before being assigned to a project');
  }

  const already = await projectMemberService.isAlreadyMember(projectId, userId);
  if (already) {
    throw ApiError.conflict('This user is already assigned to the project');
  }

  await projectMemberService.addMember(projectId, userId, req.user.id);
  const members = await projectMemberService.listMembers(projectId);
  res.status(201).json({ success: true, data: { members } });
});

// DELETE /api/projects/:projectId/members/:memberId
// Gated by loadProject + requireWorkspaceRole('admin').
const removeProjectMember = asyncHandler(async (req, res) => {
  const { projectId, memberId } = req.params;
  const member = await projectMemberService.findMemberById(projectId, memberId);
  if (!member) throw ApiError.notFound('Member not found on this project');

  await projectMemberService.removeMember(memberId);
  const members = await projectMemberService.listMembers(projectId);
  res.json({ success: true, data: { members } });
});

module.exports = {
  createProject,
  listMyProjects,
  listWorkspaceProjects,
  getProject,
  updateProject,
  deleteProject,
  archiveProject,
  restoreProject,
  addProjectMember,
  removeProjectMember,
};
