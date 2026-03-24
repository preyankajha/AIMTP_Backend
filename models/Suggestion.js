const mongoose = require('mongoose');

const suggestionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['Zone', 'Division', 'WorkstationType', 'Location', 'Department', 'SubDepartment', 'Designation'],
    required: true
  },
  details: {
    zone: String,
    division: String,
    workstationType: String,
    department: String,
    subDepartment: String,
    name: String, // The suggested value
    description: String
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminRemark: String
}, { timestamps: true });

module.exports = mongoose.model('Suggestion', suggestionSchema);
