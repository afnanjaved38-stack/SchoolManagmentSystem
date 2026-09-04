const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  submittedByRole: {
    type: String,
    enum: ['student', 'parent', 'teacher', 'admin'],
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teacher'
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  // If complaint is sent directly to a parent by Teacher or Principal
  targetRole: {
    type: String,
    enum: ['admin', 'parent'],
    default: 'admin'
  },
  category: {
    type: String,
    default: 'General'
  },
  customCategory: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Under Review', 'Resolved', 'Dismissed', 'Acknowledged'],
    default: 'Pending'
  },
  adminResponse: {
    type: String,
    default: ''
  },
  resolvedAt: {
    type: Date
  }
}, { timestamps: true });

complaintSchema.index({ student: 1 });
complaintSchema.index({ teacher: 1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ submittedByRole: 1 });
complaintSchema.index({ targetRole: 1 });
complaintSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Complaint', complaintSchema);
