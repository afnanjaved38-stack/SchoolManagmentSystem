const mongoose = require('mongoose');

const studentTestResultSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  obtainedMarks: {
    type: Number,
    required: true,
    default: 0
  },
  remarks: {
    type: String,
    default: ''
  }
}, { _id: false });

const classTestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  }, // e.g. "Chapter 4 Test: Cell Structure"
  subject: {
    type: String,
    required: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  section: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher'
  },
  postedByName: {
    type: String,
    default: 'Class Teacher'
  },
  date: {
    type: Date,
    default: Date.now
  },
  totalMarks: {
    type: Number,
    required: true,
    default: 20
  },
  results: [studentTestResultSchema]
}, { timestamps: true });

classTestSchema.index({ class: 1, section: 1, date: -1 });

module.exports = mongoose.model('ClassTest', classTestSchema);
