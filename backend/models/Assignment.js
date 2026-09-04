const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
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
  postedByRole: {
    type: String,
    enum: ['admin', 'teacher'],
    default: 'teacher'
  },
  postedByName: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  dueDate: {
    type: String,
    default: ''
  }
}, { timestamps: true });

assignmentSchema.index({ class: 1, section: 1, createdAt: -1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
