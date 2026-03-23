const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Location name is required'],
      trim: true,
    },
    zone: {
      type: String,
      required: [true, 'Zone is required'],
    },
    division: {
      type: String,
      required: [true, 'Division is required'],
    },
    workstationType: {
      type: String,
      required: [true, 'Workstation Type is required'], // Or ObjectId if linked to WorkstationType model string
    },
    active: {
      type: Boolean, 
      default: true,
    },
  },
  { timestamps: true }
);

// Compound index to avoid duplicates in the same division
locationSchema.index({ zone: 1, division: 1, workstationType: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Location', locationSchema);
