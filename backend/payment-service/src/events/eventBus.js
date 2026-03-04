const EventEmitter = require('events');

class EventBus extends EventEmitter {
  constructor() {
    super();
    console.log('EventBus initialized (In-Memory)');
  }

  publish(eventName, payload) {
    console.log(`[EventBus] Publishing: ${eventName}`, payload);
    this.emit(eventName, payload);
  }

  subscribe(eventName, handler) {
    console.log(`[EventBus] Subscribing to: ${eventName}`);
    this.on(eventName, async (payload) => {
      try {
        await handler(payload);
      } catch (error) {
        console.error(`[EventBus] Error handling ${eventName}:`, error);
      }
    });
  }
}

module.exports = new EventBus();
