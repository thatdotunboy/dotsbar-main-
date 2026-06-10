const mongoose = require('mongoose');
const { Schema } = mongoose;

// NOTE: Firestore is primary for MVP.
const CommunityMemberSchema = new Schema({
  communityId: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['owner', 'administrator', 'moderator', 'member'], default: 'member' },
  joinedAt: { type: Date, default: Date.now },
  banned: { type: Boolean, default: false }
});

module.exports = mongoose.model('CommunityMember', CommunityMemberSchema);

