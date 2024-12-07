// models/Course.js
const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
    name: String,
    code: String,
    assessments: {
        type: [
            {
                assessment: { type: String },
                mark: { type: Number }
            }
        ],
    }
});

module.exports = mongoose.model('Course', CourseSchema);
