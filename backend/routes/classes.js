const express = require('express');
const router = express.Router();
const Class = require('../models/Class');
const Section = require('../models/Section');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Teacher = require('../models/Teacher');
const User = require('../models/User');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// @route   GET api/classes
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    let sectionQuery = {};
    
    if (req.user.role === 'teacher') {
       // Find teacher profile first
       const teacher = await Teacher.findOne({ user: req.user.id });
       if (!teacher) return res.status(404).json({ message: 'Teacher profile not found' });
       
       sectionQuery.classTeacher = teacher._id;
       // Find classes where teacher has at least one section
       const teacherSections = await Section.find(sectionQuery);
       const classIds = [...new Set(teacherSections.map(s => s.class.toString()))];
       query._id = { $in: classIds };
    }

    const classes = await Class.find(query);
    const sections = await Section.find(sectionQuery).populate('classTeacher', 'fullName');
    const studentQuery = {}; // Removed status: 'Active' to count everyone
    if (req.user.role === 'teacher') {
       studentQuery.section = { $in: sections.map(s => s._id) };
    }
    const students = await Student.find(studentQuery);
    
    // Fixed Karachi Date Logic
    const kNow = new Date(new Date().getTime() + (5 * 60 * 60 * 1000));
    const today = `${kNow.getUTCFullYear()}-${String(kNow.getUTCMonth() + 1).padStart(2, '0')}-${String(kNow.getUTCDate()).padStart(2, '0')}`;
    const attendance = await Attendance.find({ date: today });
    const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'Asia/Karachi' }).format(new Date());

    const result = await Promise.all(classes.map(async (c) => {
      const classSections = sections.filter(s => s.class.toString() === c._id.toString());
      const classStudents = students.filter(s => (s.class?.toString() || s.class) === c._id.toString());
      
      const sectionsWithCount = classSections.map(sec => {
        const secStudents = classStudents.filter(st => (st.section?.toString() || st.section) === sec._id.toString());
        const secTodayAtt = attendance.filter(a => 
          secStudents.some(s => s._id.toString() === a.student.toString())
        );

        // Calculate points consistently
        let points = 0;
        let totalP = 0, totalA = 0, totalL = 0, totalHL = 0, totalLT = 0;

        secTodayAtt.forEach(a => {
          if (a.status === 'Present') { points += 1; totalP++; }
          else if (a.status === 'Late') { points += 1; totalLT++; }
          else if (a.status === 'Half Leave') { points += 0.5; totalHL++; }
          else if (a.status === 'Absent') totalA++;
          else if (a.status === 'Leave') totalL++;
        });

        const todaySch = (sec.schedules || []).find(sch => (sch.days || []).includes(dayName));
        const totalPeriodsToday = todaySch ? todaySch.periods.length : 0;

        return {
          ...sec._doc,
          studentCount: secStudents.length,
          presentCount: totalP + totalLT + totalHL, // Number shown on cards
          absentCount: totalA,
          leaveCount: totalL,
          halfLeaveCount: totalHL,
          lateCount: totalLT,
          totalPeriodsToday, // For section cards parity
          todayPresence: secStudents.length > 0 ? ((points / secStudents.length) * 100).toFixed(1) : 0
        };
      });

      let totalPeriods = 0;
      classSections.forEach(sec => {
        const todaySch = (sec.schedules || []).find(sch => (sch.days || []).includes(dayName));
        if (todaySch) totalPeriods += todaySch.periods.length;
      });

      const studentIds = classStudents.map(s => s._id.toString());
      const classAttendance = attendance.filter(a => studentIds.includes(a.student.toString()));
      
      const cPresent = classAttendance.filter(a => a.status === 'Present').length;
      const cAbsent = classAttendance.filter(a => a.status === 'Absent').length;
      const cLeave = classAttendance.filter(a => a.status === 'Leave').length;

      const presencePercentage = classStudents.length > 0 ? (((cPresent + classAttendance.filter(a => a.status === 'Late').length + (classAttendance.filter(a => a.status === 'Half Leave').length * 0.5)) / classStudents.length) * 100).toFixed(0) : 0;

      return {
        ...c._doc,
        sections: sectionsWithCount,
        sectionsCount: classSections.length,
        totalStudents: classStudents.length,
        totalPeriods,
        todayPresence: presencePercentage,
        todayStats: {
            present: cPresent,
            absent: cAbsent,
            leave: cLeave
        }
      };
    }));
    
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/classes/all-sections
router.get('/all-sections', auth, async (req, res) => {
  try {
    const sections = await Section.find().populate('class', 'name');
    res.json(sections);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   GET api/classes/:id/sections
router.get('/:id/sections', auth, async (req, res) => {
  try {
    const sections = await Section.find({ class: req.params.id }).populate('classTeacher', 'name');
    res.json(sections);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   GET api/classes/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id);
    if (!cls) return res.status(404).json({ msg: 'Class not found' });
    
    const sections = await Section.find({ class: req.params.id }).populate('classTeacher', 'fullName email');
    // Fetch ALL students for the class to ensure they don't "disappear" when inactive
    const students = await Student.find({ class: req.params.id });
    
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const todayAttendance = await Attendance.find({ date: today });
    const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());

    const sectionStats = await Promise.all(sections.map(async (s) => {
      const secStudents = students.filter(st => st.section?.toString() === s._id.toString());
      // For stats/attendance percentage, we only care about Active students
      const activeSecStudents = secStudents.filter(st => st.status === 'Active');
      
      const attendance = await Attendance.find({ 
        student: { $in: secStudents.map(st => st._id) } 
      });
      
      let points = 0;
      attendance.forEach(a => {
        if (a.status === 'Present' || a.status === 'Late') points += 1;
        else if (a.status === 'Half Leave') points += 0.5;
      });

      const totalRecords = attendance.length;
      const attPercentage = totalRecords > 0 ? (points / totalRecords) * 100 : 0;

      // New Stats:
      const todaySch = (s.schedules || []).find(sch => (sch.days || []).includes(dayName));
      const totalPeriodsToday = todaySch ? todaySch.periods.length : 0;

      const secStudentIds = secStudents.map(st => st._id.toString());
      const secTodayAtt = todayAttendance.filter(a => secStudentIds.includes(a.student.toString()));
      
      let todayPoints = 0;
      let totalP = 0, totalA = 0, totalL = 0, totalHL = 0, totalLT = 0;

      secTodayAtt.forEach(a => {
        if (a.status === 'Present') { todayPoints += 1; totalP++; }
        else if (a.status === 'Late') { todayPoints += 1; totalLT++; }
        else if (a.status === 'Half Leave') { todayPoints += 0.5; totalHL++; }
        else if (a.status === 'Absent') totalA++;
        else if (a.status === 'Leave') totalL++;
      });

      // Presence percentage based on Active students only
      const todayPresence = activeSecStudents.length > 0 ? ((todayPoints / activeSecStudents.length) * 100).toFixed(1) : 0;

      const lastMarked = attendance.sort((a, b) => b.date - a.date)[0];
      let markedBy = 'Not Marked';
      if (lastMarked) {
        const user = await User.findById(lastMarked.markedBy);
        markedBy = user ? user.name : 'System';
      }

      return {
        ...s._doc,
        students: secStudents,
        studentCount: secStudents.length,
        activeStudentCount: activeSecStudents.length,
        attendancePercentage: attPercentage.toFixed(1),
        todayPresence,
        todayStats: {
            p: totalP,
            a: totalA,
            l: totalL,
            hl: totalHL,
            lt: totalLT
        },
        totalPeriodsToday,
        lastMarkedBy: markedBy
      };
    }));

    const attendanceStats = await Promise.all(students.map(async (st) => {
      const att = await Attendance.find({ student: st._id });
      let points = 0;
      att.forEach(a => {
        if (a.status === 'Present' || a.status === 'Late') points += 1;
        else if (a.status === 'Half Leave') points += 0.5;
      });
      const total = att.length;
      return {
        _id: st._id,
        name: st.name,
        fatherName: st.fatherName,
        gender: st.gender,
        status: st.status, // Include status
        section: sections.find(sec => (sec._id.toString() === (st.section?._id?.toString() || st.section?.toString()))),
        rollNumber: st.rollNumber || st.regNo,
        percentage: total > 0 ? (points / total) * 100 : 0
      };
    }));

    const topStudents = attendanceStats
      .filter(st => st.status === 'Active') // Only Active students in top achievers
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 10);

    res.json({
      ...cls._doc,
      sections: sectionStats,
      topStudents,
      totalStudents: students.length,
      activeStudents: students.filter(s => s.status === 'Active').length
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/classes/:id
router.put('/:id', [auth, roleCheck('admin')], async (req, res) => {
  try {
    const updatedClass = await Class.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedClass);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   POST api/classes/section
router.post('/section', [auth, roleCheck('admin')], async (req, res) => {
  const { name, classId, periods, classTeacher } = req.body;
  try {
    let finalTeacher = classTeacher && typeof classTeacher === 'object' ? classTeacher._id : classTeacher;
    
    // Auto assign class teacher from first period if not provided
    if (!finalTeacher && periods && periods.length > 0 && periods[0].teacher) {
      finalTeacher = periods[0].teacher?._id || periods[0].teacher;
    }

    const newSection = new Section({
      name,
      class: classId,
      classTeacher: finalTeacher,
      periods
    });
    await newSection.save();
    res.json(newSection);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/classes/section/:id
router.put('/section/:id', [auth, roleCheck('admin')], async (req, res) => {
  const { name, classTeacher, periods, schedules } = req.body;
  try {
    const section = await Section.findById(req.params.id);
    if (!section) return res.status(404).json({ msg: 'Section not found' });

    const getSafeID = (t) => {
      if (!t) return null;
      if (typeof t === 'string') return (t === 'undefined' || t === 'null' || t === '[object Object]') ? null : t;
      if (t._id) return t._id.toString();
      if (typeof t.toString === 'function') {
        const ts = t.toString();
        return (ts === '[object Object]') ? null : ts;
      }
      return null;
    };

    let finalTeacher = getSafeID(classTeacher);

    // Robust comparison of current vs new timetable
    const normalizeTimetable = (scheds) => {
      return (scheds || []).map(sch => ({
        days: (sch.days || []).sort(),
        periods: (sch.periods || []).map(p => ({
          startTime: p.startTime,
          endTime: p.endTime,
          subject: p.subject,
          teacher: getSafeID(p.teacher)
        }))
      }));
    };

    const newNormalizedSchedules = normalizeTimetable(schedules);
    const oldNormalizedSchedules = normalizeTimetable(section.schedules);

    const isTimetableChanged = JSON.stringify(newNormalizedSchedules) !== JSON.stringify(oldNormalizedSchedules);

    // Filter out invalid periods/schedules data for saving
    const sanitizedPeriods = (periods || []).map(p => ({ ...p, teacher: getSafeID(p.teacher) }));
    const sanitizedSchedules = (schedules || []).map(sch => ({
      ...sch,
      periods: (sch.periods || []).map(p => ({ ...p, teacher: getSafeID(p.teacher) }))
    }));

    // Teacher Conflict Validation (Only if timetable data is being modified)
    if (isTimetableChanged && sanitizedSchedules.length > 0) {
      const otherSections = await Section.find({ _id: { $ne: req.params.id } }).populate('class');
      
      for (const currSch of sanitizedSchedules) {
        // Find if this specific session was actually modified compared to old data
        const oldMatch = (section.schedules || []).find(os => os.name === currSch.name);
        const isSessionModified = JSON.stringify(currSch.periods) !== JSON.stringify(oldMatch?.periods);
        
        if (!isSessionModified) continue;

        for (const pA of currSch.periods) {
          const teacherA = getSafeID(pA.teacher);
          if (!teacherA) continue;

          // 1. Cross-check with ALL sessions of the SAME section
          for (const schB of sanitizedSchedules) {
            const commonDays = (currSch.days || []).filter(day => (schB.days || []).includes(day));
            if (commonDays.length === 0) continue;

            for (const pB of schB.periods) {
               if (currSch === schB && pA === pB) continue;

               const teacherB = getSafeID(pB.teacher);
               if (teacherB && teacherA === teacherB) {
                 const startA = timeToMinutes(pA.startTime);
                 const endA = timeToMinutes(pA.endTime);
                 const startB = timeToMinutes(pB.startTime);
                 const endB = timeToMinutes(pB.endTime);

                 if (Math.max(startA, startB) < Math.min(endA, endB)) {
                   return res.status(400).json({ 
                     msg: `Internal Timetable Conflict: Teacher busy in [${schB.name}] during this time (${commonDays[0]}: ${pA.startTime}).` 
                   });
                 }
               }
            }
          }

          // 2. Check for Conflicts with OTHER sections
          for (const otherSec of otherSections) {
            const otherScheds = otherSec.schedules || [];
            for (const oSch of otherScheds) {
              const sharedDays = (currSch.days || []).filter(day => (oSch.days || []).includes(day));
              if (sharedDays.length === 0) continue;

              for (const oPeriod of oSch.periods) {
                const otherTeacher = getSafeID(oPeriod.teacher);
                if (otherTeacher && teacherA === otherTeacher) {
                  const s1 = timeToMinutes(pA.startTime);
                  const e1 = timeToMinutes(pA.endTime);
                  const s2 = timeToMinutes(oPeriod.startTime);
                  const e2 = timeToMinutes(oPeriod.endTime);

                  if (Math.max(s1, s2) < Math.min(e1, e2)) {
                    return res.status(400).json({ 
                      msg: `Timetable Overlap: Teacher is busy in ${otherSec.class?.name || ''} Sec ${otherSec.name} on ${sharedDays[0]} at ${pA.startTime}.` 
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    const updatedSection = await Section.findByIdAndUpdate(
      req.params.id, 
      { name, classTeacher: finalTeacher, periods: sanitizedPeriods, schedules: sanitizedSchedules }, 
      { new: true }
    );
    res.json(updatedSection);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const is12h = /AM|PM/i.test(timeStr);
  let time = timeStr;
  let modifier = '';
  
  if (is12h) {
    [time, modifier] = timeStr.split(' ');
  }
  
  let [hours, minutes] = time.split(':').map(Number);
  if (is12h) {
    if (hours === 12) hours = 0;
    if (modifier?.toUpperCase() === 'PM') hours += 12;
  }
  return hours * 60 + (minutes || 0);
}

router.get('/section/:sectionId/students', auth, async (req, res) => {
  try {
    const students = await Student.find({ section: req.params.sectionId });
    res.json(students);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

router.post('/', [auth, roleCheck('admin')], async (req, res) => {
  const { name, fees } = req.body;
  try {
    const newClass = new Class({ name, fees });
    await newClass.save();
    res.json(newClass);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

router.delete('/:id', [auth, roleCheck('admin')], async (req, res) => {
  try {
    const classId = req.params.id;
    await Student.deleteMany({ class: classId });
    await Section.deleteMany({ class: classId });
    await Class.findByIdAndDelete(classId);
    res.json({ msg: 'Class and all related records deleted' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

router.delete('/section/:id', [auth, roleCheck('admin')], async (req, res) => {
  try {
    const sectionId = req.params.id;
    await Student.deleteMany({ section: sectionId });
    await Section.findByIdAndDelete(sectionId);
    res.json({ msg: 'Section and related students deleted' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;
