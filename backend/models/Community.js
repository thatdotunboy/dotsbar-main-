const mongoose = require('mongoose');
const { Schema } = mongoose;

// NOTE: current app uses Firestore as primary store.
// This mongoose model exists for compatibility with legacy code paths.
// Community MVP should be implemented in Firestore (backend/firestore-service.js + backend/server.js).
const CommunitySchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  logoUrl: { type: String },
  bannerUrl: { type: String },
  category: { type: String, default: 'general' },
  privacy: { type: String, enum: ['public', 'private', 'invite_only'], default: 'public' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Community', CommunitySchema);

