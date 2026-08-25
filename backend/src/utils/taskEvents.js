const { EventEmitter } = require('events');

/**
 * Every task mutation emits here. Nothing listens yet — Checkpoint 6 adds
 * a Socket.IO layer that subscribes to these same event names ('created',
 * 'updated', 'deleted', 'status_changed') and broadcasts to the relevant
 * project/workspace room. Controllers never need to change when that
 * lands; they already emit through this single chokepoint.
 */
class TaskEvents extends EventEmitter {}

module.exports = new TaskEvents();
