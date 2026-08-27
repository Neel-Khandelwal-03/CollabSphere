const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const issueService = require('../services/issue.service');
const commentService = require('../services/issueComment.service');
const historyService = require('../services/issueHistory.service');
const labelService = require('../services/taskLabel.service');
const taskService = require('../services/task.service');
const workspaceMemberService = require('../services/workspaceMember.service');
const attachmentService = require('../services/issueAttachment.service');
const notificationService = require('../services/notification.service');
const activityLogService = require('../services/activityLog.service');
const { resolveValidMentions } = require('../utils/mentions');
const { uploadBuffer, deleteResource } = require('../utils/cloudinary');
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

  await activityLogService.log({
    workspaceId: req.params.workspaceId,
    projectId,
    actorId: req.user.id,
    action: 'issue.created',
    entityType: 'issue',
    entityId: issueId,
    newValue: { title },
  });

  if (assigneeId) {
    await notificationService.notify({
      userId: assigneeId,
      actorId: req.user.id,
      type: 'ISSUE_ASSIGNED',
      title: 'You were assigned an issue',
      message: `${req.user.name} assigned you "${title}"`,
      entityType: 'issue',
      entityId: issueId,
      metadata: { issueTitle: title, projectId },
    });
  }

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
  const [comments, history, attachments] = await Promise.all([
    commentService.list(req.params.issueId),
    historyService.list(req.params.issueId),
    attachmentService.list(req.params.issueId),
  ]);
  const issue = await issueService.findById(req.params.issueId);
  res.json({ success: true, data: { issue, myRole: req.workspaceRole, comments, history, attachments } });
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

  await activityLogService.log({
    workspaceId: req.issue.workspace_id,
    projectId: req.issue.project_id,
    actorId: req.user.id,
    action: 'issue.deleted',
    entityType: 'issue',
    entityId: req.params.issueId,
    oldValue: { title: req.issue.title },
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

  await activityLogService.log({
    workspaceId: req.params.workspaceId,
    projectId: req.issue.project_id,
    actorId: req.user.id,
    action: `issue.${action}`,
    entityType: 'issue',
    entityId: req.params.issueId,
    oldValue: { status: req.issue.status },
    newValue: { status },
  });

  if (issue.assignee_id && issue.assignee_id !== req.user.id) {
    await notificationService.notify({
      userId: issue.assignee_id,
      actorId: req.user.id,
      type: 'ISSUE_STATUS_CHANGED',
      title: 'Issue status changed',
      message: `${req.user.name} changed "${issue.title}" from ${req.issue.status} to ${status}`,
      entityType: 'issue',
      entityId: req.params.issueId,
      metadata: { issueTitle: issue.title, from: req.issue.status, to: status },
    });
  }

  issueEvents.emit(action === 'closed' ? 'closed' : 'updated', { issue, actorId: req.user.id });
  res.json({ success: true, data: { issue } });
});

