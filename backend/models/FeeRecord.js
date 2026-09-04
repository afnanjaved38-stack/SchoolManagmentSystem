const mongoose = require('mongoose');

const feeRecordSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  type: { type: String, enum: ['Monthly Fees', 'Other', 'Tuition', 'Misc', 'Exam', 'Admission'], required: true },
  month: { type: String, required: true }, // Format "YYYY-MM"
  description: { type: String, default: '' },
  amount: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  concession: { type: Number, default: 0 },
  adjustment: { type: Number, default: 0 },
  waiverReason: { type: String, default: '' },
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  status: { type: String, enum: ['Unpaid', 'Partial', 'Paid', 'Waived'], default: 'Unpaid' },
  paymentHistory: [{
    amount: Number,
    date: { type: Date, default: Date.now },
    method: { type: String, default: 'Cash' }
  }],
  paymentDate: { type: Date }
}, { timestamps: true });

// Performance Indexes
feeRecordSchema.index({ student: 1 });
feeRecordSchema.index({ month: 1 });
feeRecordSchema.index({ status: 1 });
feeRecordSchema.index({ type: 1 });
feeRecordSchema.index({ student: 1, month: 1 }); // Common lookup for student monthly fees

// Auto-calculate balance & status before saving
feeRecordSchema.pre('save', function(next) {
  let base = Number(this.amount);
  if (isNaN(base) || (base === 0 && Number(this.totalAmount) > 0 && !this.concession && !this.discount && !this.adjustment)) {
    base = Number(this.totalAmount) || 0;
    this.amount = base;
  }
  
  const disc = Number(this.discount) || 0;
  const conc = Number(this.concession) || 0;
  const adj = Number(this.adjustment) || 0;
  
  this.totalAmount = Math.max(0, base + adj - disc - conc);
  this.balance = Math.max(0, this.totalAmount - (Number(this.paidAmount) || 0));
  
  if (this.balance === 0) {
    if (this.totalAmount === 0 && (conc > 0 || disc > 0 || this.waiverReason || this.status === 'Waived')) {
      this.status = 'Waived';
    } else {
      this.status = 'Paid';
      if (!this.paymentDate) this.paymentDate = new Date();
    }
  } else if (Number(this.paidAmount) > 0) {
    this.status = 'Partial';
  } else {
    this.status = 'Unpaid';
  }
  next();
});

module.exports = mongoose.model('FeeRecord', feeRecordSchema);
