const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Class = require('../models/Class');
const FeeRecord = require('../models/FeeRecord');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Drop old indexes if they exist (Fix for duplicate key errors on old fields)
const dropOldIndexes = async () => {
  try {
    await FeeRecord.collection.dropIndex('challanId_1');
  } catch (e) {}
  try {
    await FeeRecord.collection.dropIndex('challanNo_1');
  } catch (e) {}
};
dropOldIndexes();

// @route   POST api/finance/add
// Bulk add fee records for multiple students
router.post('/add', [auth, roleCheck('admin')], async (req, res) => {
  const { studentIds, type, month, amount: manualAmount, description } = req.body;
  
  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ msg: 'No students selected for billing' });
  }

  if (!type || !month) {
    return res.status(400).json({ msg: 'Charge type and month are required' });
  }

  try {
    const students = await Student.find({ _id: { $in: studentIds } }).populate('class');
    
    // Check for existing records to avoid duplicates
    const existingRecords = await FeeRecord.find({
      student: { $in: studentIds },
      type,
      month,
      description: description || (type === 'Monthly Fees' ? 'Monthly School Fee' : '')
    }).select('student');
    
    const existingStudentIds = new Set(existingRecords.map(r => r.student.toString()));
    const records = [];

    for (const student of students) {
      if (!student.class) {
        continue;
      }
      
      if (existingStudentIds.has(student._id.toString())) {
        continue;
      }

      let amount = manualAmount ? Number(manualAmount) : 0;
      let discount = 0;

      // If it's a standard fee type and no manual amount provided, pull from class
      if (!manualAmount && (['Monthly Fees', 'Monthly Fee', 'Tuition', 'tuition'].includes(type))) {
        const fees = (student.class && student.class.fees) ? student.class.fees : {};
        amount = fees.monthlyTuition || 0;
        discount = student.discount || 0;
      }

      const totalAmount = Math.max(0, amount - discount);

      // Clean description and enforce 2-word limit for Custom Charges
      let finalDescription = description;
      if (['Monthly Fees', 'Monthly Fee', 'Tuition', 'tuition'].includes(type)) {
        finalDescription = 'Monthly Fee';
      } else {
        // Truncate to 4 words if it's a manual charge (Increased for better description)
        const words = (description || 'Custom Charge').trim().split(/\s+/);
        finalDescription = words.slice(0, 4).join(' ');
      }

      records.push({
        student: student._id,
        type: (['Monthly Fees', 'Monthly Fee', 'Tuition', 'tuition'].includes(type)) ? 'Monthly Fees' : 'Other',
        month,
        amount,
        discount,
        description: finalDescription,
        totalAmount,
        paidAmount: 0,
        balance: totalAmount,
        status: 'Unpaid'
      });
    }

    if (records.length > 0) {
      await FeeRecord.insertMany(records, { ordered: false });
    }
    
    res.json({ 
      msg: `Success: ${records.length} new records added.`,
      skipped: students.length - records.length
    });
  } catch (err) {
    console.error('CRITICAL Finance Add Error:', err);
    res.status(500).json({ 
      msg: 'Server error while processing fees', 
      error: err.message 
    });
  }
});

