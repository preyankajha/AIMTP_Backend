const mongoose = require('mongoose');

const workstationTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Workstation Type name is required'],
      unique: true,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WorkstationType', workstationTypeSchema);
