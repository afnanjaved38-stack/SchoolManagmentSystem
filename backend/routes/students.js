const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Section = require('../models/Section');
const Attendance = require('../models/Attendance');
const FeeRecord = require('../models/FeeRecord');
const User = require('../models/User');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');

const TeacherAttendance = require('../models/TeacherAttendance');

// @route   GET api/students/dashboard-stats
router.get('/dashboard-stats', auth, async (req, res) => {
  try {
    const { timeframe, financeTimeframe } = req.query; // 'week', 'month', 'year'
    
    // -------------------------------------------------------------------------
    // TEACHER DASHBOARD LOGIC
    // -------------------------------------------------------------------------
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ user: req.user.id });
      if (!teacher) return res.status(404).json({ message: 'Teacher profile not found' });

      const managedSections = await Section.find({ classTeacher: teacher._id }).populate('class', 'name');
      const managedSectionIds = managedSections.map(s => s._id);

      // 1. My Managed Students
      const myStudentsCount = await Student.countDocuments({ 
        section: { $in: managedSectionIds }, 
        status: 'Active' 
      });

      // 2. Attendance Stats for My Sections Today (Fixed for Karachi Timezone)
      const now = new Date(new Date().getTime() + (5 * 60 * 60 * 1000)); // Manual UTC+5 shift
      now.setUTCHours(0,0,0,0);
      
      // Get all students in my managed sections
      const myStudentList = await Student.find({ section: { $in: managedSectionIds } }).select('_id');
      const myStudentIds = myStudentList.map(s => s._id);

      const todayAtt = await Attendance.find({
        date: now,
        student: { $in: myStudentIds }
      });

      let attendancePoints = 0;
      todayAtt.forEach(a => {
        if (a.status === 'Present' || a.status === 'Late') attendancePoints += 1;
        else if (a.status === 'Half Leave') attendancePoints += 0.5;
      });

      const totalInvolved = myStudentIds.length;
      const attRate = totalInvolved > 0 ? Math.round((attendancePoints / totalInvolved) * 100) : 0;

      // 3. My Schedule (Today)
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const kNow = new Date(new Date().getTime() + (5 * 60 * 60 * 1000));
      const currentDay = dayNames[kNow.getUTCDay()];
      
      const allSections = await Section.find().populate('class', 'name').lean();
      const todaySchedule = [];

      allSections.forEach(section => {
        if (section.schedules) {
          section.schedules.forEach(sch => {
            if (sch.days.includes(currentDay)) {
              sch.periods.forEach(p => {
                if (p.teacher && p.teacher.toString() === teacher._id.toString()) {
                  todaySchedule.push({
                    time: p.startTime,
                    subject: p.subject,
                    className: section.class?.name,
                    sectionName: section.name
                  });
                }
              });
            }
          });
        }
      });
      todaySchedule.sort((a,b) => a.time.localeCompare(b.time));

      return res.json({
        role: 'teacher',
        totalStudents: myStudentsCount,
        attendanceToday: attRate,
        managedSections: managedSections.map(s => ({
          _id: s._id,
          name: s.name,
          className: s.class?.name
        })),
        todaySchedule,
        studentTrend: [], // Teachers don't see school-wide trends yet
        teacherTrend: []
      });
    }

    // -------------------------------------------------------------------------
    // ADMIN DASHBOARD LOGIC (EXISTING)
    // -------------------------------------------------------------------------
    const [activeStudents, inactiveStudents, totalStudents, activeTeachers] = await Promise.all([
      Student.countDocuments({ status: 'Active' }),
      Student.countDocuments({ status: 'Inactive' }),
      Student.countDocuments(),
      Teacher.countDocuments({ status: 'Active' })
    ]);

    // Revenue stats
    let revenue = 0;
    let pendingDues = 0;
    let monthlyStats = { paid: 0, unpaid: 0 };
    let financialTrend = [];

    if (req.user.role === 'admin') {
      const revenueResult = await FeeRecord.aggregate([
        { $group: { _id: null, totalPaid: { $sum: "$paidAmount" }, totalRemaining: { $sum: "$balance" } } }
      ]);
      revenue = revenueResult[0]?.totalPaid || 0;
      pendingDues = revenueResult[0]?.totalRemaining || 0;

      const now = new Date();
      const targetMonth = financeTimeframe || now.toISOString().slice(0, 7); // timeframe will now be YYYY-MM
      
      // 1. CASH FLOW: How much was actually COLLECTED during this specific month?
      const monthStart = new Date(targetMonth + "-01");
      const monthEnd = new Date(new Date(monthStart).setMonth(monthStart.getMonth() + 1));

      const collections = await FeeRecord.aggregate([
        { $unwind: "$paymentHistory" },
        { 
          $match: { 
            "paymentHistory.date": { $gte: monthStart, $lt: monthEnd } 
          } 
        },
        { 
          $group: { 
            _id: null, 
            totalCollected: { $sum: "$paymentHistory.amount" } 
          } 
        }
      ]);

      // 2. DUES: Total outstanding balance up to the end of this month (Cumulative)
      const dues = await FeeRecord.aggregate([
        { 
          $match: { 
            type: { $in: ['Monthly Fees', 'Monthly Fee', 'Tuition', 'tuition'] },
            month: { $lte: targetMonth }
          } 
        },
        { 
          $group: { 
            _id: null, 
            totalPending: { $sum: "$balance" } 
          } 
        }
      ]);

      monthlyStats.paid = collections[0]?.totalCollected || 0;
      monthlyStats.unpaid = dues[0]?.totalPending || 0;

      // Financial Trend for Graph - Still shows the last 6 months of recovery
      financialTrend = await FeeRecord.aggregate([
        { $match: { type: { $in: ['Monthly Fees', 'Monthly Fee', 'Tuition', 'tuition'] } } },
        {
          $group: {
            _id: "$month",
            paid: { $sum: "$paidAmount" },
            unpaid: { $sum: "$balance" }
          }
        },
        { $sort: { "_id": -1 } },
        { $limit: 6 },
        { $sort: { "_id": 1 } }
      ]);
    }

    // Attendance Trends
    let startDate = new Date();
    if (timeframe === 'week') startDate.setDate(startDate.getDate() - 7);
    else if (timeframe === 'year') startDate.setFullYear(startDate.getFullYear() - 1);
    else startDate.setDate(startDate.getDate() - 30); // default month

    const [studentTrend, teacherTrend] = await Promise.all([
      Attendance.aggregate([
        { $match: { date: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            present: { $sum: { $cond: [{ $in: ["$status", ["Present", "Late", "Half Leave"]] }, 1, 0] } },
            absent: { $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] } }
          }
        },
        { $sort: { "_id": 1 } }
      ]),
      TeacherAttendance.aggregate([
        { $match: { date: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
            present: { $sum: { $cond: [{ $in: ["$status", ["Present", "Late", "Half Leave"]] }, 1, 0] } },
            absent: { $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] } }
          }
        },
        { $sort: { "_id": 1 } }
      ])
    ]);

    // Calculate Today's Attendance Percentage (Fixed for Karachi Timezone)
    const today = new Date(new Date().getTime() + (5 * 60 * 60 * 1000));
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const todayAtt = await Attendance.aggregate([
      { $match: { date: { $gte: today, $lt: tomorrow } } },
      {
        $group: {
          _id: null,
          present: { $sum: { $cond: [{ $in: ["$status", ["Present", "Late", "Half Leave"]] }, 1, 0] } },
          total: { $sum: 1 }
        }
      }
    ]);

    const attendanceToday = todayAtt[0]?.total > 0 
      ? Math.round((todayAtt[0].present / todayAtt[0].total) * 100) 
      : 0;

    res.json({
      activeStudents,
      inactiveStudents,
      totalStudents,
      activeTeachers,
      revenue,
      pendingDues,
      attendanceToday,
      monthlyStats,
      financialTrend,
      studentTrend,
      teacherTrend
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/students
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    
    // If user is a teacher, only show students from their assigned sections
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ user: req.user.id });
      if (!teacher) return res.status(404).json({ message: 'Teacher profile not found' });
      
      const managedSections = await Section.find({ classTeacher: teacher._id });
      const managedSectionIds = managedSections.map(s => s._id);
      query.section = { $in: managedSectionIds };
    }

    if (req.query.classId || req.query.class) query.class = req.query.classId || req.query.class;
    if (req.query.sectionId || req.query.section) query.section = req.query.sectionId || req.query.section;
    if (req.query.status) query.status = req.query.status;

    const students = await Student.find(query)
      .select('name fatherName regNo class section status gender phone') // Project only list fields
      .populate('class', 'name')
      .populate('section', 'name')
      .sort({ name: 1 })
      .limit(1000); // Sanity limit for huge schools
    res.json(students);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   POST api/students/promote
