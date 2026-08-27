const { EventEmitter } = require('events');

/**
 * Mirrors taskEvents/issueEvents/messageEvents/fileEvents exactly.
 * notification.service.js doesn't emit directly — controllers create
 * the notification via the service, then emit here, so a caller that
 * wants a notification persisted without necessarily broadcasting it
 * (unlikely in practice, but keeps the same separation of concerns as
 * every other *Events module) still can.
 */
class NotificationEvents extends EventEmitter {}

module.exports = new NotificationEvents();
