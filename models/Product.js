const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name:  { type: String, required: true },
  emoji: { type: String },
  image: { type: String },
  desc:  { type: String },
  price: { type: Number, required: true },
  cat:   { type: String },
  badge: { type: String }
});

module.exports = mongoose.model('Product', ProductSchema);
