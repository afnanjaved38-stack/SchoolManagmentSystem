const mongoose = require('mongoose');

const academicYearSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true 
  }, // e.g. "Academic Year 2025-26" or "2025-2026"
  startDate: { 
    type: Date, 
    required: true 
  }, // e.g. 2025-04-01 (April 1st) or 2025-08-01 (August 1st)
  endDate: { 
    type: Date, 
    required: true 
  }, // e.g. 2026-03-31 (March 31st) or 2026-07-31 (July 31st)
  isActive: { 
    type: Boolean, 
    default: false 
  }
}, { timestamps: true });

academicYearSchema.index({ isActive: 1 });
academicYearSchema.index({ startDate: 1 });

module.exports = mongoose.model('AcademicYear', academicYearSchema);
