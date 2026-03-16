const mongoose = require('mongoose');

const visitorLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  ip: String,
  path: String,
  method: String,
  userAgent: String,
  device: {
    browser: String,
    os: String,
    deviceType: String, // mobile, desktop, tablet
  },
  location: {
    city: String,
    region: String,
    country: String,
    coordinates: [Number], // [longitude, latitude]
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('VisitorLog', visitorLogSchema);
