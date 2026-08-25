const { body, param, query } = require('express-validator');

const TYPES = [
  'bug', 'feature_request', 'improvement', 'task', 'research',
  'epic', 'documentation', 'performance', 'security', 'technical_debt',
];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const SEVERITIES = ['minor', 'major', 'critical', 'blocker'];
const STATUSES = ['open', 'in_progress', 'resolved', 'closed', 'reopened'];

const createIssueValidators = [
  body('projectId').isUUID().withMessage('A valid projectId is required'),
  body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
  body('description').optional({ nullable: true }).trim().isLength({ max: 5000 }),
  body('type').optional().isIn(TYPES).withMessage(`type must be one of: ${TYPES.join(', ')}`),
  body('priority').optional().isIn(PRIORITIES).withMessage(`priority must be one of: ${PRIORITIES.join(', ')}`),
  body('severity').optional().isIn(SEVERITIES).withMessage(`severity must be one of: ${SEVERITIES.join(', ')}`),
  body('assigneeId').optional({ nullable: true }).isUUID(),
  body('linkedTaskId').optional({ nullable: true }).isUUID(),
];

const updateIssueValidators = [
  param('issueId').isUUID().withMessage('Invalid issue id'),
  body('title').optional().trim().isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
  body('description').optional({ nullable: true }).trim().isLength({ max: 5000 }),
  body('type').optional().isIn(TYPES).withMessage(`type must be one of: ${TYPES.join(', ')}`),
];

const issueIdValidators = [param('issueId').isUUID().withMessage('Invalid issue id')];

const changeStatusValidators = [
  param('issueId').isUUID().withMessage('Invalid issue id'),
  body('status').isIn(STATUSES).withMessage(`status must be one of: ${STATUSES.join(', ')}`),
];

const changePriorityValidators = [
  param('issueId').isUUID().withMessage('Invalid issue id'),
  body('priority').isIn(PRIORITIES).withMessage(`priority must be one of: ${PRIORITIES.join(', ')}`),
];

const changeSeverityValidators = [
  param('issueId').isUUID().withMessage('Invalid issue id'),
  body('severity').isIn(SEVERITIES).withMessage(`severity must be one of: ${SEVERITIES.join(', ')}`),
];

const changeAssigneeValidators = [
  param('issueId').isUUID().withMessage('Invalid issue id'),
  body('assigneeId').optional({ nullable: true }).isUUID().withMessage('assigneeId must be a valid user id'),
];

const linkTaskValidators = [
  param('issueId').isUUID().withMessage('Invalid issue id'),
  body('linkedTaskId').optional({ nullable: true }).isUUID().withMessage('linkedTaskId must be a valid task id'),
];

const listIssuesQueryValidators = [
  query('search').optional().trim().isLength({ max: 200 }),
  query('status').optional().isIn(STATUSES),
  query('priority').optional().isIn(PRIORITIES),
  query('severity').optional().isIn(SEVERITIES),
  query('type').optional().isIn(TYPES),
  query('projectId').optional().isUUID(),
  query('assignedTo').optional().isUUID(),
  query('reporterId').optional().isUUID(),
  query('linkedTaskId').optional(),
  query('createdAfter').optional().isISO8601(),
  query('createdBefore').optional().isISO8601(),
  query('updatedAfter').optional().isISO8601(),
  query('updatedBefore').optional().isISO8601(),
  query('sort').optional().isIn(['newest', 'oldest', 'priority', 'severity', 'status', 'alphabetical']),
  query('page').optional().isInt({ min: 1 }),
  query('pageSize').optional().isInt({ min: 1, max: 500 }),
];

const createCommentValidators = [
  param('issueId').isUUID().withMessage('Invalid issue id'),
  body('comment').trim().isLength({ min: 1, max: 2000 }).withMessage('Comment must be 1-2000 characters'),
];

const updateCommentValidators = [
  param('issueId').isUUID().withMessage('Invalid issue id'),
  param('commentId').isUUID().withMessage('Invalid comment id'),
  body('comment').trim().isLength({ min: 1, max: 2000 }).withMessage('Comment must be 1-2000 characters'),
];

const commentIdValidators = [
  param('issueId').isUUID().withMessage('Invalid issue id'),
  param('commentId').isUUID().withMessage('Invalid comment id'),
];

const attachLabelValidators = [
  param('issueId').isUUID().withMessage('Invalid issue id'),
  body('labelId').isUUID().withMessage('A valid labelId is required'),
];

const detachLabelValidators = [
  param('issueId').isUUID().withMessage('Invalid issue id'),
  param('labelId').isUUID().withMessage('Invalid label id'),
];

const attachmentIdValidators = [
  param('issueId').isUUID().withMessage('Invalid issue id'),
  param('attachmentId').isUUID().withMessage('Invalid attachment id'),
];

module.exports = {
  createIssueValidators,
  updateIssueValidators,
  issueIdValidators,
  changeStatusValidators,
  changePriorityValidators,
  changeSeverityValidators,
  changeAssigneeValidators,
  linkTaskValidators,
  listIssuesQueryValidators,
  createCommentValidators,
  updateCommentValidators,
  commentIdValidators,
  attachLabelValidators,
  detachLabelValidators,
  attachmentIdValidators,
};
