// backend/models/Product.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const ProductSchema = new Schema({
  name: { type: String, required: true },
  emoji: { type: String },
  image: { type: String },
  description: { type: String },
  price: { type: Number, required: true },
  category: { type: String },
  badge: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', ProductSchema);
