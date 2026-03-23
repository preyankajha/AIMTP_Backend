const mongoose = require('mongoose');

const divisionSchema = new mongoose.Schema({
  name: { type: String, required: true }
});

const zoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true },
    divisions: [divisionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Zone', zoneSchema);
