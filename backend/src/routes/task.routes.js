const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const requireWorkspaceRole = require('../middleware/requireWorkspaceRole');
const { loadTask, resolveProjectFromBody } = require('../middleware/loadTask');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');
const taskController = require('../controllers/task.controller');
const {
  createTaskValidators,
  updateTaskValidators,
  taskIdValidators,
  changeStatusValidators,
  changePositionValidators,
  listTasksQueryValidators,
  createCommentValidators,
  updateCommentValidators,
  commentIdValidators,
  attachmentIdValidators,
  attachLabelValidators,
  detachLabelValidators,
} = require('../middleware/taskValidators');

const router = Router();

router.use(authenticate);

router.post(
  '/',
  createTaskValidators,
  validate,
  resolveProjectFromBody,
  requireWorkspaceRole('member'),
  taskController.createTask
);

router.get('/', listTasksQueryValidators, validate, taskController.listTasks);

router.get(
  '/:taskId',
  taskIdValidators,
  validate,
  loadTask,
  requireWorkspaceRole('viewer'),
  taskController.getTask
);

router.put(
  '/:taskId',
  updateTaskValidators,
  validate,
  loadTask,
  requireWorkspaceRole('member'),
  taskController.updateTask
);

router.delete(
  '/:taskId',
  taskIdValidators,
  validate,
  loadTask,
  requireWorkspaceRole('admin'),
  taskController.deleteTask
);

router.patch(
  '/:taskId/status',
  changeStatusValidators,
  validate,
  loadTask,
  requireWorkspaceRole('member'),
  taskController.changeStatus
);

router.patch(
  '/:taskId/position',
  changePositionValidators,
  validate,
  loadTask,
  requireWorkspaceRole('member'),
  taskController.changePosition
);

router.post(
  '/:taskId/comments',
  createCommentValidators,
  validate,
  loadTask,
  requireWorkspaceRole('member'),
  taskController.createComment
);

router.get(
  '/:taskId/comments',
  taskIdValidators,
  validate,
  loadTask,
  requireWorkspaceRole('viewer'),
  taskController.listComments
);

router.patch(
  '/:taskId/comments/:commentId',
  updateCommentValidators,
  validate,
  loadTask,
  requireWorkspaceRole('member'),
  taskController.updateComment
);

router.delete(
  '/:taskId/comments/:commentId',
  commentIdValidators,
  validate,
  loadTask,
  requireWorkspaceRole('member'),
  taskController.deleteComment
);

router.post(
  '/:taskId/attachments',
  taskIdValidators,
  validate,
  loadTask,
  requireWorkspaceRole('member'),
  upload.single('file'),
  taskController.uploadAttachment
);

router.delete(
  '/:taskId/attachments/:attachmentId',
  attachmentIdValidators,
  validate,
  loadTask,
  requireWorkspaceRole('member'),
  taskController.deleteAttachment
);

router.post(
  '/:taskId/labels',
  attachLabelValidators,
  validate,
  loadTask,
  requireWorkspaceRole('member'),
  taskController.attachLabel
);

router.delete(
  '/:taskId/labels/:labelId',
  detachLabelValidators,
  validate,
  loadTask,
  requireWorkspaceRole('member'),
  taskController.detachLabel
);

module.exports = router;
