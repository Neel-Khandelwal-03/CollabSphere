const { body, param } = require('express-validator');

const INVITABLE_ROLES = ['admin', 'member', 'viewer'];

const createWorkspaceValidators = [
  body('name').trim().isLength({ min: 2, max: 160 }).withMessage('Name must be 2-160 characters'),
  body('description').optional({ nullable: true }).trim().isLength({ max: 2000 }),
  body('logoUrl').optional({ nullable: true }).trim().isURL().withMessage('Logo must be a valid URL'),
];

const updateWorkspaceValidators = [
  param('workspaceId').isUUID().withMessage('Invalid workspace id'),
  body('name').optional().trim().isLength({ min: 2, max: 160 }),
  body('description').optional({ nullable: true }).trim().isLength({ max: 2000 }),
  body('logoUrl').optional({ nullable: true }).trim().isURL().withMessage('Logo must be a valid URL'),
];

const workspaceIdValidators = [param('workspaceId').isUUID().withMessage('Invalid workspace id')];

const inviteValidators = [
  param('workspaceId').isUUID().withMessage('Invalid workspace id'),
  body('email').trim().isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('role')
    .optional()
    .isIn(INVITABLE_ROLES)
    .withMessage(`Role must be one of: ${INVITABLE_ROLES.join(', ')}`),
];

const invitationTokenValidators = [param('token').notEmpty().withMessage('Invitation token is required')];

const updateMemberRoleValidators = [
  param('workspaceId').isUUID().withMessage('Invalid workspace id'),
  param('memberId').isUUID().withMessage('Invalid member id'),
  body('role')
    .isIn(INVITABLE_ROLES)
    .withMessage(`Role must be one of: ${INVITABLE_ROLES.join(', ')}`),
];

const memberIdValidators = [
  param('workspaceId').isUUID().withMessage('Invalid workspace id'),
  param('memberId').isUUID().withMessage('Invalid member id'),
];

module.exports = {
  createWorkspaceValidators,
  updateWorkspaceValidators,
  workspaceIdValidators,
  inviteValidators,
  invitationTokenValidators,
  updateMemberRoleValidators,
  memberIdValidators,
};
