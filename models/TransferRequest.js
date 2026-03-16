const mongoose = require('mongoose');

const transferRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sector: {
      type: String,
      default: 'Railway',
      trim: true,
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
    },
    subDepartment: {
      type: String,
      required: [true, 'Sub-department is required'],
      trim: true,
    },
    designation: {
      type: String,
      required: [true, 'Designation is required'],
      trim: true,
    },
    modeOfSelection: {
      type: String,
      required: [true, 'Mode of selection is required'],
      trim: true,
    },
    currentZone: {
      type: String,
      required: [true, 'Current Zone is required'],
      trim: true,
    },
    currentDivision: {
      type: String,
      required: [true, 'Current Division is required'],
      trim: true,
    },
    currentStation: {
      type: String,
      required: [true, 'Current Station is required'],
      trim: true,
      uppercase: true,
    },
    desiredLocations: [
      {
        zone: { type: String, required: true },
        division: { type: String, required: true },
        station: { type: String, required: true },
        priority: { type: Number, default: 1 }
      }
    ],
    basicPay: {
      type: Number,
      required: [true, 'Basic Pay is required'],
      min: [18000, 'Basic Pay cannot be below 18000'],
    },
    payLevel: {
      type: String,
      default: '',
    },
    gradePay: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: ['General', 'SC', 'ST', 'OBC', 'EWS'],
    },
    status: {
      type: String,
      enum: ['active', 'matched', 'cancelled'],
      default: 'active',
    },
  },
  { timestamps: true }
);

// Indexes for fast matching queries
transferRequestSchema.index({ currentStation: 1 });
transferRequestSchema.index({ desiredStation: 1 });
transferRequestSchema.index({ userId: 1 });
transferRequestSchema.index({ currentStation: 1, desiredStation: 1 });

module.exports = mongoose.model('TransferRequest', transferRequestSchema);
