const mongoose = require('mongoose');

const examTermSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  }, // e.g. "Mid Term Examinations 2025-26"
  academicYear: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicYear',
    required: true
  },
  termType: {
    type: String,
    enum: ['First Term', 'Mid Term', 'Final Term', 'Monthly Assessment', 'Annual'],
    default: 'Mid Term'
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  isPublished: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

examTermSchema.index({ academicYear: 1, termType: 1 });

module.exports = mongoose.model('ExamTerm', examTermSchema);