// @route   GET api/finance/records
router.get('/records', [auth, roleCheck('admin')], async (req, res) => {
  try {
    const { type, month, status, search, classId } = req.query;
    let query = {};
    
    if (type) {
      if (type === 'Monthly Fees') {
        query.type = { $in: ['Monthly Fees', 'Monthly Fee', 'Tuition', 'tuition'] };
      } else if (type === 'Other') {
        query.type = { $nin: ['Monthly Fees', 'Monthly Fee', 'Tuition', 'tuition'] };
      } else {
        query.type = type;
      }
    }
    
    if (month && month !== 'Lifetime') query.month = month;
    if (status) query.status = status;

    if (search || classId) {
      let studentQuery = {};
      if (search) {
        studentQuery.$or = [
          { name: { $regex: search, $options: 'i' } },
          { regNo: { $regex: search, $options: 'i' } }
        ];
      }
      if (classId) {
        studentQuery.class = classId;
      }
      
      const students = await Student.find(studentQuery).select('_id');
      query.student = { $in: students.map(s => s._id) };
    }

    // Increased limit to 500 for better visibility in larger schools
    let records = await FeeRecord.find(query)
      .populate({
        path: 'student',
        select: 'name regNo gender discount fatherName class section',
        populate: [
          { path: 'class', select: 'name fees' },
          { path: 'section', select: 'name' }
        ]
      })
      .sort({ month: -1, createdAt: -1 })
      .limit(1000)
      .lean(); // Use lean for performance

    // Augment records with true student overall balance (arrears)
    const studentIds = [...new Set(records.map(r => r.student?._id).filter(Boolean))];
    const studentBalances = await FeeRecord.aggregate([
      { $match: { student: { $in: studentIds } } },
      { $group: { _id: "$student", totalBalance: { $sum: "$balance" } } }
    ]);

    const balanceMap = {};
    studentBalances.forEach(sb => {
      balanceMap[sb._id.toString()] = sb.totalBalance;
    });

    records = records.map(r => ({
      ...r,
      student: r.student ? {
        ...r.student,
        overallDues: balanceMap[r.student._id.toString()] || 0
      } : null
    }));

    res.json(records);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   PATCH api/finance/payment/remove/:recordId/:paymentId
// Reverse a specific payment from student history
router.patch('/payment/remove/:recordId/:paymentId', [auth, roleCheck('admin')], async (req, res) => {
  try {
    const record = await FeeRecord.findById(req.params.recordId);
    if (!record) return res.status(404).json({ msg: 'Fee record not found' });

    const payment = record.paymentHistory.id(req.params.paymentId);
    if (!payment) return res.status(404).json({ msg: 'Payment entry not found' });

    // Subtract the amount from paidAmount
    record.paidAmount -= payment.amount;
    
    // Remove the payment entry
    record.paymentHistory.pull(req.params.paymentId);
    
    // Safety check for paidAmount
    if (record.paidAmount < 0) record.paidAmount = 0;

    await record.save();
    res.json(record);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error during reversal' });
  }
});

// @route   GET api/finance/stats
router.get('/stats', auth, async (req, res) => {
  try {
    const { month } = req.query;
    let matchQuery = {};
    if (month && month !== 'Lifetime') matchQuery.month = month;

    // Use Aggregation for high-speed calculation
    const statsArray = await FeeRecord.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            $cond: [
              { $in: ["$type", ["Monthly Fees", "Monthly Fee", "Tuition", "tuition"]] },
              "Monthly Fees",
              "Other"
            ]
          },
          paid: { $sum: "$paidAmount" },
          balance: { $sum: { $subtract: ["$totalAmount", "$paidAmount"] } }
        }
      }
    ]);

    // Format for frontend
    const stats = {
      'Monthly Fees': { unpaid: 0, paid: 0 },
      'Other': { unpaid: 0, paid: 0 }
    };

    statsArray.forEach(item => {
      if (item._id) {
        stats[item._id] = {
          paid: Math.max(0, item.paid),
          unpaid: Math.max(0, item.balance)
        };
      }
    });

    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/finance/daily-collection
// Get total collection for a specific date (based on paymentHistory dates)
router.get('/daily-collection', [auth, roleCheck('admin')], async (req, res) => {
  try {
    const { date } = req.query; // YYYY-MM-DD
    if (!date) return res.status(400).json({ msg: 'Date is required' });

    // Use PKT (UTC+5) boundaries: the day in PKT starts at 19:00 UTC previous day
    const dayStart = new Date(date + 'T00:00:00+05:00');
    const dayEnd = new Date(date + 'T23:59:59.999+05:00');

    const result = await FeeRecord.aggregate([
      { $unwind: '$paymentHistory' },
      { $match: { 'paymentHistory.date': { $gte: dayStart, $lte: dayEnd } } },
      {
        $group: {
          _id: null,
          totalCollected: { $sum: '$paymentHistory.amount' },
          transactionCount: { $sum: 1 }
        }
      }
    ]);

    res.json({
      date,
      totalCollected: result[0]?.totalCollected || 0,
      transactionCount: result[0]?.transactionCount || 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   PATCH api/finance/pay/:id
router.patch('/pay/:id', [auth, roleCheck('admin')], async (req, res) => {
  const { amount, method } = req.body;
  
  try {
    const record = await FeeRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ msg: 'Record not found' });

    const payAmount = Number(amount) || record.balance;
    
    record.paidAmount += payAmount;
    record.paymentHistory.push({
      amount: payAmount,
      date: new Date(),
      method: method || 'Cash'
    });

    await record.save();
    res.json(record);
  } catch (err) {
    console.error('Payment Error:', err);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/finance/:id
router.delete('/:id', [auth, roleCheck('admin')], async (req, res) => {
  try {
    const record = await FeeRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ msg: 'Record not found' });

    // Prevent deletion of records that have received payments
    if (record.paidAmount > 0) {
      return res.status(400).json({ 
        msg: 'Cannot delete a record that has received payments. Please reverse payments first if you wish to delete it.' 
      });
    }

    await FeeRecord.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Unpaid charge record successfully deleted. Student dues have been updated.' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   PATCH api/finance/adjust/:id
// Adjust fee record (base amount, discount, concession/waiver, extra adjustment)
router.patch('/adjust/:id', [auth, roleCheck('admin')], async (req, res) => {
  const { amount, discount, concession, adjustment, waiverReason, description, type, month } = req.body;
  
  try {
    const record = await FeeRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ msg: 'Fee record not found' });

    if (amount !== undefined) record.amount = Number(amount) || 0;
    if (discount !== undefined) record.discount = Number(discount) || 0;
    if (concession !== undefined) record.concession = Number(concession) || 0;
    if (adjustment !== undefined) record.adjustment = Number(adjustment) || 0;
    if (waiverReason !== undefined) record.waiverReason = waiverReason.trim();
    if (description !== undefined) record.description = description.trim();
    if (type !== undefined) record.type = type;
    if (month !== undefined) record.month = month;

    await record.save();
    res.json({ msg: 'Fee record adjusted successfully', record });
  } catch (err) {
    console.error('Fee Adjustment Error:', err);
    res.status(500).json({ msg: 'Server error while adjusting fee record', error: err.message });
  }
});

// @route   PATCH api/finance/waive/:id
// 100% Waive remaining balance of a fee record
router.patch('/waive/:id', [auth, roleCheck('admin')], async (req, res) => {
  const { waiverReason } = req.body;

  try {
    const record = await FeeRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ msg: 'Fee record not found' });

    let currentBase = Number(record.amount);
    if (isNaN(currentBase) || (currentBase === 0 && Number(record.totalAmount) > 0 && !record.concession && !record.discount)) {
      currentBase = Number(record.totalAmount) || 0;
      record.amount = currentBase;
    }

    const currentAdj = Number(record.adjustment) || 0;
    const currentDisc = Number(record.discount) || 0;
    const paid = Number(record.paidAmount) || 0;

    // Remaining payable before waiver
    const remainingBeforeWaiver = Math.max(0, currentBase + currentAdj - currentDisc - (Number(record.concession) || 0) - paid);
    
    // Add remaining balance to concession so balance becomes 0
    record.concession = (Number(record.concession) || 0) + remainingBeforeWaiver;
    record.waiverReason = waiverReason?.trim() || 'Principal Full Fee Waiver';

    await record.save();
    res.json({ msg: 'Fee balance waived successfully', record });
  } catch (err) {
    console.error('Fee Waiver Error:', err);
    res.status(500).json({ msg: 'Server error while waiving fee', error: err.message });
  }
});

// @route   POST api/finance/single-charge
// Add a single custom fee or ledger entry for a specific student
router.post('/single-charge', [auth, roleCheck('admin')], async (req, res) => {
  const { studentId, type, month, amount, discount, concession, adjustment, description, waiverReason } = req.body;

  if (!studentId || !type || !month || amount === undefined) {
    return res.status(400).json({ msg: 'Student, Type, Month and Base Amount are required' });
  }

  try {
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ msg: 'Student not found' });

    const numAmount = Number(amount) || 0;
    const numDisc = Number(discount) || 0;
    const numConc = Number(concession) || 0;
    const numAdj = Number(adjustment) || 0;

    const totalAmount = Math.max(0, numAmount + numAdj - numDisc - numConc);

    const record = new FeeRecord({
      student: studentId,
      type,
      month,
      description: (description || (type === 'Monthly Fees' ? 'Monthly School Fee' : 'Custom Ledger Entry')).trim(),
      amount: numAmount,
      discount: numDisc,
      concession: numConc,
      adjustment: numAdj,
      waiverReason: (waiverReason || '').trim(),
      totalAmount,
      paidAmount: 0,
      balance: totalAmount,
      status: totalAmount === 0 && (numConc > 0 || numDisc > 0 || waiverReason) ? 'Waived' : 'Unpaid'
    });

    await record.save();
    res.json({ msg: 'Fee entry added to student ledger', record });
  } catch (err) {
    console.error('Single Charge Error:', err);
    res.status(500).json({ msg: 'Server error creating charge', error: err.message });
  }
});

// @route   GET api/finance/student/:id
router.get('/student/:id', [auth, roleCheck('admin')], async (req, res) => {
  try {
    const rawRecords = await FeeRecord.find({ student: req.params.id })
      .sort({ month: -1, createdAt: -1 });

    // Normalize records for legacy data consistency
    const records = rawRecords.map(r => {
      const doc = r.toObject();
      if (doc.paidAmount === undefined) doc.paidAmount = doc.status === 'Paid' ? doc.totalAmount : 0;
      
      // If balance is missing or logically incorrect (0 despite unpaid amount), recalculate
      if (doc.balance === undefined || (doc.balance === 0 && doc.paidAmount < doc.totalAmount && doc.status !== 'Waived')) {
        doc.balance = Math.max(0, doc.totalAmount - doc.paidAmount);
      }
      return doc;
    });

    res.json(records);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;
