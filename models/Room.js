const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: { type: String },
  creatorId:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  viewers:     [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  chatMessages: [
    {
      username:  String,
      message:   String,
      timestamp: { type: Date, default: Date.now }
    }
  ],
  tipsTotal:   { type: Number, default: 0 },
  createdAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('Room', RoomSchema);
