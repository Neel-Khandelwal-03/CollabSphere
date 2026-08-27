const { EventEmitter } = require('events');

/** Mirrors taskEvents/issueEvents/messageEvents/fileEvents/notificationEvents exactly. */
class ActivityEvents extends EventEmitter {}

module.exports = new ActivityEvents();
