const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  teacherStartTime: {
    type: String,
    default: '07:00'
  },
  teacherEndTime: {
    type: String,
    default: '10:00'
  },
  adminStartTime: {
    type: String,
    default: '00:00'
  },
  adminEndTime: {
    type: String,
    default: '23:59'
  },
  showFullFeeOnVoucher: {
    type: Boolean,
    default: true
  },
  showPreviousDuesOnVoucher: {
    type: Boolean,
    default: false
  },
  showTeacherPhoneToStudents: {
    type: Boolean,
    default: true
  },
  showTeacherPhoneToParents: {
    type: Boolean,
    default: true
  },
  showFeesOnStudentPortal: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Settings', SettingsSchema);
