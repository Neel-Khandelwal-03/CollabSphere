const { body, param, query } = require('express-validator');

const STATUSES = ['backlog', 'todo', 'in_progress', 'testing', 'completed'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

function notBeforeToday(value) {
  if (!value) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (new Date(value) < today) throw new Error('Due date cannot be before today');
  return true;
}

const createTaskValidators = [
  body('projectId').isUUID().withMessage('A valid projectId is required'),
  body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
  body('description').optional({ nullable: true }).trim().isLength({ max: 5000 }),
  body('status').optional().isIn(STATUSES).withMessage(`Status must be one of: ${STATUSES.join(', ')}`),
  body('priority').optional().isIn(PRIORITIES).withMessage(`Priority must be one of: ${PRIORITIES.join(', ')}`),
  body('dueDate').optional({ nullable: true }).isISO8601().withMessage('dueDate must be a valid date').custom(notBeforeToday),
  body('estimatedHours').optional({ nullable: true }).isFloat({ gt: 0 }).withMessage('estimatedHours must be a positive number'),
  body('assignedTo').optional({ nullable: true }).isUUID().withMessage('assignedTo must be a valid user id'),
];

const updateTaskValidators = [
  param('taskId').isUUID().withMessage('Invalid task id'),
  body('title').optional().trim().isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
  body('description').optional({ nullable: true }).trim().isLength({ max: 5000 }),
  body('status').optional().isIn(STATUSES).withMessage(`Status must be one of: ${STATUSES.join(', ')}`),
  body('priority').optional().isIn(PRIORITIES).withMessage(`Priority must be one of: ${PRIORITIES.join(', ')}`),
  body('dueDate').optional({ nullable: true }).isISO8601().withMessage('dueDate must be a valid date').custom(notBeforeToday),
  body('estimatedHours').optional({ nullable: true }).isFloat({ gt: 0 }).withMessage('estimatedHours must be a positive number'),
  body('assignedTo').optional({ nullable: true }).isUUID().withMessage('assignedTo must be a valid user id'),
];

const taskIdValidators = [param('taskId').isUUID().withMessage('Invalid task id')];

const changeStatusValidators = [
  param('taskId').isUUID().withMessage('Invalid task id'),
  body('status').isIn(STATUSES).withMessage(`Status must be one of: ${STATUSES.join(', ')}`),
];

const changePositionValidators = [
  param('taskId').isUUID().withMessage('Invalid task id'),
  body('status').isIn(STATUSES).withMessage(`Status must be one of: ${STATUSES.join(', ')}`),
  body('position').isInt({ min: 0 }).withMessage('position must be a non-negative integer'),
];

const listTasksQueryValidators = [
  query('search').optional().trim().isLength({ max: 200 }),
  query('status').optional().isIn(STATUSES),
  query('priority').optional().isIn(PRIORITIES),
  query('projectId').optional().isUUID(),
  query('assignedTo').optional().isUUID(),
  query('labelId').optional().isUUID(),
  query('sort').optional().isIn(['newest', 'oldest', 'priority', 'deadline', 'alphabetical']),
  query('page').optional().isInt({ min: 1 }),
  query('pageSize').optional().isInt({ min: 1, max: 500 }),
];

const createCommentValidators = [
  param('taskId').isUUID().withMessage('Invalid task id'),
  body('comment').trim().isLength({ min: 1, max: 2000 }).withMessage('Comment must be 1-2000 characters'),
];

const updateCommentValidators = [
  param('taskId').isUUID().withMessage('Invalid task id'),
  param('commentId').isUUID().withMessage('Invalid comment id'),
  body('comment').trim().isLength({ min: 1, max: 2000 }).withMessage('Comment must be 1-2000 characters'),
];

const commentIdValidators = [
  param('taskId').isUUID().withMessage('Invalid task id'),
  param('commentId').isUUID().withMessage('Invalid comment id'),
];

const attachmentIdValidators = [
  param('taskId').isUUID().withMessage('Invalid task id'),
  param('attachmentId').isUUID().withMessage('Invalid attachment id'),
];

const attachLabelValidators = [
  param('taskId').isUUID().withMessage('Invalid task id'),
  body('labelId').isUUID().withMessage('A valid labelId is required'),
];

const detachLabelValidators = [
  param('taskId').isUUID().withMessage('Invalid task id'),
  param('labelId').isUUID().withMessage('Invalid label id'),
];

const createWorkspaceLabelValidators = [
  param('workspaceId').isUUID().withMessage('Invalid workspace id'),
  body('name').trim().isLength({ min: 1, max: 50 }).withMessage('Label name must be 1-50 characters'),
  body('color')
    .optional()
    .matches(/^#[0-9a-fA-F]{6}$/)
    .withMessage('color must be a hex value like #6E56CF'),
];

module.exports = {
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
  createWorkspaceLabelValidators,
};
