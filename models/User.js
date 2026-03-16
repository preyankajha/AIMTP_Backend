const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    mobile: {
      type: String,
      required: [true, 'Mobile number is required'],
      match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit mobile number'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ['employee', 'admin'],
      default: 'employee',
    },
    profileImage: {
      type: String,
      default: '',
    },
    // Working Profile
    sector: { type: String, default: '' },
    department: { type: String, default: '' },
    subDepartment: { type: String, default: '' },
    designation: { type: String, default: '' },
    currentZone: { type: String, default: '' },
    currentDivision: { type: String, default: '' },
    currentStation: { type: String, default: '' },
    payLevel: { type: String, default: '' },
    gradePay: { type: String, default: '' },
    basicPay: { type: String, default: '' },
    category: { type: String, default: '' },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('passwordHash')) return;
  const salt = await bcrypt.genSalt(12);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
});

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
