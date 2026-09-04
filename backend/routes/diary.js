const express = require('express');
const router = express.Router();
const Diary = require('../models/Diary');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// @route   POST api/diary
// @desc    Post daily homework diary entry (Teachers & Admin)
router.post('/', auth, async (req, res) => {
  try {
    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ msg: 'Only faculty staff and admin can submit daily diary entries.' });
    }

    const { classId, sectionId, date, subject, homework, submissionDate, notes } = req.body;

    if (!classId || !sectionId || !subject || !homework?.trim()) {
      return res.status(400).json({ msg: 'Class, Section, Subject, and Homework text are required' });
    }

    let teacherId = req.user.teacherProfile || null;
    let postedByRole = req.user.role === 'admin' ? 'admin' : 'teacher';
    let postedByName = req.user.name || 'School Faculty';

    if (teacherId) {
      const teacherDoc = await Teacher.findById(teacherId);
      if (teacherDoc) postedByName = teacherDoc.fullName;
    } else if (req.user.role === 'admin') {
      postedByName = 'Principal / Administration';
    }

    const diaryDate = date ? new Date(date) : new Date();
    diaryDate.setUTCHours(0, 0, 0, 0);

    const diaryEntry = new Diary({
      class: classId,
      section: sectionId,
      teacher: teacherId,
      postedByRole,
      postedByName,
      date: diaryDate,
      subject: subject.trim(),
      homework: homework.trim(),
      submissionDate: submissionDate || 'Tomorrow',
      notes: notes?.trim() || ''
    });

    await diaryEntry.save();

    const populated = await Diary.findById(diaryEntry._id)
      .populate('class', 'name')
      .populate('section', 'name')
      .populate('teacher', 'fullName employeeId');

    res.json({
      msg: 'Daily diary entry posted successfully',
      diary: populated
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/diary
// @desc    Get daily diary entries for a class/section on a given date
router.get('/', auth, async (req, res) => {
  try {
    let { classId, sectionId, date, studentId } = req.query;

    const queryDate = date ? new Date(date) : new Date();
    queryDate.setUTCHours(0, 0, 0, 0);
    const nextDate = new Date(queryDate);
    nextDate.setDate(nextDate.getDate() + 1);

    let query = {
      date: { $gte: queryDate, $lt: nextDate }
    };

    if (req.user.role === 'student' || req.user.role === 'parent') {
      let targetStudentId = studentId || req.user.studentProfile;

      if (req.user.role === 'parent' && !studentId) {
        const userDoc = await User.findById(req.user.id);
        if (userDoc?.studentProfiles?.length > 0) {
          targetStudentId = userDoc.studentProfiles[0];
        }
      }

      if (!targetStudentId) {
        return res.status(400).json({ msg: 'No linked student found' });
      }

      const student = await Student.findById(targetStudentId);
      if (!student) return res.status(404).json({ msg: 'Student not found' });

      query.class = student.class;
      query.section = student.section;
    } else {
      if (classId) query.class = classId;
      if (sectionId) query.section = sectionId;
    }

    const entries = await Diary.find(query)
      .populate('class', 'name')
      .populate('section', 'name')
      .populate('teacher', 'fullName employeeId')
      .sort({ createdAt: -1 });

    res.json(entries);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/diary/:id
// @desc    Delete a diary entry
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!['teacher', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ msg: 'Unauthorized' });
    }

    await Diary.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Diary entry deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
