const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const NotificationSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4()
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  eventType: {
    type: String,
    required: true,
    index: true
  },
  channel: {
    type: String,
    enum: ['EMAIL', 'SMS', 'PUSH', 'IN_APP'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'SENT', 'FAILED', 'RETRYING'],
    default: 'PENDING',
    index: true
  },
  idempotencyKey: {
    type: String,
    unique: true,
    sparse: true
  },
  retryCount: {
    type: Number,
    default: 0
  },
  metadata: {
    type: Object,
    default: null
  },
  sentAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', NotificationSchema);
