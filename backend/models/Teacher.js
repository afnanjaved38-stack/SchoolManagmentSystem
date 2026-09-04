const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  qualifications: [String],
  subjects: [String],
  status: { 
    type: String, 
    enum: ['Active', 'Inactive', 'Resigned', 'On Leave', 'Suspended', 'Terminated'], 
    default: 'Active' 
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Performance Indexes
teacherSchema.index({ status: 1 });
teacherSchema.index({ fullName: 1 });

module.exports = mongoose.model('Teacher', teacherSchema);
