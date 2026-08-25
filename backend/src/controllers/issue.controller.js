const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const issueService = require('../services/issue.service');
const commentService = require('../services/issueComment.service');
const historyService = require('../services/issueHistory.service');
const labelService = require('../services/taskLabel.service');
const taskService = require('../services/task.service');
const workspaceMemberService = require('../services/workspaceMember.service');
const issueEvents = require('../utils/issueEvents');

const MANAGER_ROLES = ['owner', 'admin'];
const isManager = (role) => MANAGER_ROLES.includes(role);

function pickListFilters(query) {
  return {
    search: query.search,
    status: query.status,
    priority: query.priority,
    severity: query.severity,
    type: query.type,
    projectId: query.projectId,
    assignedTo: query.assignedTo,
    reporterId: query.reporterId,
    linkedTaskId: query.linkedTaskId,
    createdAfter: query.createdAfter,
    createdBefore: query.createdBefore,
    updatedAfter: query.updatedAfter,
    updatedBefore: query.updatedBefore,
    sort: query.sort,
    page: query.page ? parseInt(query.page, 10) : undefined,
    pageSize: query.pageSize ? parseInt(query.pageSize, 10) : undefined,
  };
}

async function assertAssignableUser(workspaceId, userId) {
  if (!userId) return;
  const membership = await workspaceMemberService.findMemberByUserId(workspaceId, userId);
  if (!membership) throw ApiError.badRequest('assigneeId must be a member of this workspace');
}

const createIssue = asyncHandler(async (req, res) => {
  const { projectId, title, description, type, priority, severity, assigneeId, linkedTaskId } = req.body;

  await assertAssignableUser(req.params.workspaceId, assigneeId);

  if (linkedTaskId) {
    const task = await taskService.findById(linkedTaskId);
    if (!task || task.project_id !== projectId) {
      throw ApiError.badRequest('linkedTaskId must reference a task in the same project');
    }
  }

  const issueId = await issueService.create({
    projectId,
    title,
    description,
    type,
    priority,
    severity,
    reporterId: req.user.id,
    assigneeId,
    linkedTaskId,
  });
  await historyService.log(issueId, req.user.id, 'created', null, title);

  const issue = await issueService.findById(issueId);
  issueEvents.emit('created', { issue, actorId: req.user.id });
  res.status(201).json({ success: true, data: { issue } });
});

const listMyIssues = asyncHandler(async (req, res) => {
  const result = await issueService.listForUser(req.user.id, pickListFilters(req.query));
  res.json({ success: true, data: result });
});

const listProjectIssues = asyncHandler(async (req, res) => {
  const result = await issueService.listForProject(req.params.projectId, pickListFilters(req.query));
  res.json({ success: true, data: result });
});

const getIssue = asyncHandler(async (req, res) => {
  const [comments, history] = await Promise.all([
    commentService.list(req.params.issueId),
    historyService.list(req.params.issueId),
  ]);
  const issue = await issueService.findById(req.params.issueId);
  res.json({ success: true, data: { issue, myRole: req.workspaceRole, comments, history } });
});

function assertCanEdit(req) {
  const isAssignee = req.issue.assignee_id === req.user.id;
  if (!isManager(req.workspaceRole) && !isAssignee) {
    throw ApiError.forbidden('You can only edit issues assigned to you');
  }
}

const updateIssue = asyncHandler(async (req, res) => {
  assertCanEdit(req);

  const { title, description, type, status, priority, severity, assigneeId, linkedTaskId } = req.body;
  if (status !== undefined || priority !== undefined || severity !== undefined || assigneeId !== undefined || linkedTaskId !== undefined) {
    throw ApiError.badRequest('Use the dedicated PATCH endpoints to change status, priority, severity, assignee, or linked task');
  }

  const titleChanged = title !== undefined && title !== req.issue.title;
  const issue = await issueService.update(req.params.issueId, { title, description, type });

  if (titleChanged) {
    await historyService.log(req.params.issueId, req.user.id, 'updated', req.issue.title, title);
  }
  issueEvents.emit('updated', { issue, actorId: req.user.id });
  res.json({ success: true, data: { issue } });
});

const deleteIssue = asyncHandler(async (req, res) => {
  await issueService.remove(req.params.issueId);
  issueEvents.emit('deleted', {
    issueId: req.params.issueId,
    projectId: req.issue.project_id,
    workspaceId: req.issue.workspace_id,
    actorId: req.user.id,
  });
  res.json({ success: true, message: 'Issue deleted' });
});

const changeStatus = asyncHandler(async (req, res) => {
  assertCanEdit(req);
  const { status } = req.body;
  if (status === req.issue.status) return res.json({ success: true, data: { issue: req.issue } });

  const issue = await issueService.setStatus(req.params.issueId, status);
  const action = status === 'closed' ? 'closed' : status === 'reopened' ? 'reopened' : 'status_changed';
  await historyService.log(req.params.issueId, req.user.id, action, req.issue.status, status);
  issueEvents.emit(action === 'closed' ? 'closed' : 'updated', { issue, actorId: req.user.id });
  res.json({ success: true, data: { issue } });
});

