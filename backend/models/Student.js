const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  regNo: { type: String, required: true, unique: true },
  admissionDate: { type: Date, default: Date.now },
  name: { type: String, required: true },
  fatherName: { type: String, required: true },
  dob: { type: Date, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  phone: { type: String, required: true },
  bForm: { type: String },
  fatherCnic: { type: String },
  cast: { type: String },
  religion: { type: String },
  address: { type: String },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  status: { 
    type: String, 
    enum: ['Active', 'Inactive', 'Expelled', 'Passed Out', 'Deleted'], 
    default: 'Active' 
  },
  discount: { type: Number, default: 0 },
  admissionFeePaid: { type: Boolean, default: false },
  academicHistory: [{
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
    yearName: { type: String },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
    className: { type: String },
    section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
    sectionName: { type: String },
    status: { type: String, enum: ['Promoted', 'Retained', 'Enrolled'], default: 'Promoted' },
    date: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// Performance Indexes
studentSchema.index({ class: 1 });
studentSchema.index({ section: 1 });
studentSchema.index({ status: 1 });
studentSchema.index({ name: 1 }); // Quick search by name
studentSchema.index({ regNo: 1 });

module.exports = mongoose.model('Student', studentSchema);
