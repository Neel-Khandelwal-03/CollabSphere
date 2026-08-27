const { Server } = require('socket.io');
const { verifyAccessToken } = require('./jwt');
const db = require('../config/db');
const taskEvents = require('./taskEvents');
const issueEvents = require('./issueEvents');
const messageEvents = require('./messageEvents');
const fileEvents = require('./fileEvents');
const notificationEvents = require('./notificationEvents');
const activityEvents = require('./activityEvents');

// userId -> Set<socketId>. In-memory by design: presence is inherently
// transient (doesn't need to survive a server restart, unlike messages
// or read receipts, which are persisted). A user can have multiple
// sockets (multiple tabs/devices); they only go "offline" once the last
// one disconnects.
const onlineSockets = new Map();

function workspaceRoom(workspaceId) {
  return `workspace:${workspaceId}`;
}
function conversationRoom(conversationId) {
  return `conversation:${conversationId}`;
}
function userRoom(userId) {
  return `user:${userId}`;
}

async function getUserWorkspaceIds(userId) {
  const { rows } = await db.query('SELECT workspace_id FROM workspace_members WHERE user_id = $1', [
    userId,
  ]);
  return rows.map((r) => r.workspace_id);
}

async function getConversationRouting(conversationId) {
  const { rows } = await db.query(
    'SELECT id, type, workspace_id FROM conversations WHERE id = $1',
    [conversationId]
  );
  return rows[0] || null;
}

/**
 * Workspace-type conversations broadcast into the auto-joined
 * workspace:<id> room (everyone in the workspace already receives task/
 * issue/presence events there, so workspace chat "just works" too).
 * Project and direct conversations broadcast into a dedicated
 * conversation:<id> room instead, which a client only joins once it
 * actually opens that panel — keeping room membership proportional to
 * what's actually being viewed rather than joining every project/DM a
 * user could ever open on every connection.
 */
