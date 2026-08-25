const { EventEmitter } = require('events');

/**
 * Mirrors taskEvents/issueEvents/messageEvents exactly. Controllers emit
 * here; utils/socket.js subscribes and broadcasts into the right room.
 * Reuses the existing bridge — no new WebSocket architecture, per the
 * checkpoint's explicit instruction.
 */
class FileEvents extends EventEmitter {}

module.exports = new FileEvents();
