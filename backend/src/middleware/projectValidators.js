const { body, param, query } = require('express-validator');

const STATUSES = ['planning', 'active', 'on_hold', 'completed'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

function notBeforeToday(value) {
  if (!value) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(value);
  if (deadline < today) {
    throw new Error('Deadline cannot be before today');
  }
  return true;
}

const createProjectValidators = [
  body('workspaceId').isUUID().withMessage('A valid workspaceId is required'),
  body('name').trim().isLength({ min: 3, max: 100 }).withMessage('Name must be 3-100 characters'),
  body('description').optional({ nullable: true }).trim().isLength({ max: 1000 }),
  body('status').optional().isIn(STATUSES).withMessage(`Status must be one of: ${STATUSES.join(', ')}`),
  body('priority').optional().isIn(PRIORITIES).withMessage(`Priority must be one of: ${PRIORITIES.join(', ')}`),
  body('startDate').optional({ nullable: true }).isISO8601().withMessage('startDate must be a valid date'),
  body('deadline')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('deadline must be a valid date')
    .custom(notBeforeToday),
];

const updateProjectValidators = [
  param('projectId').isUUID().withMessage('Invalid project id'),
  body('name').optional().trim().isLength({ min: 3, max: 100 }).withMessage('Name must be 3-100 characters'),
  body('description').optional({ nullable: true }).trim().isLength({ max: 1000 }),
  body('status').optional().isIn(STATUSES).withMessage(`Status must be one of: ${STATUSES.join(', ')}`),
  body('priority').optional().isIn(PRIORITIES).withMessage(`Priority must be one of: ${PRIORITIES.join(', ')}`),
  body('startDate').optional({ nullable: true }).isISO8601().withMessage('startDate must be a valid date'),
  body('deadline')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('deadline must be a valid date')
    .custom(notBeforeToday),
];

const projectIdValidators = [param('projectId').isUUID().withMessage('Invalid project id')];

const addProjectMemberValidators = [
  param('projectId').isUUID().withMessage('Invalid project id'),
  body('userId').isUUID().withMessage('A valid userId is required'),
];

const removeProjectMemberValidators = [
  param('projectId').isUUID().withMessage('Invalid project id'),
  param('memberId').isUUID().withMessage('Invalid member id'),
];

const listProjectsQueryValidators = [
  query('search').optional().trim().isLength({ max: 200 }),
  query('status').optional().isIn(STATUSES).withMessage(`Status must be one of: ${STATUSES.join(', ')}`),
  query('priority').optional().isIn(PRIORITIES).withMessage(`Priority must be one of: ${PRIORITIES.join(', ')}`),
  query('archived').optional().isIn(['true', 'false', 'all']),
  query('sort').optional().isIn(['newest', 'oldest', 'deadline', 'alphabetical']),
];

module.exports = {
  createProjectValidators,
  updateProjectValidators,
  projectIdValidators,
  addProjectMemberValidators,
  removeProjectMemberValidators,
  listProjectsQueryValidators,
};
