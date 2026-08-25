const db = require('../config/db');
const ApiError = require('../utils/ApiError');
const conversationService = require('../services/conversation.service');

/**
 * Loads the conversation referenced by :conversationId, attaches it to
 * req.conversation, and sets req.params.workspaceId — same pattern as
 * loadTask.js/loadIssue.js, so every chat route can chain into the
 * existing requireWorkspaceRole middleware unchanged.
 *
 * For type='direct' conversations, workspace membership alone isn't the
 * right boundary — a DM is private to its two participants even though
 * both must also share a workspace. This additionally requires the
 * requester to be one of those two participants; requireWorkspaceRole
 * still runs afterward to enforce the same "Viewer never writes" rule
 * chat's other two conversation types already follow.
 */
async function loadConversation(req, res, next) {
  try {
    const { rows } = await db.query('SELECT * FROM conversations WHERE id = $1', [
      req.params.conversationId,
    ]);
    const conversation = rows[0];
    if (!conversation) return next(ApiError.notFound('Conversation not found'));

    if (conversation.type === 'direct') {
      const participant = await conversationService.isParticipant(conversation.id, req.user.id);
      if (!participant) return next(ApiError.forbidden('You are not part of this conversation'));
    }

    req.conversation = conversation;
    req.params.workspaceId = conversation.workspace_id;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = loadConversation;
