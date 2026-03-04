const EventEmitter = require('events');

class EventBus extends EventEmitter {
  constructor() {
    super();
    console.log('[EventBus] Notification EventBus initialized (In-Memory, Kafka-ready)');
  }

  publish(eventName, payload) {
    console.log(`[EventBus] Publishing: ${eventName}`);
    this.emit(eventName, payload);
  }

  subscribe(eventName, handler) {
    console.log(`[EventBus] Subscribing to: ${eventName}`);
    this.on(eventName, async (payload) => {
      try {
        await handler(payload);
      } catch (error) {
        console.error(`[EventBus] Error handling ${eventName}:`, error.message);
      }
    });
  }
}

module.exports = new EventBus();
