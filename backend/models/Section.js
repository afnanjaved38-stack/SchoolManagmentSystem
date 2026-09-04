const mongoose = require('mongoose');

const periodSchema = new mongoose.Schema({
  title: { type: String }, // e.g., "Period 1", "Break"
  subject: { type: String, required: true }, // e.g., "Maths"
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
  startTime: { type: String, required: true }, // e.g., "08:00 AM"
  endTime: { type: String, required: true }    // e.g., "08:45 AM"
});

const scheduleSchema = new mongoose.Schema({
  name: { type: String, default: 'Standard' }, // e.g., "Regular", "Friday"
  days: [{ type: String }], // ["Monday", "Tuesday", etc.]
  periods: [periodSchema]
});

const sectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  classTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  schedules: [scheduleSchema],
  periods: [periodSchema] // Keep for backward compatibility/migration
}, { timestamps: true });

// Compound index for unique section name per class
sectionSchema.index({ name: 1, class: 1 }, { unique: true });

module.exports = mongoose.model('Section', sectionSchema);
