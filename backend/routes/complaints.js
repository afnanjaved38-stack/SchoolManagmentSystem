const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// @route   POST api/complaints
// @desc    Submit a complaint (Student/Parent/Teacher to Principal OR Teacher/Principal to Parent)
router.post('/', auth, async (req, res) => {
  try {
    const { category, customCategory, description, targetRole, studentId } = req.body;

    if (!description?.trim()) {
      return res.status(400).json({ msg: 'Description is required' });
    }

    const isDirectToParent = targetRole === 'parent';

    let complaintData = {
      submittedByRole: req.user.role,
      user: req.user.id,
      description: description.trim(),
      status: 'Pending'
    };

    if (isDirectToParent) {
      // Direct Shikayat to Parent from Teacher or Admin
      if (!['teacher', 'admin'].includes(req.user.role)) {
        return res.status(403).json({ msg: 'Only Teachers or Principal can send notices to Parents' });
      }
      if (!studentId) {
        return res.status(400).json({ msg: 'Please select a student to send this complaint to their parent' });
      }

      complaintData.targetRole = 'parent';
      complaintData.student = studentId;
      complaintData.category = 'Parent Shikayat / Behavioral Notice';
      if (req.user.role === 'teacher' && req.user.teacherProfile) {
        complaintData.teacher = req.user.teacherProfile;
      }
    } else {
      // Grievance to Principal
      complaintData.targetRole = 'admin';

      if (['student', 'parent'].includes(req.user.role)) {
        if (!req.user.studentProfile) {
          return res.status(400).json({ msg: 'No linked student profile found for your account' });
        }
        complaintData.student = req.user.studentProfile;
        complaintData.category = category === 'Other' && customCategory?.trim() ? `Other: ${customCategory.trim()}` : (category || 'General Issue');
        complaintData.customCategory = customCategory?.trim() || '';
      } else if (req.user.role === 'teacher') {
        if (req.user.teacherProfile) {
          complaintData.teacher = req.user.teacherProfile;
        }
        complaintData.category = category === 'Other' && customCategory?.trim() ? `Other: ${customCategory.trim()}` : (category || 'General Faculty Issue');
        complaintData.customCategory = customCategory?.trim() || '';
      } else {
        return res.status(400).json({ msg: 'Invalid grievance submission' });
      }
    }

    const complaint = new Complaint(complaintData);
    await complaint.save();

    const populated = await Complaint.findById(complaint._id)
      .populate({
        path: 'student',
        select: 'name regNo fatherName phone class section',
        populate: [
          { path: 'class', select: 'name' },
          { path: 'section', select: 'name' }
        ]
      })
      .populate('teacher', 'fullName employeeId phone')
      .populate('user', 'name email role');

    res.json({
      msg: isDirectToParent 
        ? 'Notice successfully forwarded to student parent portal.' 
        : 'Complaint submitted successfully to the Principal.',
      complaint: populated
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/complaints/my
// @desc    Get complaints relevant to current user (Student, Parent, Teacher)
router.get('/my', auth, async (req, res) => {
  try {
    const role = req.user.role;
    let query = {};

    if (role === 'student') {
      query = {
        student: req.user.studentProfile,
        submittedByRole: 'student',
        targetRole: 'admin'
      };
    } else if (role === 'parent') {
      // Parent sees:
      // 1. Complaints submitted BY parent to admin
      // 2. Notices / Shikayat sent TO parent about their student by Teacher/Admin
      query = {
        student: req.user.studentProfile,
        $or: [
          { submittedByRole: 'parent', targetRole: 'admin' },
          { targetRole: 'parent' }
        ]
      };
    } else if (role === 'teacher') {
      // Teacher sees:
      // 1. Complaints submitted BY teacher to admin
      // 2. Shikayat sent BY this teacher to parents
      query = {
        $or: [
          { user: req.user.id },
          { teacher: req.user.teacherProfile }
        ]
      };
    } else {
      return res.status(403).json({ msg: 'Access restricted' });
    }

    const complaints = await Complaint.find(query)
      .populate({
        path: 'student',
        select: 'name regNo fatherName phone class section',
        populate: [
          { path: 'class', select: 'name' },
          { path: 'section', select: 'name' }
        ]
      })
      .populate('teacher', 'fullName employeeId')
      .populate('user', 'name email role')
      .sort({ createdAt: -1 });

    res.json(complaints);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/complaints
// @desc    Get all complaints (Admin only) with filtering
router.get('/', [auth, roleCheck('admin')], async (req, res) => {
  try {
    const { role, status, category, target } = req.query;
    let query = {};

    if (role && role !== 'all') {
      query.submittedByRole = role;
    }

    if (target && target !== 'all') {
      query.targetRole = target;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (category && category !== 'all') {
      query.category = { $regex: new RegExp(category, 'i') };
    }

    const complaints = await Complaint.find(query)
      .populate({
        path: 'student',
        select: 'name regNo fatherName phone class section status',
        populate: [
          { path: 'class', select: 'name' },
          { path: 'section', select: 'name' }
        ]
      })
      .populate('teacher', 'fullName employeeId phone')
      .populate('user', 'name email role')
      .sort({ createdAt: -1 });

    res.json(complaints);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/complaints/:id/status
// @desc    Update complaint status & principal remarks
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status, adminResponse } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ msg: 'Complaint not found' });

    // Admin can update any status
    // Parent can acknowledge a notice sent to them
    if (req.user.role === 'parent' && complaint.targetRole === 'parent') {
      complaint.status = 'Acknowledged';
    } else if (req.user.role === 'admin') {
      if (status && ['Pending', 'Under Review', 'Resolved', 'Dismissed', 'Acknowledged'].includes(status)) {
        complaint.status = status;
      }
      if (adminResponse !== undefined) {
        complaint.adminResponse = adminResponse;
      }
      if (status === 'Resolved') {
        complaint.resolvedAt = new Date();
      }
    } else {
      return res.status(403).json({ msg: 'Unauthorized to update this complaint status' });
    }

    await complaint.save();

    const updated = await Complaint.findById(complaint._id)
      .populate({
        path: 'student',
        select: 'name regNo fatherName phone class section',
        populate: [
          { path: 'class', select: 'name' },
          { path: 'section', select: 'name' }
        ]
      })
      .populate('teacher', 'fullName employeeId phone')
      .populate('user', 'name email role');

    res.json({
      msg: 'Complaint status updated successfully',
      complaint: updated
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
