const mongoose = require('mongoose');
const { Schema } = mongoose;

const AnnouncementSchema = new Schema({
  title: { type: String, required: true, trim: true },
  body: { type: String, required: true },
  author: { type: String, default: 'Unknown' },
  authorId: { type: Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Announcement', AnnouncementSchema);

