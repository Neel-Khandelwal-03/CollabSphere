const { Router } = require('express');
const authenticate = require('../middleware/authenticate');
const requireWorkspaceRole = require('../middleware/requireWorkspaceRole');
const loadConversation = require('../middleware/loadConversation');
const validate = require('../middleware/validate');
const chatController = require('../controllers/chat.controller');
const {
  startDirectValidators,
  listMessagesValidators,
  createMessageValidators,
  updateMessageValidators,
  messageIdValidators,
  markReadValidators,
} = require('../middleware/chatValidators');

const router = Router();

router.use(authenticate);

router.get('/direct', chatController.listDirectConversations);
router.post('/direct', startDirectValidators, validate, chatController.startDirectConversation);

router.get(
  '/conversations/:conversationId/messages',
  listMessagesValidators,
  validate,
  loadConversation,
  requireWorkspaceRole('viewer'),
  chatController.listMessages
);

router.post(
  '/conversations/:conversationId/messages',
  createMessageValidators,
  validate,
  loadConversation,
  requireWorkspaceRole('member'),
  chatController.createMessage
);

router.patch(
  '/conversations/:conversationId/messages/:messageId',
  updateMessageValidators,
  validate,
  loadConversation,
  requireWorkspaceRole('member'),
  chatController.updateMessage
);

router.delete(
  '/conversations/:conversationId/messages/:messageId',
  messageIdValidators,
  validate,
  loadConversation,
  requireWorkspaceRole('member'),
  chatController.deleteMessage
);

router.post(
  '/conversations/:conversationId/read',
  markReadValidators,
  validate,
  loadConversation,
  requireWorkspaceRole('viewer'),
  chatController.markRead
);

module.exports = router;
