const mongoose = require('mongoose');

let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

async function connectToDatabase() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dotsbar';
    if (!process.env.MONGODB_URI) {
      console.warn('MONGODB_URI is not set. Falling back to local MongoDB at', uri);
    }
    const opts = { useNewUrlParser: true, useUnifiedTopology: true };
    cached.promise = mongoose
      .connect(uri, opts)
      .then(m => m);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = { connectToDatabase };
