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
    currentWorkstation: {
      type: String,
      required: [true, 'Current Workstation is required'],
      trim: true,
    },
    currentLocation: {
      type: String,
      required: [true, 'Current Location is required'],
      trim: true,
    },
    currentStation: {
      type: String,
      default: '', // Making it optional for backward support
      trim: true,
    },
    desiredLocations: [
      {
        zone: { type: String, required: true },
        division: { type: String, required: true },
        workstation: { type: String, required: true },
        location: { type: String, required: true },
        station: { type: String, default: '' },
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
    workplaceRemark: {
      type: String,
      required: [true, 'Working condition remark is required'],
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['active', 'matched', 'cancelled', 'inactive', 'partner_found'],
      default: 'active',
    },
    statusRemark: {
      type: String,
      default: '',
      trim: true,
      maxlength: 300,
    },
    contactOptions: {
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, trim: true },
      whatsapp: { type: String, trim: true },
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
