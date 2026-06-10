const mongoose = require('mongoose');
const { Schema } = mongoose;

// NOTE: Firestore is primary for MVP.
const CommunityInviteSchema = new Schema({
  communityId: { type: String, required: true },
  token: { type: String, required: true, unique: true },
  role: { type: String, enum: ['owner', 'administrator', 'moderator', 'member'], default: 'member' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  expiresAt: { type: Date },
  usedAt: { type: Date }
});

module.exports = mongoose.model('CommunityInvite', CommunityInviteSchema);

