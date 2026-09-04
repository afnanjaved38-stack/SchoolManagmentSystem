const mongoose = require('mongoose');

const globalSessionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g., "Standard Days (Mon-Thu, Sat)", "Friday Schedule"
  days: [{ 
    type: String, 
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] 
  }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('GlobalSession', globalSessionSchema);
