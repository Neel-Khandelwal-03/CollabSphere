const { EventEmitter } = require('events');

/**
 * Mirrors utils/taskEvents.js and utils/issueEvents.js exactly. Chat
 * controllers never touch the Socket.IO `io` instance directly — they
 * emit domain events here, and utils/socket.js (the one place that owns
 * `io`) subscribes to broadcast them into the right room. Keeps
 * controllers testable over plain HTTP without a live socket connection,
 * and keeps all real-time broadcast/room logic in one place.
 */
class MessageEvents extends EventEmitter {}

module.exports = new MessageEvents();
