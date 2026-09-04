const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  name: { type: String, required: true },
  fees: {
    admissionFee: { type: Number, default: 0 },
    monthlyTuition: { type: Number, default: 0 },
    examFee: { type: Number, default: 0 },
    miscCharges: { type: Number, default: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Class', classSchema);
