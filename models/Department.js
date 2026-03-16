const mongoose = require('mongoose');

const subDepartmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  designations: [{ type: String }],
});

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    subDepartments: [subDepartmentSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Department', departmentSchema);
