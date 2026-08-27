const { param, query } = require('express-validator');

const entityActivityValidators = [
  param('entityType').isIn(['task', 'issue', 'project', 'workspace']).withMessage('Unsupported entityType'),
  param('entityId').isUUID().withMessage('Invalid entity id'),
];

const activityQueryValidators = [
  query('actorId').optional().isUUID(),
  query('entityType').optional().trim(),
  query('category').optional().isIn(['tasks', 'issues', 'projects', 'members', 'files', 'system']),
  query('createdAfter').optional().isISO8601(),
  query('createdBefore').optional().isISO8601(),
  query('cursor').optional().isUUID(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

module.exports = { entityActivityValidators, activityQueryValidators };
