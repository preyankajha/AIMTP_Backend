const mongoose = require('mongoose');

const payLevelSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  sortOrder: { type: Number, default: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('PayLevel', payLevelSchema);
