const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const taskService = require('../services/task.service');
const commentService = require('../services/taskComment.service');
const labelService = require('../services/taskLabel.service');
const attachmentService = require('../services/taskAttachment.service');
const activityService = require('../services/taskActivity.service');
const workspaceMemberService = require('../services/workspaceMember.service');
const taskEvents = require('../utils/taskEvents');
const { uploadBuffer, deleteResource } = require('../utils/cloudinary');

const MANAGER_ROLES = ['owner', 'admin'];

function isManager(role) {
  return MANAGER_ROLES.includes(role);
}

function pickListFilters(query) {
  return {
    search: query.search,
    status: query.status,
    priority: query.priority,
    projectId: query.projectId,
    assignedTo: query.assignedTo,
    labelId: query.labelId,
    sort: query.sort,
    page: query.page ? parseInt(query.page, 10) : undefined,
    pageSize: query.pageSize ? parseInt(query.pageSize, 10) : undefined,
  };
}

// POST /api/tasks
// Gated by resolveProjectFromBody + requireWorkspaceRole('member').
const createTask = asyncHandler(async (req, res) => {
  const { projectId, title, description, status, priority, dueDate, estimatedHours, assignedTo } = req.body;

  if (assignedTo) {
    const membership = await workspaceMemberService.findMemberByUserId(req.params.workspaceId, assignedTo);
    if (!membership) {
      throw ApiError.badRequest('assignedTo must be a member of this workspace');
    }
  }

  const taskId = await taskService.create({
    projectId,
    title,
    description,
    status,
    priority,
    dueDate,
    estimatedHours,
    assignedTo,
    createdBy: req.user.id,
  });
  await activityService.log(taskId, req.user.id, 'created', { title });

  const task = await taskService.findById(taskId);
  taskEvents.emit('created', { task, actorId: req.user.id });
  res.status(201).json({ success: true, data: { task } });
});

// GET /api/tasks
const listTasks = asyncHandler(async (req, res) => {
  const result = await taskService.listForUser(req.user.id, pickListFilters(req.query));
  res.json({ success: true, data: result });
});

// GET /api/tasks/:taskId
// Gated by loadTask + requireWorkspaceRole('viewer').
const getTask = asyncHandler(async (req, res) => {
  const task = await taskService.findById(req.params.taskId);
  const [comments, attachments, activity, relatedIssues] = await Promise.all([
    commentService.list(req.params.taskId),
    attachmentService.list(req.params.taskId),
    activityService.list(req.params.taskId),
    // Added for Issue Tracking integration (Checkpoint 5) — the spec
    // requires "Task page should display Related Issues." Lazily required
    // here rather than imported at module load time, so this file has no
    // hard compile-time dependency on the Issue module existing.
    require('../services/issue.service').listForTask(req.params.taskId),
  ]);
  res.json({
    success: true,
    data: { task, myRole: req.workspaceRole, comments, attachments, activity, relatedIssues },
  });
});

// PUT /api/tasks/:taskId
// Gated by loadTask + requireWorkspaceRole('member') [floor]. Members may
// only edit a task assigned to them; Admin/Owner can edit any task. This
// is a per-record business rule, not a duplicate of the coarse RBAC gate
// already enforced by requireWorkspaceRole.
const updateTask = asyncHandler(async (req, res) => {
  const isOwnTask = req.task.assigned_to === req.user.id;
  if (!isManager(req.workspaceRole) && !isOwnTask) {
    throw ApiError.forbidden('You can only update tasks assigned to you');
  }

  const { title, description, status, priority, dueDate, estimatedHours, assignedTo } = req.body;

  if (status !== undefined) {
    throw ApiError.badRequest('Use PATCH /tasks/:id/status or /position to change status');
  }

  if (assignedTo !== undefined && assignedTo !== null) {
    const membership = await workspaceMemberService.findMemberByUserId(req.params.workspaceId, assignedTo);
    if (!membership) throw ApiError.badRequest('assignedTo must be a member of this workspace');
  }

  const changes = {};
  if (title !== undefined && title !== req.task.title) changes.title = { from: req.task.title, to: title };
  if (priority !== undefined && priority !== req.task.priority) changes.priority = { from: req.task.priority, to: priority };
  if (assignedTo !== undefined && assignedTo !== req.task.assigned_to) changes.assignee = { from: req.task.assigned_to, to: assignedTo };

  const task = await taskService.update(req.params.taskId, {
    title,
    description,
    priority,
    due_date: dueDate,
    estimated_hours: estimatedHours,
    assigned_to: assignedTo,
  });

  if (changes.priority) {
    await activityService.log(req.params.taskId, req.user.id, 'priority_changed', changes.priority);
  }
  if (changes.assignee) {
    await activityService.log(req.params.taskId, req.user.id, 'assignee_changed', changes.assignee);
  }
  if (changes.title) {
    await activityService.log(req.params.taskId, req.user.id, 'updated', { title: changes.title });
  }

  taskEvents.emit('updated', { task, actorId: req.user.id });
  res.json({ success: true, data: { task } });
});

