const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  vendorId: { type: String, required: true },
  eventType: { type: String, required: true },
  metadata: Object,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Event', EventSchema);
