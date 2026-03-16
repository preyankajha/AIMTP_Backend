const mongoose = require('mongoose');

const selectionModeSchema = new mongoose.Schema({
  value: { type: String, required: true, unique: true },
  label: { type: String, required: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('SelectionMode', selectionModeSchema);
