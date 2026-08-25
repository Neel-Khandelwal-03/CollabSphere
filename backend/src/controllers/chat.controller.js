const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const conversationService = require('../services/conversation.service');
const messageService = require('../services/message.service');
const workspaceMemberService = require('../services/workspaceMember.service');
const messageEvents = require('../utils/messageEvents');

const MANAGER_ROLES = ['owner', 'admin'];
const isManager = (role) => MANAGER_ROLES.includes(role);

// GET /api/workspaces/:workspaceId/chat — requireWorkspaceRole('viewer')
const getWorkspaceChat = asyncHandler(async (req, res) => {
  const conversation = await conversationService.getOrCreateWorkspaceConversation(req.params.workspaceId);
  const [messages, readStates] = await Promise.all([
    messageService.list(conversation.id, {}),
    messageService.getReadStatesForConversation(conversation.id),
  ]);
  res.json({ success: true, data: { conversation, messages, readStates } });
});

// GET /api/projects/:projectId/chat — requireWorkspaceRole('viewer') via loadProject
const getProjectChat = asyncHandler(async (req, res) => {
  const conversation = await conversationService.getOrCreateProjectConversation(
    req.params.projectId,
    req.params.workspaceId
  );
  const [messages, readStates] = await Promise.all([
    messageService.list(conversation.id, {}),
    messageService.getReadStatesForConversation(conversation.id),
  ]);
  res.json({ success: true, data: { conversation, messages, readStates } });
});

// GET /api/chat/direct — every DM conversation the current user is part of
const listDirectConversations = asyncHandler(async (req, res) => {
  const conversations = await conversationService.listDirectForUser(req.user.id);
  const unread = await messageService.unreadCountsForUser(req.user.id, conversations.map((c) => c.id));
  res.json({
    success: true,
    data: { conversations: conversations.map((c) => ({ ...c, unread_count: unread[c.id] || 0 })) },
  });
});

// POST /api/chat/direct — body: { workspaceId, userId }
const startDirectConversation = asyncHandler(async (req, res) => {
  const { workspaceId, userId } = req.body;

  if (userId === req.user.id) {
    throw ApiError.badRequest('You cannot start a direct conversation with yourself');
  }

  const [requesterMembership, targetMembership] = await Promise.all([
    workspaceMemberService.findMemberByUserId(workspaceId, req.user.id),
    workspaceMemberService.findMemberByUserId(workspaceId, userId),
  ]);
  if (!requesterMembership) throw ApiError.forbidden('You are not a member of this workspace');
  if (!targetMembership) throw ApiError.badRequest('That user is not a member of this workspace');

  const conversation = await conversationService.getOrCreateDirectConversation(
    workspaceId,
    req.user.id,
    userId
  );
  const [messages, readStates] = await Promise.all([
    messageService.list(conversation.id, {}),
    messageService.getReadStatesForConversation(conversation.id),
  ]);
  res.status(201).json({ success: true, data: { conversation, messages, readStates } });
});

const listMessages = asyncHandler(async (req, res) => {
  const before = req.query.before;
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
  const messages = await messageService.list(req.params.conversationId, { before, limit });
  res.json({ success: true, data: { messages } });
});

const createMessage = asyncHandler(async (req, res) => {
  const message = await messageService.create(req.params.conversationId, req.user.id, req.body.content);
  messageEvents.emit('created', { conversation: req.conversation, message });
  res.status(201).json({ success: true, data: { message } });
});

const updateMessage = asyncHandler(async (req, res) => {
  const existing = await messageService.findById(req.params.messageId);
  if (!existing || existing.conversation_id !== req.params.conversationId) {
    throw ApiError.notFound('Message not found');
  }
  if (existing.sender_id !== req.user.id) {
    throw ApiError.forbidden('You can only edit your own messages');
  }

  const message = await messageService.update(req.params.messageId, req.body.content);
  messageEvents.emit('updated', { conversation: req.conversation, message });
  res.json({ success: true, data: { message } });
});

const deleteMessage = asyncHandler(async (req, res) => {
  const existing = await messageService.findById(req.params.messageId);
  if (!existing || existing.conversation_id !== req.params.conversationId) {
    throw ApiError.notFound('Message not found');
  }

  const isAuthor = existing.sender_id === req.user.id;
  const canModerate = req.conversation.type !== 'direct' && isManager(req.workspaceRole);
  if (!isAuthor && !canModerate) {
    throw ApiError.forbidden('You can only delete your own messages');
  }

  await messageService.remove(req.params.messageId);
  messageEvents.emit('deleted', { conversation: req.conversation, messageId: req.params.messageId });
  res.json({ success: true, message: 'Message deleted' });
});

const markRead = asyncHandler(async (req, res) => {
  const { messageId } = req.body;
  const message = await messageService.findById(messageId);
  if (!message || message.conversation_id !== req.params.conversationId) {
    throw ApiError.badRequest('messageId does not belong to this conversation');
  }

  await messageService.markRead(req.params.conversationId, req.user.id, messageId);
  messageEvents.emit('read', {
    conversation: req.conversation,
    userId: req.user.id,
    messageId,
  });
  res.json({ success: true, message: 'Marked as read' });
});

module.exports = {
  getWorkspaceChat,
  getProjectChat,
  listDirectConversations,
  startDirectConversation,
  listMessages,
  createMessage,
  updateMessage,
  deleteMessage,
  markRead,
};
