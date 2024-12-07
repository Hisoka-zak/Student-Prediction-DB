const mongoose = require('mongoose');

const datasetSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  sem: { type: String, required: true },
  academicYear: { type: [String], required: true },
  columns: { type: [String], required: true },
  data: { type: [[mongoose.Schema.Types.Mixed]], required: true }, 
});

module.exports = mongoose.model('Dataset', datasetSchema);
