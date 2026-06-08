const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title:      { type: String, required: true },
  host:       { type: String },
  hostId:     { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  category:   { type: String, default: "general" },
  datetime:   { type: Date, required: true },
  type:       { type: String, enum: ["Free","Ticketed"], default: "Free" },
  price:      { type: Number, default: 0 },
  viewers:    { type: Number, default: 0 },
  live:       { type: Boolean, default: false },
  createdAt:  { type: Date, default: Date.now }
});

module.exports = mongoose.model('Event', EventSchema);
