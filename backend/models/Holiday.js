const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true,
    trim: true 
  }, // e.g. "Summer Vacations 2026", "Rain Emergency Holiday", "Eid-ul-Fitr"
  type: { 
    type: String, 
    enum: ['Public Holiday', 'Summer Vacation', 'Winter Vacation', 'Emergency Holiday', 'Local Holiday', 'School Closure', 'Other'],
    default: 'Public Holiday'
  },
  startDate: { 
    type: Date, 
    required: true 
  },
  endDate: { 
    type: Date, 
    required: true 
  },
  description: { 
    type: String, 
    default: '' 
  },
  appliesTo: { 
    type: String, 
    enum: ['All', 'Students', 'Faculty'],
    default: 'All'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

holidaySchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('Holiday', holidaySchema);