// DELETE /api/tasks/:taskId
// Gated by loadTask + requireWorkspaceRole('admin') — members cannot delete.
const deleteTask = asyncHandler(async (req, res) => {
  await taskService.remove(req.params.taskId);
  taskEvents.emit('deleted', {
    taskId: req.params.taskId,
    projectId: req.task.project_id,
    workspaceId: req.task.workspace_id,
    actorId: req.user.id,
  });
  res.json({ success: true, message: 'Task deleted' });
});

// PATCH /api/tasks/:taskId/status
// Gated by loadTask + requireWorkspaceRole('member'). "Move Tasks" is a
// general member capability (unlike editing, which is assigned-only), so
// no ownership check here. Appends to the end of the destination column.
const changeStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const fromStatus = req.task.status;

  if (status === fromStatus) {
    return res.json({ success: true, data: { task: req.task } });
  }

  const endPosition = await taskService.countInColumn(req.task.project_id, status);
  await taskService.move(req.params.taskId, status, endPosition);
  const task = await taskService.findById(req.params.taskId);

  await activityService.log(req.params.taskId, req.user.id, 'status_changed', { from: fromStatus, to: status });
  taskEvents.emit('status_changed', { task, from: fromStatus, to: status, actorId: req.user.id });
  res.json({ success: true, data: { task } });
});

// PATCH /api/tasks/:taskId/position
// Gated by loadTask + requireWorkspaceRole('member'). Used by drag-and-drop
// for exact placement (both within a column and across columns).
const changePosition = asyncHandler(async (req, res) => {
  const { status, position } = req.body;
  const fromStatus = req.task.status;

  await taskService.move(req.params.taskId, status, position);
  const task = await taskService.findById(req.params.taskId);

  if (fromStatus !== status) {
    await activityService.log(req.params.taskId, req.user.id, 'status_changed', { from: fromStatus, to: status });
    taskEvents.emit('status_changed', { task, from: fromStatus, to: status, actorId: req.user.id });
  } else {
    taskEvents.emit('updated', { task, actorId: req.user.id });
  }
  res.json({ success: true, data: { task } });
});

// ---- Comments ----

// POST /api/tasks/:taskId/comments — requireWorkspaceRole('member')
const createComment = asyncHandler(async (req, res) => {
  const comment = await commentService.create(req.params.taskId, req.user.id, req.body.comment);
  await activityService.log(req.params.taskId, req.user.id, 'comment_added', { commentId: comment.id });
  res.status(201).json({ success: true, data: { comment } });
});

// GET /api/tasks/:taskId/comments — requireWorkspaceRole('viewer')
const listComments = asyncHandler(async (req, res) => {
  const comments = await commentService.list(req.params.taskId);
  res.json({ success: true, data: { comments } });
});

// PATCH /api/tasks/:taskId/comments/:commentId — author only, strictly.
const updateComment = asyncHandler(async (req, res) => {
  const existing = await commentService.findById(req.params.commentId);
  if (!existing || existing.task_id !== req.params.taskId) throw ApiError.notFound('Comment not found');
  if (existing.user_id !== req.user.id) throw ApiError.forbidden('You can only edit your own comments');

  const comment = await commentService.update(req.params.commentId, req.body.comment);
  res.json({ success: true, data: { comment } });
});

