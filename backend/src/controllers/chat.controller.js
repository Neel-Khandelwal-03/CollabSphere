const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const conversationService = require('../services/conversation.service');
const messageService = require('../services/message.service');
const workspaceMemberService = require('../services/workspaceMember.service');
const fileService = require('../services/file.service');
const { uploadBuffer } = require('../utils/cloudinary');
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

// POST /api/chat/conversations/:conversationId/files — multipart/form-data.
// Uploads to Cloudinary, records it in the same general-purpose `files`
// table Workspace/Project Files use (so a file shared in chat also shows
// up there — no duplicate storage), then creates a message referencing
// it via file_id and broadcasts through the *same* messageEvents bridge
// plain text messages already use. No new Socket.IO event type, no new
// WebSocket code — 'message:new' already carries whatever the message
// row contains, which now optionally includes file fields.
const createFileMessage = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('No file provided');

  const folder = `collabsphere/workspaces/${req.conversation.workspace_id}/chat`;
  const result = await uploadBuffer(req.file.buffer, { folder, filename: req.file.originalname });

  const file = await fileService.create({
    workspaceId: req.conversation.workspace_id,
    projectId: req.conversation.project_id || null,
    uploadedBy: req.user.id,
    originalName: req.file.originalname,
    publicId: result.public_id,
    fileUrl: result.url,
    secureUrl: result.secure_url,
    resourceType: result.resource_type,
    mimeType: req.file.mimetype,
    fileSize: req.file.size,
    folder,
  });

  // Caption is optional; falls back to the filename so the message never
  // renders with empty body text.
  const message = await messageService.create(
    req.params.conversationId,
    req.user.id,
    req.body.content || req.file.originalname,
    file.id
  );

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

// DELETE /api/chat/conversations/:conversationId — gated by loadConversation
// (which already restricts direct conversations to their two participants)
// + requireWorkspaceRole('member') as the floor. For workspace/project
// (group) chats, deleting wipes it for everyone in that space, so that
// additionally requires Owner/Admin — a direct message has no such
// concept, so either participant may delete it, matching how deleting a
// thread works in most DM-based apps. Relies entirely on the existing
// ON DELETE CASCADE (migration 006) to remove participants and messages;
// no schema change needed.
const deleteConversation = asyncHandler(async (req, res) => {
  const { conversation } = req;
  if (conversation.type !== 'direct' && !isManager(req.workspaceRole)) {
    throw ApiError.forbidden('Only workspace owners and admins can delete this chat');
  }

  await conversationService.remove(conversation.id);
  messageEvents.emit('conversationDeleted', {
    conversationId: conversation.id,
    workspaceId: conversation.workspace_id,
    type: conversation.type,
  });
  res.json({ success: true, message: 'Conversation deleted' });
});

module.exports = {
  getWorkspaceChat,
  getProjectChat,
  listDirectConversations,
  startDirectConversation,
  listMessages,
  createMessage,
  createFileMessage,
  updateMessage,
  deleteMessage,
  markRead,
  deleteConversation,
};
