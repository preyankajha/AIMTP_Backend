const mongoose = require('mongoose');

const sectorSchema = new mongoose.Schema({
  group: { type: String, required: true },
  options: [{
    value: { type: String, required: true },
    label: { type: String, required: true },
    active: { type: Boolean, default: false }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Sector', sectorSchema);
