const express = require('express');
const router = express.Router();
const Assignment = require('../models/Assignment');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// @route   POST api/assignments
// @desc    Create an assignment / study resource (Teachers & Admin)
router.post('/', auth, async (req, res) => {
  try {
    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ msg: 'Unauthorized' });
    }

    const { classId, sectionId, title, subject, content, dueDate } = req.body;

    if (!classId || !sectionId || !title?.trim() || !subject?.trim() || !content?.trim()) {
      return res.status(400).json({ msg: 'Class, Section, Title, Subject, and Content are required' });
    }

    let teacherId = req.user.teacherProfile || null;
    let postedByRole = req.user.role === 'admin' ? 'admin' : 'teacher';
    let postedByName = req.user.name || 'Faculty Staff';

    if (teacherId) {
      const teacherDoc = await Teacher.findById(teacherId);
      if (teacherDoc) postedByName = teacherDoc.fullName;
    } else if (req.user.role === 'admin') {
      postedByName = 'Principal / Administration';
    }

    const assignment = new Assignment({
      class: classId,
      section: sectionId,
      teacher: teacherId,
      postedByRole,
      postedByName,
      title: title.trim(),
      subject: subject.trim(),
      content: content.trim(),
      dueDate: dueDate || ''
    });

    await assignment.save();

    const populated = await Assignment.findById(assignment._id)
      .populate('class', 'name')
      .populate('section', 'name')
      .populate('teacher', 'fullName employeeId');

    res.json({
      msg: 'Assignment / Study resource published successfully',
      assignment: populated
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/assignments
// @desc    Get assignments for a class/section
router.get('/', auth, async (req, res) => {
  try {
    let { classId, sectionId, studentId } = req.query;
    let query = {};

    if (req.user.role === 'student' || req.user.role === 'parent') {
      let targetStudentId = studentId || req.user.studentProfile;
      if (req.user.role === 'parent' && !studentId) {
        const userDoc = await User.findById(req.user.id);
        if (userDoc?.studentProfiles?.length > 0) {
          targetStudentId = userDoc.studentProfiles[0];
        }
      }

      const student = await Student.findById(targetStudentId);
      if (!student) return res.status(404).json({ msg: 'Student not found' });

      query.class = student.class;
      query.section = student.section;
    } else {
      if (classId) query.class = classId;
      if (sectionId) query.section = sectionId;
    }

    const assignments = await Assignment.find(query)
      .populate('class', 'name')
      .populate('section', 'name')
      .populate('teacher', 'fullName employeeId')
      .sort({ createdAt: -1 });

    res.json(assignments);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/assignments/:id
// @desc    Delete an assignment
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ msg: 'Unauthorized' });
    }

    await Assignment.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Assignment deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
