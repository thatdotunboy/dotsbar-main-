// backend/config/database.js
require('dotenv').config();
const mongoose = require('mongoose');

let MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dotsbar';

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');
    return true;
  } catch (err) {
    console.error('❌ Initial MongoDB connection failed:', err.message);
    // Fallback to localhost if host resolution fails
    if (MONGODB_URI.includes('mongo') && !MONGODB_URI.includes('localhost')) {
      const fallbackUri = 'mongodb://localhost:27017/dotsbar';
      console.log('🔄 Attempting fallback MongoDB URI:', fallbackUri);
      try {
        await mongoose.connect(fallbackUri);
        console.log('✅ MongoDB connected via fallback');
        MONGODB_URI = fallbackUri;
        return true;
      } catch (fallbackErr) {
        console.error('❌ Fallback MongoDB connection error:', fallbackErr.message);
      }
    }
    console.warn('⚠️ Continuing without a MongoDB connection. Some features may be unavailable.');
    return false;
  }
};

module.exports = connectDB;