const changePriority = asyncHandler(async (req, res) => {
  assertCanEdit(req);
  const { priority } = req.body;
  const issue = await issueService.setPriority(req.params.issueId, priority);
  if (priority !== req.issue.priority) {
    await historyService.log(req.params.issueId, req.user.id, 'priority_changed', req.issue.priority, priority);
    await activityLogService.log({
      workspaceId: req.params.workspaceId,
      projectId: req.issue.project_id,
      actorId: req.user.id,
      action: 'issue.priority_changed',
      entityType: 'issue',
      entityId: req.params.issueId,
      oldValue: { priority: req.issue.priority },
      newValue: { priority },
    });
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
    await activityLogService.log({
      workspaceId: req.params.workspaceId,
      projectId: req.issue.project_id,
      actorId: req.user.id,
      action: 'issue.severity_changed',
      entityType: 'issue',
      entityId: req.params.issueId,
      oldValue: { severity: req.issue.severity },
      newValue: { severity },
    });
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

  await activityLogService.log({
    workspaceId: req.params.workspaceId,
    projectId: req.issue.project_id,
    actorId: req.user.id,
    action: 'issue.reassigned',
    entityType: 'issue',
    entityId: req.params.issueId,
    oldValue: { assigneeId: req.issue.assignee_id },
    newValue: { assigneeId: assigneeId || null },
  });

  if (assigneeId) {
    await notificationService.notify({
      userId: assigneeId,
      actorId: req.user.id,
      type: 'ISSUE_ASSIGNED',
      title: 'You were assigned an issue',
      message: `${req.user.name} assigned you "${issue.title}"`,
      entityType: 'issue',
      entityId: req.params.issueId,
      metadata: { issueTitle: issue.title, projectId: req.issue.project_id },
    });
  }

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
  await activityLogService.log({
    workspaceId: req.params.workspaceId,
    projectId: req.issue.project_id,
    actorId: req.user.id,
    action: `issue.${action}`,
    entityType: 'issue',
    entityId: req.params.issueId,
    oldValue: { linkedTaskId: req.issue.linked_task_id },
    newValue: { linkedTaskId: linkedTaskId || null },
  });
  issueEvents.emit('updated', { issue, actorId: req.user.id });
  res.json({ success: true, data: { issue } });
});

const createComment = asyncHandler(async (req, res) => {
  const members = await workspaceMemberService.listMembers(req.params.workspaceId);
  const authorizedUserIds = new Set(members.map((m) => m.user_id));
  const mentionedUserIds = resolveValidMentions(req.body.comment, authorizedUserIds);
  const mentions = mentionedUserIds.map((userId) => ({
    userId,
    name: members.find((m) => m.user_id === userId)?.name,
  }));

  const comment = await commentService.create(req.params.issueId, req.user.id, req.body.comment, mentions);
  await historyService.log(req.params.issueId, req.user.id, 'comment_added', null, null);
  issueEvents.emit('comment_added', { issueId: req.params.issueId, comment, actorId: req.user.id });

  await activityLogService.log({
    workspaceId: req.params.workspaceId,
    projectId: req.issue.project_id,
    actorId: req.user.id,
    action: 'issue.comment_added',
    entityType: 'issue',
    entityId: req.params.issueId,
  });

  if (mentionedUserIds.length > 0) {
    await notificationService.notifyMentions(mentionedUserIds, {
      actorId: req.user.id,
      type: 'ISSUE_MENTION',
      title: 'You were mentioned in an issue',
      message: `${req.user.name} mentioned you on "${req.issue.title}"`,
      entityType: 'issue',
      entityId: req.params.issueId,
      metadata: { issueTitle: req.issue.title, commentId: comment.id },
    });
  }

  if (req.issue.assignee_id && req.issue.assignee_id !== req.user.id && !mentionedUserIds.includes(req.issue.assignee_id)) {
    await notificationService.notify({
      userId: req.issue.assignee_id,
      actorId: req.user.id,
      type: 'ISSUE_COMMENT',
      title: 'New comment on your issue',
      message: `${req.user.name} commented on "${req.issue.title}"`,
      entityType: 'issue',
      entityId: req.params.issueId,
      metadata: { issueTitle: req.issue.title, commentId: comment.id },
    });
  }

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

// ---- Attachments (mirrors task.controller.js's attachment handlers,
// built with the Cloudinary public_id/resource_type fix already in
// place from day one, rather than needing the same retrofit tasks did) ----

const uploadAttachment = asyncHandler(async (req, res) => {
  assertCanEdit(req);
  if (!req.file) throw ApiError.badRequest('No file provided');

  const folder = `collabsphere/issues/${req.params.issueId}`;
  const result = await uploadBuffer(req.file.buffer, { folder, filename: req.file.originalname });

  const attachment = await attachmentService.create({
    issueId: req.params.issueId,
    uploadedBy: req.user.id,
    fileName: req.file.originalname,
    fileUrl: result.secure_url,
    fileType: req.file.mimetype,
    fileSize: req.file.size,
    publicId: result.public_id,
    resourceType: result.resource_type,
    folder,
  });

  await historyService.log(req.params.issueId, req.user.id, 'attachment_uploaded', null, attachment.file_name);

  await activityLogService.log({
    workspaceId: req.params.workspaceId,
    projectId: req.issue.project_id,
    actorId: req.user.id,
    action: 'file.uploaded',
    entityType: 'issue',
    entityId: req.params.issueId,
    newValue: { fileName: attachment.file_name },
  });

  if (req.issue.assignee_id && req.issue.assignee_id !== req.user.id) {
    await notificationService.notify({
      userId: req.issue.assignee_id,
      actorId: req.user.id,
      type: 'FILE_UPLOADED',
      title: 'New file on your issue',
      message: `${req.user.name} uploaded "${attachment.file_name}" to "${req.issue.title}"`,
      entityType: 'issue',
      entityId: req.params.issueId,
      metadata: { issueTitle: req.issue.title, fileName: attachment.file_name },
    });
  }

  res.status(201).json({ success: true, data: { attachment } });
});

const deleteAttachment = asyncHandler(async (req, res) => {
  const existing = await attachmentService.findById(req.params.attachmentId);
  if (!existing || existing.issue_id !== req.params.issueId) throw ApiError.notFound('Attachment not found');
  if (existing.uploaded_by !== req.user.id && !isManager(req.workspaceRole)) {
    throw ApiError.forbidden('You can only delete your own attachments');
  }

  try {
    await deleteResource(existing.public_id, existing.resource_type || 'image');
  } catch (err) {
    console.error(`Cloudinary deletion failed for issue attachment ${existing.id} (public_id ${existing.public_id}):`, err.message);
    throw ApiError.internal('Failed to delete the stored file. Please try again.');
  }

  await attachmentService.remove(req.params.attachmentId);
  res.json({ success: true, message: 'Attachment deleted' });
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
  uploadAttachment,
  deleteAttachment,
};