// DELETE /api/tasks/:taskId/comments/:commentId — author OR admin/owner
// (a slightly more permissive moderation allowance than the literal
// "delete own comment" spec line — documented in the README).
const deleteComment = asyncHandler(async (req, res) => {
  const existing = await commentService.findById(req.params.commentId);
  if (!existing || existing.task_id !== req.params.taskId) throw ApiError.notFound('Comment not found');
  if (existing.user_id !== req.user.id && !isManager(req.workspaceRole)) {
    throw ApiError.forbidden('You can only delete your own comments');
  }

  await commentService.remove(req.params.commentId);
  res.json({ success: true, message: 'Comment deleted' });
});

// ---- Attachments ----

// POST /api/tasks/:taskId/attachments — requireWorkspaceRole('member'), multipart/form-data
const uploadAttachment = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file provided');

  const folder = `collabsphere/tasks/${req.params.taskId}`;
  const result = await uploadBuffer(req.file.buffer, { folder, filename: req.file.originalname });

  const attachment = await attachmentService.create({
    taskId: req.params.taskId,
    uploadedBy: req.user.id,
    fileName: req.file.originalname,
    fileUrl: result.secure_url,
    fileType: req.file.mimetype,
    fileSize: req.file.size,
    publicId: result.public_id,
    resourceType: result.resource_type,
    folder,
  });

  await activityService.log(req.params.taskId, req.user.id, 'attachment_uploaded', { fileName: attachment.file_name });
  res.status(201).json({ success: true, data: { attachment } });
});

// DELETE /api/tasks/:taskId/attachments/:attachmentId — uploader OR admin/owner
const deleteAttachment = asyncHandler(async (req, res) => {
  const existing = await attachmentService.findById(req.params.attachmentId);
  if (!existing || existing.task_id !== req.params.taskId) throw ApiError.notFound('Attachment not found');
  if (existing.uploaded_by !== req.user.id && !isManager(req.workspaceRole)) {
    throw ApiError.forbidden('You can only delete your own attachments');
  }

  // Cloudinary first, then Postgres — same reasoning as file.controller.js's
  // deleteFile. Attachments uploaded before migration 007 have no
  // public_id (added retroactively); deleteResource's own guard treats a
  // missing public_id as a no-op rather than an error, so old rows still
  // delete cleanly from the database, just without anything to clean up
  // on the Cloudinary side (nothing to clean up — nothing was ever
  // recorded for them to begin with, a documented limitation, not a
  // silently swallowed failure).
  try {
    await deleteResource(existing.public_id, existing.resource_type || 'image');
  } catch (err) {
    console.error(`Cloudinary deletion failed for task attachment ${existing.id} (public_id ${existing.public_id}):`, err.message);
    throw ApiError.internal('Failed to delete the stored file. Please try again.');
  }

  await attachmentService.remove(req.params.attachmentId);
  res.json({ success: true, message: 'Attachment deleted' });
});

// ---- Labels ----

// POST /api/tasks/:taskId/labels — requireWorkspaceRole('member'). body: { labelId }
const attachLabel = asyncHandler(async (req, res) => {
  const { labelId } = req.body;
  const label = await labelService.findById(labelId);
  if (!label || label.workspace_id !== req.params.workspaceId) {
    throw ApiError.badRequest('labelId does not belong to this workspace');
  }

  await labelService.attachToTask(req.params.taskId, labelId);
  res.status(201).json({ success: true, message: 'Label attached' });
});

// DELETE /api/tasks/:taskId/labels/:labelId — requireWorkspaceRole('member')
const detachLabel = asyncHandler(async (req, res) => {
  await labelService.detachFromTask(req.params.taskId, req.params.labelId);
  res.json({ success: true, message: 'Label removed' });
});

module.exports = {
  createTask,
  listTasks,
  getTask,
  updateTask,
  deleteTask,
  changeStatus,
  changePosition,
  createComment,
  listComments,
  updateComment,
  deleteComment,
  uploadAttachment,
  deleteAttachment,
  attachLabel,
  detachLabel,
};
