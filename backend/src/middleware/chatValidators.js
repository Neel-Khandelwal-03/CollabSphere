const { body, param, query } = require('express-validator');

const workspaceIdValidators = [param('workspaceId').isUUID().withMessage('Invalid workspace id')];
const projectIdValidators = [param('projectId').isUUID().withMessage('Invalid project id')];
const conversationIdValidators = [param('conversationId').isUUID().withMessage('Invalid conversation id')];

const startDirectValidators = [
  body('workspaceId').isUUID().withMessage('A valid workspaceId is required'),
  body('userId').isUUID().withMessage('A valid userId is required'),
];

const listMessagesValidators = [
  param('conversationId').isUUID().withMessage('Invalid conversation id'),
  query('before').optional().isUUID().withMessage('before must be a valid message id'),
  query('limit').optional().isInt({ min: 1, max: 100 }),
];

const createMessageValidators = [
  param('conversationId').isUUID().withMessage('Invalid conversation id'),
  body('content').trim().isLength({ min: 1, max: 4000 }).withMessage('Message must be 1-4000 characters'),
];

const updateMessageValidators = [
  param('conversationId').isUUID().withMessage('Invalid conversation id'),
  param('messageId').isUUID().withMessage('Invalid message id'),
  body('content').trim().isLength({ min: 1, max: 4000 }).withMessage('Message must be 1-4000 characters'),
];

const messageIdValidators = [
  param('conversationId').isUUID().withMessage('Invalid conversation id'),
  param('messageId').isUUID().withMessage('Invalid message id'),
];

const markReadValidators = [
  param('conversationId').isUUID().withMessage('Invalid conversation id'),
  body('messageId').isUUID().withMessage('A valid messageId is required'),
];

module.exports = {
  workspaceIdValidators,
  projectIdValidators,
  conversationIdValidators,
  startDirectValidators,
  listMessagesValidators,
  createMessageValidators,
  updateMessageValidators,
  messageIdValidators,
  markReadValidators,
};
