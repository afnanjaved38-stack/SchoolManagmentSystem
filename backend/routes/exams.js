const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ExamTerm = require('../models/ExamTerm');
const ExamResult = require('../models/ExamResult');
const ClassTest = require('../models/ClassTest');
const AcademicYear = require('../models/AcademicYear');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const User = require('../models/User');

// Helper to compute grade from percentage
const calculateGrade = (pct) => {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  if (pct >= 40) return 'E';
  return 'F';
};

// Helper for automatic academic remarks
const getAutoRemark = (pct, isPassed) => {
  if (!isPassed || pct < 40) return 'Needs Serious Improvement';
  if (pct >= 85) return 'Outstanding Performance';
  if (pct >= 75) return 'Very Good Progress';
  if (pct >= 60) return 'Good Effort';
  if (pct >= 50) return 'Satisfactory';
  return 'Fair / Needs Work';
};

// ==========================================
// 1. EXAM TERMS (Admin / Teacher / All)
// ==========================================

// GET /api/exams/terms
router.get('/terms', auth, async (req, res) => {
  try {
    let filter = {};
    if (req.query.academicYearId) {
      filter.academicYear = req.query.academicYearId;
    }
    const terms = await ExamTerm.find(filter)
      .populate('academicYear')
      .sort({ createdAt: -1 });
    res.json(terms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error fetching exam terms' });
  }
});

// POST /api/exams/terms (Admin Only)
router.post('/terms', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Unauthorized: Only administration can create exam terms' });
    }
    const { name, termType, startDate, endDate, academicYearId } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ msg: 'Exam term title is required' });
    }

    let yearId = academicYearId;
    if (!yearId) {
      let activeYear = await AcademicYear.findOne({ isActive: true });
      if (!activeYear) {
        activeYear = await AcademicYear.findOne().sort({ createdAt: -1 });
      }
      if (!activeYear) {
        activeYear = new AcademicYear({
          name: 'Academic Year 2026-27',
          startDate: new Date('2026-04-01'),
          endDate: new Date('2027-03-31'),
          isActive: true
        });
        await activeYear.save();
      }
      yearId = activeYear._id;
    }

    const term = new ExamTerm({
      name: name.trim(),
      academicYear: yearId,
      termType: termType || 'Mid Term',
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    });

    await term.save();
    res.json({ msg: 'Exam term registered successfully', term });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error creating exam term' });
  }
});

// DELETE /api/exams/terms/:id (Admin Only)
router.delete('/terms/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Unauthorized' });
    }
    await ExamTerm.findByIdAndDelete(req.params.id);
    await ExamResult.deleteMany({ examTerm: req.params.id });
    res.json({ msg: 'Exam term and associated results deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error deleting exam term' });
  }
});

// ==========================================
// 2. EXAM RESULTS & MARKSHEETS
// ==========================================

// GET /api/exams/results?classId=...&sectionId=...&examTermId=...
router.get('/results', auth, async (req, res) => {
  try {
    const { classId, sectionId, examTermId } = req.query;
    let filter = {};
    if (classId) filter.class = classId;
    if (sectionId) filter.section = sectionId;
    if (examTermId) filter.examTerm = examTermId;

    const results = await ExamResult.find(filter)
      .populate('student', 'name regNo fatherName rollNo')
      .populate('class', 'name')
      .populate('section', 'name')
      .populate('examTerm', 'name termType startDate endDate')
      .populate('academicYear', 'name startDate endDate')
      .sort({ percentage: -1 });

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error fetching exam results' });
  }
});

