const mongoose = require('mongoose');

const subjectResultSchema = new mongoose.Schema({
  subjectName: {
    type: String,
    required: true
  },
  totalMarks: {
    type: Number,
    required: true,
    default: 100
  },
  passingMarks: {
    type: Number,
    default: 40
  },
  obtainedMarks: {
    type: Number,
    required: true,
    default: 0
  },
  grade: {
    type: String,
    default: 'A'
  },
  remarks: {
    type: String,
    default: ''
  }
}, { _id: false });

const examResultSchema = new mongoose.Schema({
  examTerm: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ExamTerm',
    required: true
  },
  academicYear: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AcademicYear',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
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
  subjects: [subjectResultSchema],
  grandTotal: {
    type: Number,
    default: 0
  },
  totalObtained: {
    type: Number,
    default: 0
  },
  percentage: {
    type: Number,
    default: 0
  },
  overallGrade: {
    type: String,
    default: 'A'
  },
  status: {
    type: String,
    enum: ['Pass', 'Fail', 'Promoted', 'Under Review'],
    default: 'Pass'
  },
  position: {
    type: String,
    default: ''
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  generalRemarks: {
    type: String,
    default: ''
  }
}, { timestamps: true });

examResultSchema.index({ examTerm: 1, student: 1 }, { unique: true });
examResultSchema.index({ class: 1, section: 1, examTerm: 1 });

module.exports = mongoose.model('ExamResult', examResultSchema);