const changePriority = asyncHandler(async (req, res) => {
  assertCanEdit(req);
  const { priority } = req.body;
  const issue = await issueService.setPriority(req.params.issueId, priority);
  if (priority !== req.issue.priority) {
    await historyService.log(req.params.issueId, req.user.id, 'priority_changed', req.issue.priority, priority);
  }
  issueEvents.emit('updated', { issue, actorId: req.user.id });
  res.json({ success: true, data: { issue } });
});

const changeSeverity = asyncHandler(async (req, res) => {
  assertCanEdit(req);
  const { severity } = req.body;
  const issue = await issueService.setSeverity(req.params.issueId, severity);
  if (severity !== req.issue.severity) {
    await historyService.log(req.params.issueId, req.user.id, 'severity_changed', req.issue.severity, severity);
  }
  issueEvents.emit('updated', { issue, actorId: req.user.id });
  res.json({ success: true, data: { issue } });
});

const changeAssignee = asyncHandler(async (req, res) => {
  assertCanEdit(req);
  const { assigneeId } = req.body;
  await assertAssignableUser(req.params.workspaceId, assigneeId);

  const issue = await issueService.setAssignee(req.params.issueId, assigneeId || null);
  await historyService.log(req.params.issueId, req.user.id, 'assignee_changed', req.issue.assignee_id, assigneeId || null);
  issueEvents.emit('updated', { issue, actorId: req.user.id });
  res.json({ success: true, data: { issue } });
});

const linkTask = asyncHandler(async (req, res) => {
  assertCanEdit(req);
  const { linkedTaskId } = req.body;

  if (linkedTaskId) {
    const task = await taskService.findById(linkedTaskId);
    if (!task || task.project_id !== req.issue.project_id) {
      throw ApiError.badRequest('linkedTaskId must reference a task in the same project');
    }
  }

  const issue = await issueService.setLinkedTask(req.params.issueId, linkedTaskId || null);
  const action = linkedTaskId ? 'task_linked' : 'task_unlinked';
  await historyService.log(req.params.issueId, req.user.id, action, req.issue.linked_task_id, linkedTaskId || null);
  issueEvents.emit('updated', { issue, actorId: req.user.id });
  res.json({ success: true, data: { issue } });
});

const createComment = asyncHandler(async (req, res) => {
  const comment = await commentService.create(req.params.issueId, req.user.id, req.body.comment);
  await historyService.log(req.params.issueId, req.user.id, 'comment_added', null, null);
  issueEvents.emit('comment_added', { issueId: req.params.issueId, comment, actorId: req.user.id });
  res.status(201).json({ success: true, data: { comment } });
});

const listComments = asyncHandler(async (req, res) => {
  const comments = await commentService.list(req.params.issueId);
  res.json({ success: true, data: { comments } });
});

const updateComment = asyncHandler(async (req, res) => {
  const existing = await commentService.findById(req.params.commentId);
  if (!existing || existing.issue_id !== req.params.issueId) throw ApiError.notFound('Comment not found');
  if (existing.user_id !== req.user.id) throw ApiError.forbidden('You can only edit your own comments');

  const comment = await commentService.update(req.params.commentId, req.body.comment);
  res.json({ success: true, data: { comment } });
});

const deleteComment = asyncHandler(async (req, res) => {
  const existing = await commentService.findById(req.params.commentId);
  if (!existing || existing.issue_id !== req.params.issueId) throw ApiError.notFound('Comment not found');
  if (existing.user_id !== req.user.id && !isManager(req.workspaceRole)) {
    throw ApiError.forbidden('You can only delete your own comments');
  }

  await commentService.remove(req.params.commentId);
  await historyService.log(req.params.issueId, req.user.id, 'comment_deleted', null, null);
  res.json({ success: true, message: 'Comment deleted' });
});

const attachLabel = asyncHandler(async (req, res) => {
  assertCanEdit(req);
  const { labelId } = req.body;
  const label = await labelService.findById(labelId);
  if (!label || label.workspace_id !== req.params.workspaceId) {
    throw ApiError.badRequest('labelId does not belong to this workspace');
  }
  await labelService.attachToIssue(req.params.issueId, labelId);
  res.status(201).json({ success: true, message: 'Label attached' });
});

const detachLabel = asyncHandler(async (req, res) => {
  assertCanEdit(req);
  await labelService.detachFromIssue(req.params.issueId, req.params.labelId);
  res.json({ success: true, message: 'Label removed' });
});

module.exports = {
  createIssue,
  listMyIssues,
  listProjectIssues,
  getIssue,
  updateIssue,
  deleteIssue,
  changeStatus,
  changePriority,
  changeSeverity,
  changeAssignee,
  linkTask,
  createComment,
  listComments,
  updateComment,
  deleteComment,
  attachLabel,
  detachLabel,
};