function roomForConversation(conversation) {
  return conversation.type === 'workspace'
    ? workspaceRoom(conversation.workspace_id)
    : conversationRoom(conversation.id);
}

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true },
  });

  // Auth handshake: reuses the exact same access-token verification as
  // every REST route, so there's no parallel auth mechanism to keep in
  // sync. A socket with an invalid/expired token is rejected before
  // 'connection' ever fires.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Unauthorized'));
    try {
      const payload = verifyAccessToken(token);
      socket.userId = payload.sub;
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const { userId } = socket;

    if (!onlineSockets.has(userId)) onlineSockets.set(userId, new Set());
    const sockets = onlineSockets.get(userId);
    const wasOffline = sockets.size === 0;
    sockets.add(socket.id);

    // A personal room, distinct from every workspace/conversation room —
    // notifications are targeted to exactly one person regardless of
    // which workspace or chat they're currently looking at, which none
    // of the existing rooms provide on their own.
    socket.join(userRoom(userId));

    let workspaceIds = [];
    try {
      workspaceIds = await getUserWorkspaceIds(userId);
    } catch (err) {
      console.error('Failed to resolve workspace memberships for socket connection:', err.message);
    }
    workspaceIds.forEach((id) => socket.join(workspaceRoom(id)));

    // Tell the newly-connected client who's already online in their
    // workspaces, and tell everyone else (if this was their first socket)
    // that this user just came online.
    const snapshot = {};
    workspaceIds.forEach((id) => {
      snapshot[id] = [...onlineSockets.entries()]
        .filter(([, s]) => s.size > 0)
        .map(([uid]) => uid);
    });
    socket.emit('presence:snapshot', snapshot);

    if (wasOffline) {
      workspaceIds.forEach((id) => socket.to(workspaceRoom(id)).emit('presence:update', { workspaceId: id, userId, online: true }));
    }

    // Explicit join for project/direct conversations — validated the
    // same way the equivalent REST routes are (workspace membership via
    // requireWorkspaceRole's underlying check, or DM participancy),
    // rather than trusting the client to only ask for rooms it's
    // entitled to.
    socket.on('join:conversation', async (conversationId, ack) => {
      try {
        const conversation = await getConversationRouting(conversationId);
        if (!conversation) return ack?.({ ok: false, error: 'Conversation not found' });

        if (conversation.type === 'direct') {
          const { rows } = await db.query(
            'SELECT 1 FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
            [conversationId, userId]
          );
          if (rows.length === 0) return ack?.({ ok: false, error: 'Not a participant' });
        } else {
          const { rows } = await db.query(
            'SELECT 1 FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
            [conversation.workspace_id, userId]
          );
          if (rows.length === 0) return ack?.({ ok: false, error: 'Not a workspace member' });
        }

        socket.join(roomForConversation(conversation));
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: 'Failed to join conversation' });
      }
    });

    socket.on('leave:conversation', (conversationId) => {
      socket.leave(conversationRoom(conversationId));
    });

    socket.on('typing:start', async (conversationId) => relayTyping(socket, conversationId, true));
    socket.on('typing:stop', async (conversationId) => relayTyping(socket, conversationId, false));

    async function relayTyping(socket, conversationId, isTyping) {
      const conversation = await getConversationRouting(conversationId);
      if (!conversation) return;
      const { rows } = await db.query('SELECT name FROM users WHERE id = $1', [userId]);
      socket.to(roomForConversation(conversation)).emit('typing:update', {
        conversationId,
        userId,
        userName: rows[0]?.name,
        isTyping,
      });
    }

    socket.on('disconnect', () => {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        onlineSockets.delete(userId);
        workspaceIds.forEach((id) => io.to(workspaceRoom(id)).emit('presence:update', { workspaceId: id, userId, online: false }));
      }
    });
  });

  // ---- Bridge existing, already-emitting domain events into broadcasts ----
  // taskEvents/issueEvents have been emitting since Checkpoints 4 and 5
  // specifically so this step would be a pure subscribe, no controller
  // changes required.

  taskEvents.on('created', ({ task }) => io.to(workspaceRoom(task.workspace_id)).emit('task:created', task));
  taskEvents.on('updated', ({ task }) => io.to(workspaceRoom(task.workspace_id)).emit('task:updated', task));
  taskEvents.on('deleted', ({ taskId, projectId, workspaceId }) =>
    io.to(workspaceRoom(workspaceId)).emit('task:deleted', { taskId, projectId })
  );
  taskEvents.on('status_changed', ({ task }) => io.to(workspaceRoom(task.workspace_id)).emit('task:status_changed', task));

  issueEvents.on('created', ({ issue }) => io.to(workspaceRoom(issue.workspace_id)).emit('issue:created', issue));
  issueEvents.on('updated', ({ issue }) => io.to(workspaceRoom(issue.workspace_id)).emit('issue:updated', issue));
  issueEvents.on('closed', ({ issue }) => io.to(workspaceRoom(issue.workspace_id)).emit('issue:closed', issue));
  issueEvents.on('deleted', ({ issueId, projectId, workspaceId }) =>
    io.to(workspaceRoom(workspaceId)).emit('issue:deleted', { issueId, projectId })
  );

  messageEvents.on('created', ({ conversation, message }) =>
    io.to(roomForConversation(conversation)).emit('message:new', { conversationId: conversation.id, message })
  );
  messageEvents.on('updated', ({ conversation, message }) =>
    io.to(roomForConversation(conversation)).emit('message:updated', { conversationId: conversation.id, message })
  );
  messageEvents.on('deleted', ({ conversation, messageId }) =>
    io.to(roomForConversation(conversation)).emit('message:deleted', { conversationId: conversation.id, messageId })
  );
  messageEvents.on('read', ({ conversation, userId: readerId, messageId }) =>
    io.to(roomForConversation(conversation)).emit('read:update', { conversationId: conversation.id, userId: readerId, messageId })
  );
  messageEvents.on('conversationDeleted', ({ conversationId, workspaceId, type }) => {
    const room = type === 'workspace' ? workspaceRoom(workspaceId) : conversationRoom(conversationId);
    io.to(room).emit('conversation:deleted', { conversationId });
  });

  // Emitted since Checkpoint 7 but never actually bridged — file
  // upload/delete never broadcast in real time until now.
  fileEvents.on('uploaded', ({ file }) =>
    io.to(workspaceRoom(file.workspace_id)).emit('file:uploaded', { file })
  );
  fileEvents.on('deleted', ({ fileId, workspaceId }) =>
    io.to(workspaceRoom(workspaceId)).emit('file:deleted', { fileId })
  );

  // Notifications broadcast to the recipient's personal room only —
  // never a workspace/conversation room, since a notification is
  // inherently 1:1, not something every workspace member should see.
  notificationEvents.on('created', (notification) =>
    io.to(userRoom(notification.user_id)).emit('notification:new', notification)
  );

  // Activity broadcasts workspace-wide (see activityLog.service.js's
  // log() for why there's no separate project-room concept).
  activityEvents.on('created', (activity) =>
    io.to(workspaceRoom(activity.workspaceId)).emit('activity:new', activity)
  );

  return io;
}

module.exports = { initSocket };