// POST /api/exams/results/batch (Admin or Teacher)
// Saves array of marks per student, recalculates percentage, rank & positions
router.post('/results/batch', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ msg: 'Unauthorized' });
    }

    const { examTermId, classId, sectionId, studentResults } = req.body;
    if (!examTermId || !classId || !sectionId || !Array.isArray(studentResults)) {
      return res.status(400).json({ msg: 'Exam term, class, section, and studentResults array are required' });
    }

    const term = await ExamTerm.findById(examTermId);
    if (!term) return res.status(404).json({ msg: 'Exam term not found' });

    for (const item of studentResults) {
      const { studentId, subjects, generalRemarks } = item;
      if (!studentId || !Array.isArray(subjects)) continue;

      let grandTotal = 0;
      let totalObtained = 0;
      let hasSubjectFailed = false;

      const formattedSubjects = subjects.map(sub => {
        const tMarks = Number(sub.totalMarks) || 100;
        const pMarks = Number(sub.passingMarks) || 40;
        const oMarks = Number(sub.obtainedMarks) || 0;
        grandTotal += tMarks;
        totalObtained += oMarks;
        const pct = tMarks > 0 ? (oMarks / tMarks) * 100 : 0;
        const subPassed = oMarks >= pMarks;
        if (!subPassed) hasSubjectFailed = true;

        return {
          subjectName: sub.subjectName || 'Subject',
          totalMarks: tMarks,
          passingMarks: pMarks,
          obtainedMarks: oMarks,
          grade: subPassed ? calculateGrade(pct) : 'F',
          remarks: sub.remarks?.trim() || getAutoRemark(pct, subPassed)
        };
      });

      const percentage = grandTotal > 0 ? Math.round(((totalObtained / grandTotal) * 100) * 10) / 10 : 0;
      const overallGrade = hasSubjectFailed ? 'F' : calculateGrade(percentage);
      const status = (!hasSubjectFailed && percentage >= 40) ? 'Pass' : 'Fail';

      // Keep existing publication status if already published
      const existing = await ExamResult.findOne({ examTerm: examTermId, student: studentId });
      const isPublished = existing?.isPublished || false;

      await ExamResult.findOneAndUpdate(
        { examTerm: examTermId, student: studentId },
        {
          examTerm: examTermId,
          academicYear: term.academicYear,
          student: studentId,
          class: classId,
          section: sectionId,
          subjects: formattedSubjects,
          grandTotal,
          totalObtained,
          percentage,
          overallGrade,
          status,
          isPublished,
          generalRemarks: generalRemarks || ''
        },
        { upsert: true, new: true }
      );
    }

    // Auto-calculate section positions
    const allResults = await ExamResult.find({ examTerm: examTermId, class: classId, section: sectionId })
      .sort({ percentage: -1 });

    const suffix = (n) => {
      if (n === 1) return '1st';
      if (n === 2) return '2nd';
      if (n === 3) return '3rd';
      return `${n}th`;
    };

    for (let i = 0; i < allResults.length; i++) {
      allResults[i].position = suffix(i + 1);
      await allResults[i].save();
    }

    res.json({ msg: 'Exam results and positions updated successfully', totalUpdated: allResults.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error saving exam results' });
  }
});

// POST /api/exams/results/publish (Toggle results live on Parent & Student portals)
router.post('/results/publish', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return res.status(403).json({ msg: 'Unauthorized' });
    }
    const { examTermId, classId, sectionId, isPublished } = req.body;
    if (!examTermId || !classId || !sectionId) {
      return res.status(400).json({ msg: 'Exam term, class, and section are required' });
    }

    const publishState = isPublished !== false;
    await ExamResult.updateMany(
      { examTerm: examTermId, class: classId, section: sectionId },
      { isPublished: publishState }
    );

    res.json({ 
      msg: publishState ? 'Exam results announced & published to Parents & Students!' : 'Results reverted to draft status',
      isPublished: publishState
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error publishing exam results' });
  }
});

// ==========================================
// 3. CLASS TESTS (Daily / Weekly Tests by Teachers)
// ==========================================

