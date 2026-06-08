// backend/models/Room.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const RoomSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  creatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  viewers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  chatMessages: [{
    username: String,
    message: String,
    timestamp: { type: Date, default: Date.now },
    userId: { type: Schema.Types.ObjectId, ref: 'User' }
  }],
  tipsTotal: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Room', RoomSchema);
