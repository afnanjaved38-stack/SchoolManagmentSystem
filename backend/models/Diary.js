const mongoose = require('mongoose');

const diarySchema = new mongoose.Schema({
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
  date: {
    type: Date,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  homework: {
    type: String,
    required: true
  },
  submissionDate: {
    type: String,
    default: 'Tomorrow'
  },
  notes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

diarySchema.index({ class: 1, section: 1, date: -1 });
diarySchema.index({ date: -1 });

module.exports = mongoose.model('Diary', diarySchema);
