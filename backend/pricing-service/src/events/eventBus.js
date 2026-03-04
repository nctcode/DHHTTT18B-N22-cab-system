const EventEmitter = require('events');

class EventBus extends EventEmitter {
  constructor() {
    super();
    this._subscribers = new Map();
    console.log('[EventBus] Pricing EventBus initialized (In-Memory, Kafka-ready)');
  }

  publish(eventName, payload) {
    console.log(`[EventBus] Publishing: ${eventName}`, JSON.stringify(payload).substring(0, 200));
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

// Singleton
module.exports = new EventBus();
