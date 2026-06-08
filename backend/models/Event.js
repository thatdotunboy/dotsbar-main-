// backend/models/Event.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const EventSchema = new Schema({
  title: { type: String, required: true },
  host: { type: String, required: true },
  hostId: { type: Schema.Types.ObjectId, ref: 'User' },
  category: { type: String, default: 'general' },
  datetime: { type: Date, default: Date.now },
  type: { type: String, default: 'Free' },
  price: { type: Number, default: 0 },
  viewers: { type: Number, default: 0 },
  live: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Event', EventSchema);
