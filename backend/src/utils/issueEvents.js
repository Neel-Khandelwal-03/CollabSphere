const { EventEmitter } = require('events');

/**
 * Mirrors utils/taskEvents.js exactly. Every issue mutation emits here;
 * nothing listens yet. Checkpoint 6 subscribes Socket.IO to 'created',
 * 'updated', 'closed', 'comment_added' and broadcasts to the relevant
 * project/workspace room — controllers won't need to change.
 */
class IssueEvents extends EventEmitter {}

module.exports = new IssueEvents();