// @desc    Batch promote or shift students to next class/section
router.post('/promote', [auth, roleCheck('admin')], async (req, res) => {
  try {
    const { studentIds, targetClassId, targetSectionId, action, sessionId } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({ msg: 'Please select at least one student' });
    }

    const AcademicYear = require('../models/AcademicYear');
    let academicYear = sessionId 
      ? await AcademicYear.findById(sessionId) 
      : await AcademicYear.findOne({ isActive: true });
    
    const yearName = academicYear ? academicYear.name : 'Current Academic Year';
    const isPromote = action !== 'retain';

    let targetClass = null;
    let targetSection = null;

    if (isPromote) {
      if (!targetClassId || !targetSectionId) {
        return res.status(400).json({ msg: 'Target class and section are required for promotion' });
      }
      targetClass = await Class.findById(targetClassId);
      targetSection = await Section.findById(targetSectionId);
      if (!targetClass || !targetSection) {
        return res.status(404).json({ msg: 'Target class or section not found' });
      }
    }

    let promotedCount = 0;
    let retainedCount = 0;

    for (const id of studentIds) {
      const student = await Student.findById(id).populate('class', 'name').populate('section', 'name');
      if (!student) continue;

      const historyEntry = {
        academicYear: academicYear?._id,
        yearName,
        class: student.class?._id,
        className: student.class?.name || 'Class',
        section: student.section?._id,
        sectionName: student.section?.name || 'Section',
        status: isPromote ? 'Promoted' : 'Retained',
        date: new Date()
      };

      student.academicHistory.push(historyEntry);

      if (isPromote) {
        student.class = targetClassId;
        student.section = targetSectionId;
        promotedCount++;
      } else {
        retainedCount++;
      }

      await student.save();
    }

    res.json({
      msg: isPromote 
        ? `Successfully promoted ${promotedCount} students to ${targetClass.name} - ${targetSection.name}` 
        : `Successfully marked ${retainedCount} students as retained in current grade.`,
      promotedCount,
      retainedCount
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/students/portal/me
// @desc    Get current student/parent portal data (supports multi-child switching for parents)
router.get('/portal/me', auth, async (req, res) => {
  try {
    if (!['student', 'parent'].includes(req.user.role)) {
      return res.status(403).json({ msg: 'Access restricted to Student and Parent portals' });
    }

    let targetStudentId = req.user.studentProfile;
    let allChildren = [];

    if (req.user.role === 'parent') {
      const userDoc = await User.findById(req.user.id);
      const childIds = userDoc?.studentProfiles && userDoc.studentProfiles.length > 0
        ? userDoc.studentProfiles
        : (userDoc?.studentProfile ? [userDoc.studentProfile] : []);

      if (childIds.length > 0) {
        allChildren = await Student.find({ _id: { $in: childIds }, status: { $ne: 'Deleted' } })
          .populate('class', 'name')
          .populate('section', 'name')
          .select('name regNo class section fatherName phone status');

        if (req.query.studentId && childIds.some(id => id.toString() === req.query.studentId)) {
          targetStudentId = req.query.studentId;
        } else if (allChildren.length > 0) {
          targetStudentId = allChildren[0]._id;
        }
      }
    }

    if (!targetStudentId) {
      return res.status(404).json({ msg: 'No linked student profile found for this account' });
    }

    const student = await Student.findById(targetStudentId)
      .populate('class', 'name monthlyFee')
      .populate({
        path: 'section',
        select: 'name room schedules classTeacher',
        populate: {
          path: 'classTeacher',
          select: 'fullName phone email'
        }
      });

    if (!student) {
      return res.status(404).json({ msg: 'Student record not found' });
    }

    // Active Academic Year Scoping
    const AcademicYear = require('../models/AcademicYear');
    const activeYear = await AcademicYear.findOne({ isActive: true });
    
    let attMatch = { student: student._id };
    if (activeYear?.startDate && activeYear?.endDate) {
      attMatch.date = { 
        $gte: new Date(activeYear.startDate), 
        $lte: new Date(activeYear.endDate) 
      };
    }

    // 1. Attendance aggregation strictly within Active Academic Session
    const [attStats, todayAtt, attRecords] = await Promise.all([
      Attendance.aggregate([
        { $match: attMatch },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            presentCount: { $sum: { $cond: [{ $eq: ["$status", "Present"] }, 1, 0] } },
            absentCount: { $sum: { $cond: [{ $eq: ["$status", "Absent"] }, 1, 0] } },
            lateCount: { $sum: { $cond: [{ $eq: ["$status", "Late"] }, 1, 0] } },
            leaveCount: { $sum: { $cond: [{ $eq: ["$status", "Half Leave"] }, 1, 0] } },
            points: {
              $sum: {
                $switch: {
                  branches: [
                    { case: { $in: ["$status", ["Present", "Late"]] }, then: 1 },
                    { case: { $eq: ["$status", "Half Leave"] }, then: 0.5 }
                  ],
                  default: 0
                }
              }
            }
          }
        }
      ]),
      // Today's attendance
      (async () => {
        const today = new Date(new Date().getTime() + (5 * 60 * 60 * 1000));
        today.setUTCHours(0,0,0,0);
        return Attendance.findOne({ student: student._id, date: today });
      })(),
      // Attendance records within active session
      Attendance.find(attMatch).sort({ date: -1 }).limit(30)
    ]);

    const attendanceRate = attStats[0]?.total > 0
      ? Math.round((attStats[0].points / attStats[0].total) * 100)
      : 0;

    // 2. Schedule for today
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const kNow = new Date(new Date().getTime() + (5 * 60 * 60 * 1000));
    const currentDay = dayNames[kNow.getUTCDay()];
    
    let todaySchedule = [];
    if (student.section?.schedules) {
      student.section.schedules.forEach(sch => {
        if (sch.days && sch.days.includes(currentDay)) {
          if (sch.periods) {
            sch.periods.forEach(p => {
              todaySchedule.push({
                period: p.title || `Period ${todaySchedule.length + 1}`,
                subject: p.subject,
                startTime: p.startTime,
                endTime: p.endTime
              });
            });
          }
        }
      });
      todaySchedule.sort((a,b) => (a.startTime || '').localeCompare(b.startTime || ''));
    }

    // 3. Fee records
    const Fee = require('../models/FeeRecord');
    const rawFeeRecords = await Fee.find({ student: student._id }).sort({ month: -1, createdAt: -1 });

    const feeRecords = rawFeeRecords.map(r => {
      const doc = r.toObject();
      if (doc.paidAmount === undefined) doc.paidAmount = doc.status === 'Paid' ? doc.totalAmount : 0;
      if (doc.balance === undefined || (doc.balance === 0 && doc.paidAmount < doc.totalAmount && doc.status !== 'Waived')) {
        doc.balance = Math.max(0, doc.totalAmount - doc.paidAmount);
      }
      return doc;
    });

    // Cumulative / Lifetime Total Dues (All historical unpaid records)
    const totalDues = feeRecords
      .filter(f => ['Unpaid', 'Partial'].includes(f.status))
      .reduce((sum, f) => sum + (Number(f.balance) || 0), 0);

    // Active Academic Session Scoped Financial Metrics
    let sessionInvoiced = 0;
    let sessionPaid = 0;
    let sessionDues = 0;

    const toYearMonth = (dateVal) => {
      if (!dateVal) return '';
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return '';
      const pktDate = new Date(d.getTime() + 5 * 60 * 60 * 1000);
      const year = pktDate.getUTCFullYear();
      const month = String(pktDate.getUTCMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    };

    let startMonth = '';
    let endMonth = '';
    if (activeYear?.startDate && activeYear?.endDate) {
      startMonth = toYearMonth(activeYear.startDate);
      endMonth = toYearMonth(activeYear.endDate);
    } else {
      const currentYear = new Date().getFullYear();
      startMonth = `${currentYear}-01`;
      endMonth = `${currentYear}-12`;
    }

    const sessionRecords = feeRecords.filter(f => f.month && f.month >= startMonth && f.month <= endMonth);
    sessionInvoiced = sessionRecords.reduce((sum, f) => sum + (Number(f.totalAmount) || 0), 0);
    sessionPaid = sessionRecords.reduce((sum, f) => sum + (Number(f.paidAmount) || 0), 0);
    sessionDues = sessionRecords.filter(f => ['Unpaid', 'Partial'].includes(f.status)).reduce((sum, f) => sum + (Number(f.balance) || 0), 0);

    // Fetch all academic years for selector dropdown
    const allYears = await AcademicYear.find().sort({ startDate: -1 });

    const Settings = require('../models/Settings');
    const settings = await Settings.findOne() || {
      showTeacherPhoneToStudents: true,
      showTeacherPhoneToParents: true,
      showFeesOnStudentPortal: true
    };

    const isStudent = req.user.role === 'student';
    const showFeesOnStudentPortal = settings.showFeesOnStudentPortal !== false;
    const hideFeesForCurrentStudent = isStudent && !showFeesOnStudentPortal;

    let studentObj = student.toObject();
    if (studentObj.section?.classTeacher) {
      const allowPhone = isStudent 
        ? settings.showTeacherPhoneToStudents !== false 
        : settings.showTeacherPhoneToParents !== false;
      
      if (!allowPhone) {
        studentObj.section.classTeacher.phone = null;
        studentObj.section.classTeacher.phoneHidden = true;
      }
    }

    res.json({
      role: req.user.role,
      student: studentObj,
      allChildren, // Returns array of linked children for multi-child switcher
      activeYear: activeYear ? { _id: activeYear._id, name: activeYear.name, startDate: activeYear.startDate, endDate: activeYear.endDate } : null,
      allAcademicYears: allYears.map(y => ({ _id: y._id, name: y.name, startDate: y.startDate, endDate: y.endDate, isActive: y.isActive })),
      attendanceRate,
      attendanceSummary: attStats[0] || { total: 0, presentCount: 0, absentCount: 0, lateCount: 0, leaveCount: 0 },
      todayAttendance: todayAtt?.status || 'Not Marked Yet',
      recentAttendance: attRecords,
      todaySchedule,
      schedules: student.section?.schedules || [],
      feeRecords: hideFeesForCurrentStudent ? [] : feeRecords,
      totalDues: hideFeesForCurrentStudent ? 0 : totalDues,
      sessionInvoiced: hideFeesForCurrentStudent ? 0 : sessionInvoiced,
      sessionPaid: hideFeesForCurrentStudent ? 0 : sessionPaid,
      sessionDues: hideFeesForCurrentStudent ? 0 : sessionDues,
      showFeesOnStudentPortal
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/students/:id/credentials
// @desc    Get portal accounts for a student (Admin only)
router.get('/:id/credentials', [auth, roleCheck('admin')], async (req, res) => {
  try {
    const studentUsers = await User.find({ 
      $or: [
        { studentProfile: req.params.id },
        { studentProfiles: req.params.id }
      ],
      role: { $in: ['student', 'parent'] }
    }).select('name email role plainPassword studentProfiles createdAt');

    const studentAccount = studentUsers.find(u => u.role === 'student');
    const parentAccount = studentUsers.find(u => u.role === 'parent');

    res.json({
      studentAccount: studentAccount ? {
        id: studentAccount._id,
        email: studentAccount.email,
        plainPassword: studentAccount.plainPassword,
        name: studentAccount.name
      } : null,
      parentAccount: parentAccount ? {
        id: parentAccount._id,
        email: parentAccount.email,
        plainPassword: parentAccount.plainPassword,
        name: parentAccount.name,
        linkedChildrenCount: parentAccount.studentProfiles?.length || 1
      } : null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/students/:id/credentials
// @desc    Create or update student/parent credentials (links multi-child parent accounts)
router.post('/:id/credentials', [auth, roleCheck('admin')], async (req, res) => {
  const { type, email, password } = req.body; // type: 'student' | 'parent'
  
  if (!['student', 'parent'].includes(type)) {
    return res.status(400).json({ msg: 'Invalid account type. Must be student or parent.' });
  }

  if (!email || !password) {
    return res.status(400).json({ msg: 'Email/Username and password are required' });
  }

  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ msg: 'Student not found' });

    // Check if another user already has this email
    let existingWithEmail = await User.findOne({ email: email.toLowerCase().trim() });
    
    // Find existing account for this student & role
    let userAccount = await User.findOne({ 
      $or: [
        { studentProfile: student._id },
        { studentProfiles: student._id }
      ],
      role: type
    });

    if (existingWithEmail && (!userAccount || existingWithEmail._id.toString() !== userAccount._id.toString())) {
      // If it's a parent account, link this student to the existing parent account!
      if (type === 'parent' && existingWithEmail.role === 'parent') {
        if (!existingWithEmail.studentProfiles.includes(student._id)) {
          existingWithEmail.studentProfiles.push(student._id);
        }
        existingWithEmail.password = password;
        await existingWithEmail.save();

        return res.json({
          msg: `Linked ${student.name} to existing parent account (${existingWithEmail.email}) with ${existingWithEmail.studentProfiles.length} children total.`,
          user: {
            id: existingWithEmail._id,
            email: existingWithEmail.email,
            plainPassword: password,
            role: existingWithEmail.role,
            linkedChildrenCount: existingWithEmail.studentProfiles.length
          }
        });
      }

      return res.status(400).json({ msg: `The username/email "${email}" is already in use by another account.` });
    }

    if (userAccount) {
      userAccount.email = email.toLowerCase().trim();
      userAccount.password = password; // pre-save will hash & store plainPassword
      if (!userAccount.studentProfiles.includes(student._id)) {
        userAccount.studentProfiles.push(student._id);
      }
      userAccount.name = type === 'student' ? student.name : `${student.fatherName || student.name} (Parent)`;
      await userAccount.save();
    } else {
      userAccount = new User({
        name: type === 'student' ? student.name : `${student.fatherName || student.name} (Parent)`,
        email: email.toLowerCase().trim(),
        password: password,
        plainPassword: password,
        role: type,
        studentProfile: student._id
      });
      await userAccount.save();
    }

    res.json({
      msg: `${type === 'student' ? 'Student' : 'Parent'} portal credentials saved successfully`,
      account: {
        id: userAccount._id,
        email: userAccount.email,
        plainPassword: password,
        role: userAccount.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: err.message || 'Server Error' });
  }
});

// @route   GET api/students/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('class')
      .populate('section');
      
    if (!student) return res.status(404).json({ msg: 'Student not found' });

    // Performance Optimization: Run attendance and debt stats in parallel using aggregation
    const [attStats, dueStats] = await Promise.all([
      Attendance.aggregate([
        { $match: { student: student._id } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            points: {
              $sum: {
                $switch: {
                  branches: [
                    { case: { $in: ["$status", ["Present", "Late"]] }, then: 1 },
                    { case: { $eq: ["$status", "Half Leave"] }, then: 0.5 }
                  ],
                  default: 0
                }
              }
            }
          }
        }
      ]),
      FeeRecord.aggregate([
        { $match: { student: student._id, status: { $in: ['Unpaid', 'Partial'] } } },
        { 
          $group: { 
            _id: null, 
            totalDues: { $sum: { $subtract: ["$totalAmount", "$paidAmount"] } } 
          } 
        }
      ])
    ]);

    const attendanceRate = attStats[0]?.total > 0 
      ? Math.round((attStats[0].points / attStats[0].total) * 100) 
      : 0;

    const totalDues = Math.max(0, dueStats[0]?.totalDues || 0);

    const result = {
      ...student.toObject(),
      attendanceRate,
      totalDues
    };

    // Strip sensitive info for teachers
    if (req.user.role === 'teacher') {
      delete result.totalDues;
    }

    res.json(result);
  } catch (err) {
    console.error(err);
    if (err.kind === 'ObjectId') return res.status(404).json({ msg: 'Student not found' });
    res.status(500).send('Server Error');
  }
});

// @route   POST api/students
router.post('/', [auth, roleCheck('admin')], async (req, res) => {
  try {
    const newStudent = new Student(req.body);
    await newStudent.save();
    res.json(newStudent);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/students/:id
router.put('/:id', auth, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const student = await Student.findByIdAndUpdate(req.params.id, req.body, { new: true });
      return res.json(student);
    } 
    
    if (req.user.role === 'teacher') {
      // Teachers can ONLY update status
      const allowedUpdates = ['status'];
      const requestedUpdates = Object.keys(req.body);
      const isValidOperation = requestedUpdates.every(update => allowedUpdates.includes(update));

      if (!isValidOperation) {
        return res.status(403).json({ msg: 'Teachers can only update student status' });
      }

      const student = await Student.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
      return res.json(student);
    }

    res.status(403).json({ msg: 'Access denied' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/students/:id
router.delete('/:id', [auth, roleCheck('admin')], async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ msg: 'Student not found' });

    // Permanent Delete as requested by user - Clean up all related records
    const studentId = req.params.id;
    await Student.findByIdAndDelete(studentId);
    await Attendance.deleteMany({ student: studentId });
    await FeeRecord.deleteMany({ student: studentId });
    
    res.json({ msg: 'Student and all related records (Attendance, Finance) permanently removed' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;