// GET /api/exams/tests?classId=...&sectionId=...
router.get('/tests', auth, async (req, res) => {
  try {
    const { classId, sectionId } = req.query;
    let filter = {};
    if (classId) filter.class = classId;
    if (sectionId) filter.section = sectionId;

    const tests = await ClassTest.find(filter)
      .populate('class', 'name')
      .populate('section', 'name')
      .populate('teacher', 'fullName')
      .populate('results.student', 'name regNo rollNo fatherName')
      .sort({ date: -1 });

    res.json(tests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error fetching class tests' });
  }
});

// POST /api/exams/tests (Teacher or Admin)
router.post('/tests', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Unauthorized' });
    }

    const { title, subject, classId, sectionId, date, totalMarks, studentScores } = req.body;
    if (!title || !subject || !classId || !sectionId || !Array.isArray(studentScores)) {
      return res.status(400).json({ msg: 'Title, Subject, Class, Section, and student scores are required' });
    }

    let teacherId = req.user.teacherProfile || null;
    let postedByName = req.user.name || 'Faculty Staff';

    if (teacherId) {
      const teacherDoc = await Teacher.findById(teacherId);
      if (teacherDoc) postedByName = teacherDoc.fullName;
    } else if (req.user.role === 'admin') {
      postedByName = 'Principal Office';
    }

    const formattedResults = studentScores.map(item => ({
      student: item.studentId,
      obtainedMarks: Number(item.obtainedMarks) || 0,
      remarks: item.remarks?.trim() || ''
    }));

    const test = new ClassTest({
      title: title.trim(),
      subject: subject.trim(),
      class: classId,
      section: sectionId,
      teacher: teacherId,
      postedByName,
      date: date ? new Date(date) : new Date(),
      totalMarks: Number(totalMarks) || 20,
      results: formattedResults
    });

    await test.save();
    res.json({ msg: 'Class test published successfully', test });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error creating class test' });
  }
});

// DELETE /api/exams/tests/:id
router.delete('/tests/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Unauthorized' });
    }
    await ClassTest.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Class test deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error deleting class test' });
  }
});

// ==========================================
// 4. PORTAL RESULTS (For Students & Parents)
// ==========================================

// GET /api/exams/portal/me
router.get('/portal/me', auth, async (req, res) => {
  try {
    if (req.user.role !== 'student' && req.user.role !== 'parent') {
      return res.status(403).json({ msg: 'Portal endpoint restricted to students and parents' });
    }

    const user = await User.findById(req.user.id).populate('studentProfiles');
    let targetStudentId = null;

    if (req.user.role === 'student') {
      targetStudentId = user.studentProfile || user.studentProfiles?.[0];
    } else if (req.user.role === 'parent') {
      if (req.query.studentId) {
        targetStudentId = req.query.studentId;
      } else {
        targetStudentId = user.studentProfiles?.[0] || user.studentProfile;
      }
    }

    if (!targetStudentId) {
      return res.status(404).json({ msg: 'No linked student profile found' });
    }

    const student = await Student.findById(targetStudentId)
      .populate('class', 'name subjects')
      .populate('section', 'name');

    if (!student) {
      return res.status(404).json({ msg: 'Student record not found' });
    }

    const activeYear = await AcademicYear.findOne({ isActive: true });

    // Fetch official Term Exam Results (Only Published by Administration)
    const termResults = await ExamResult.find({ 
      student: student._id,
      isPublished: true
    })
      .populate('examTerm', 'name termType startDate endDate')
      .populate('academicYear', 'name startDate endDate')
      .populate('class', 'name')
      .populate('section', 'name')
      .sort({ createdAt: -1 });

    // Fetch Regular Class Tests
    const classTests = await ClassTest.find({
      class: student.class?._id,
      section: student.section?._id,
      'results.student': student._id
    })
      .populate('teacher', 'fullName')
      .sort({ date: -1 });

    // Extract student's specific score from each class test
    const formattedClassTests = classTests.map(test => {
      const myScore = test.results.find(r => r.student.toString() === student._id.toString());
      return {
        _id: test._id,
        title: test.title,
        subject: test.subject,
        date: test.date,
        totalMarks: test.totalMarks,
        postedByName: test.postedByName,
        obtainedMarks: myScore ? myScore.obtainedMarks : 0,
        remarks: myScore ? myScore.remarks : '',
        percentage: test.totalMarks > 0 && myScore ? Math.round(((myScore.obtainedMarks / test.totalMarks) * 100) * 10) / 10 : 0
      };
    });

    res.json({
      student,
      allChildren: user.studentProfiles || [],
      activeYear,
      termResults,
      classTests: formattedClassTests
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error fetching portal exam results' });
  }
});

module.exports = router;
