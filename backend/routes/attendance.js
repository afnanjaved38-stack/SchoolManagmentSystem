const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const TeacherAttendance = require('../models/TeacherAttendance');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Section = require('../models/Section');
const Holiday = require('../models/Holiday');
const auth = require('../middleware/auth');

// @route   GET api/attendance/my-attendance
router.get('/my-attendance', auth, async (req, res) => {
  try {
    const { month } = req.query; // Format: YYYY-MM
    let dateFilter = {};
    if (month) {
      const start = new Date(`${month}-01`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      dateFilter = { $gte: start, $lt: end };
    }

    if (req.user.role === 'teacher') {
      let query = { teacher: req.user.teacherProfile };
      if (month) query.date = dateFilter;
      const attendance = await TeacherAttendance.find(query)
        .populate('markedBy', 'name')
        .sort({ date: 1 });
      return res.json(attendance);
    }

    if (req.user.role === 'student' || req.user.role === 'parent') {
      let targetStudentId = req.query.studentId || req.user.studentProfile;
      if (req.user.role === 'parent' && !req.query.studentId) {
        const User = require('../models/User');
        const userDoc = await User.findById(req.user.id);
        if (userDoc?.studentProfiles?.length > 0) {
          targetStudentId = userDoc.studentProfiles[0];
        }
      }
      let query = { student: targetStudentId };
      if (month) query.date = dateFilter;
      const attendance = await Attendance.find(query)
        .populate('markedBy', 'name')
        .sort({ date: 1 });
      return res.json(attendance);
    }

    return res.status(403).json({ msg: 'Unauthorized access' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/attendance/single
// Mark attendance for a single student or teacher
router.post('/single', auth, async (req, res) => {
  const { id, type, status, date } = req.body;
  try {
    const Settings = require('../models/Settings');
    const settings = await Settings.findOne() || { 
      teacherStartTime: '07:00', teacherEndTime: '10:00', 
      adminStartTime: '00:00', adminEndTime: '23:59' 
    };

    const now = new Date();
    const kTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
    const karachiNowStr = `${kTime.getUTCFullYear()}-${String(kTime.getUTCMonth() + 1).padStart(2, '0')}-${String(kTime.getUTCDate()).padStart(2, '0')}`;
    const karachiCurrentTime = kTime.getUTCHours() * 60 + kTime.getUTCMinutes();

    const searchDate = new Date(date || karachiNowStr);
    searchDate.setUTCHours(0, 0, 0, 0);

    const todayDate = new Date(kTime);
    todayDate.setUTCHours(0,0,0,0);

    // Rule 1: Only today's attendance can be marked (Admin or Teacher)
    if (searchDate.getTime() !== todayDate.getTime()) {
        return res.status(403).json({ msg: `Only today's attendance can be marked. (Server: ${karachiNowStr})` });
    }

    // Rule 2: Timing restrictions
    const timeToMins = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    if (req.user.role === 'teacher') {
      const start = timeToMins(settings.teacherStartTime);
      const end = timeToMins(settings.teacherEndTime);
      if (karachiCurrentTime < start || karachiCurrentTime > end) {
        return res.status(403).json({ msg: `Teachers are only allowed to mark attendance between ${settings.teacherStartTime} and ${settings.teacherEndTime} (Current Server Time: ${kTime.getUTCHours().toString().padStart(2,'0')}:${kTime.getUTCMinutes().toString().padStart(2,'0')})` });
      }
    } else if (req.user.role === 'admin') {
      const start = timeToMins(settings.adminStartTime);
      const end = timeToMins(settings.adminEndTime);
      if (karachiCurrentTime < start || karachiCurrentTime > end) {
        return res.status(403).json({ msg: `Administrators are only allowed to mark attendance between ${settings.adminStartTime} and ${settings.adminEndTime}` });
      }
    }
    
    // Always use getUTCDay() since we are normalizing to 00:00:00 UTC
    if (searchDate.getUTCDay() === 0) {
      return res.status(400).json({ msg: 'School is closed on Sunday' });
    }

    if (type === 'teacher') {
      if (req.user.role === 'teacher') {
        return res.status(403).json({ msg: 'Teachers cannot mark their own or other faculty attendance.' });
      }
      if (!status) {
        await TeacherAttendance.findOneAndDelete({ teacher: id, date: searchDate });
      } else {
        await TeacherAttendance.findOneAndUpdate(
          { teacher: id, date: searchDate },
          { status, markedBy: req.user.id },
          { upsert: true, new: true }
        );
      }
    } else {
      if (!status) {
        await Attendance.findOneAndDelete({ student: id, date: searchDate });
      } else {
        await Attendance.findOneAndUpdate(
          { student: id, date: searchDate },
          { status, markedBy: req.user.id },
          { upsert: true, new: true }
        );
      }
    }
    res.json({ msg: 'Attendance saved' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/attendance
router.get('/', auth, async (req, res) => {
  const { date, classId, sectionId, type } = req.query;
  try {
    const searchDate = new Date(date);
    searchDate.setUTCHours(0,0,0,0);

    // Check if searchDate falls within an active holiday or vacation
    const targetDateStart = new Date(date + 'T00:00:00+05:00');
    const targetDateEnd = new Date(date + 'T23:59:59+05:00');
    const activeHoliday = await Holiday.findOne({
      startDate: { $lte: targetDateEnd },
      endDate: { $gte: targetDateStart }
    });

    if (activeHoliday) {
      if (type === 'teacher') {
        const teachers = await Teacher.find({ status: 'Active' });
        return res.json(teachers.map(t => ({
          teacher: t,
          status: 'Holiday',
          holidayTitle: activeHoliday.title,
          markedBy: { name: `Holiday: ${activeHoliday.title}` }
        })));
      } else {
        const studentsQuery = { status: 'Active' };
        if (sectionId) studentsQuery.section = sectionId;
        const students = await Student.find(studentsQuery);
        return res.json(students.map(s => ({
          student: s,
          status: 'Holiday',
          holidayTitle: activeHoliday.title,
          markedBy: { name: `Holiday: ${activeHoliday.title}` }
        })));
      }
    }

    if (type === 'teacher') {
      const attendance = await TeacherAttendance.find({ date: searchDate })
        .populate('teacher', 'fullName email gender')
        .populate('markedBy', 'name');
      return res.json(attendance);
    }

    const query = { date: searchDate };
    if (sectionId) {
      const students = await Student.find({ section: sectionId, status: 'Active' });
      query.student = { $in: students.map(s => s._id) };
    }
    const attendance = await Attendance.find(query)
      .populate('student', 'name regNo gender')
      .populate('markedBy', 'name');
    res.json(attendance);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   POST api/attendance
router.post('/', auth, async (req, res) => {
  const { records, date, type } = req.body; // records: [{id, status}]
  try {
    const Settings = require('../models/Settings');
    const settings = await Settings.findOne() || { 
      teacherStartTime: '07:00', teacherEndTime: '10:00', 
      adminStartTime: '00:00', adminEndTime: '23:59' 
    };

    const searchDate = new Date(date);
    searchDate.setUTCHours(0,0,0,0);
    
    // Restriction: Teachers can only mark attendance for the current day
    const now = new Date();
    const kTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
    const karachiNowStr = `${kTime.getUTCFullYear()}-${String(kTime.getUTCMonth() + 1).padStart(2, '0')}-${String(kTime.getUTCDate()).padStart(2, '0')}`;
    const karachiCurrentTime = kTime.getUTCHours() * 60 + kTime.getUTCMinutes();
    
    const today = new Date(kTime);
    today.setUTCHours(0,0,0,0);
    
    const normalizedSearch = new Date(searchDate);
    normalizedSearch.setUTCHours(0,0,0,0);

    // Rule 1: Only today's attendance can be marked
    if (normalizedSearch.getTime() !== today.getTime()) {
      return res.status(403).json({ 
        msg: `Only today's attendance can be marked. (Server Karachi: ${karachiNowStr}, Requested: ${date})` 
      });
    }

    // Rule 2: Timing restrictions
    const timeToMins = (t) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    if (req.user.role === 'teacher') {
      const start = timeToMins(settings.teacherStartTime);
      const end = timeToMins(settings.teacherEndTime);
      if (karachiCurrentTime < start || karachiCurrentTime > end) {
        return res.status(403).json({ msg: `Teachers are only allowed to mark attendance between ${settings.teacherStartTime} and ${settings.teacherEndTime}` });
      }
    } else if (req.user.role === 'admin') {
      const start = timeToMins(settings.adminStartTime);
      const end = timeToMins(settings.adminEndTime);
      if (karachiCurrentTime < start || karachiCurrentTime > end) {
        return res.status(403).json({ msg: `Administrators are only allowed to mark attendance between ${settings.adminStartTime} and ${settings.adminEndTime}` });
      }
    }

    if (normalizedSearch.getUTCDay() === 0) {
      return res.status(400).json({ msg: 'Cannot mark attendance on Sunday' });
    }

    if (type === 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ msg: 'Only admins can mark teacher attendance' });
    }

    // Separate records into marks and unmarks (status=null means deselect/remove)
    const toMark = records.filter(rec => rec.status);
    const toUnmark = records.filter(rec => !rec.status);

    if (toMark.length > 0) {
      const bulkOps = toMark.map(rec => {
        const filter = { date: normalizedSearch };
        if (type === 'teacher') {
          filter.teacher = rec.id;
        } else {
          filter.student = rec.id;
        }

        return {
          updateOne: {
            filter,
            update: { $set: { status: rec.status, markedBy: req.user.id } },
            upsert: true
          }
        };
      });

      if (type === 'teacher') {
        await TeacherAttendance.bulkWrite(bulkOps);
      } else {
        await Attendance.bulkWrite(bulkOps);
      }
    }

    // Delete records for deselected items
    if (toUnmark.length > 0) {
      const ids = toUnmark.map(rec => rec.id);
      if (type === 'teacher') {
        await TeacherAttendance.deleteMany({ date: normalizedSearch, teacher: { $in: ids } });
      } else {
        await Attendance.deleteMany({ date: normalizedSearch, student: { $in: ids } });
      }
    }

    res.json({ msg: 'Attendance updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/attendance/student/:id
// Get all attendance for a specific student, optionally filtered by month/year or range
router.get('/student/:id', auth, async (req, res) => {
  try {
    const { month, year, startMonth, endMonth } = req.query;
    const query = { student: req.params.id };
    let startDate, endDate;

    if (month && year) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
    } else if (startMonth && endMonth) {
      const [sYear, sMonth] = startMonth.split('-').map(Number);
      const [eYear, eMonth] = endMonth.split('-').map(Number);
      startDate = new Date(sYear, sMonth - 1, 1);
      endDate = new Date(eYear, eMonth, 0, 23, 59, 59);
    }

    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    const attendanceRecords = await Attendance.find(query)
      .populate('markedBy', 'name')
      .sort({ date: -1 });

    const student = await Student.findById(req.params.id).select('status name admissionDate');
    if (!student) return res.status(404).json({ msg: 'Student not found' });

    // If a range is provided, generate all days for the history padding
    if (startDate && endDate) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      
      const holidays = await Holiday.find({
        startDate: { $lte: new Date(endDate) },
        endDate: { $gte: new Date(startDate) }
      });

      const paddedAttendance = [];
      const recordMap = {};
      attendanceRecords.forEach(rec => {
        const d = new Date(rec.date);
        d.setUTCHours(0, 0, 0, 0);
        recordMap[d.getTime()] = rec;
      });

      // Loop from latest possible date in range back to earliest
      let current = new Date(endDate);
      if (current > today) current = new Date(today); // Don't pad future dates
      current.setUTCHours(0,0,0,0);

      const earliest = new Date(startDate);
      earliest.setUTCHours(0,0,0,0);

      while (current >= earliest) {
        const time = current.getTime();
        
        // Check dynamic holiday
        const dayHoliday = holidays.find(h => {
          const s = new Date(h.startDate);
          s.setUTCHours(0,0,0,0);
          const e = new Date(h.endDate);
          e.setUTCHours(23,59,59,999);
          return current >= s && current <= e;
        });

        if (dayHoliday) {
          paddedAttendance.push({
            student: student._id,
            date: new Date(current),
            status: 'Holiday',
            holidayTitle: dayHoliday.title,
            isPadding: true
          });
        } else if (recordMap[time]) {
          paddedAttendance.push(recordMap[time]);
        } else if (current.getUTCDay() === 0) {
          // Sunday fallback if no explicit record
          paddedAttendance.push({
            student: student._id,
            date: new Date(current),
            status: 'Sunday',
            isPadding: true
          });
        } else {
          // No record in DB
          let status = 'Not Marked';
          if (student.status !== 'Active') {
             status = student.status; 
          }

          paddedAttendance.push({
            student: student._id,
            date: new Date(current),
            status: status,
            isPadding: true
          });
        }
        current.setDate(current.getDate() - 1);
      }
      return res.json(paddedAttendance);
    }

    res.json(attendanceRecords);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/attendance/teacher/:id
router.get('/teacher/:id', auth, async (req, res) => {
    try {
      const { month, year } = req.query;
      const query = { teacher: req.params.id };
      let startDate, endDate;

      if (month && year) {
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0, 23, 59, 59);
        query.date = { $gte: startDate, $lte: endDate };
      }

      const attendanceRecords = await TeacherAttendance.find(query)
        .populate('markedBy', 'name')
        .sort({ date: -1 });

      const teacher = await Teacher.findById(req.params.id).select('status fullName');
      if (!teacher) return res.status(404).json({ msg: 'Teacher not found' });

      if (startDate && endDate) {
        const today = new Date();
        today.setUTCHours(0,0,0,0);

        const holidays = await Holiday.find({
          startDate: { $lte: new Date(endDate) },
          endDate: { $gte: new Date(startDate) }
        });

        const paddedAttendance = [];
        const recordMap = {};
        attendanceRecords.forEach(rec => {
          const d = new Date(rec.date);
          d.setUTCHours(0, 0, 0, 0);
          recordMap[d.getTime()] = rec;
        });

        let current = new Date(endDate);
        if (current > today) current = new Date(today);
        current.setUTCHours(0,0,0,0);

        const earliest = new Date(startDate);
        earliest.setUTCHours(0,0,0,0);

        while (current >= earliest) {
          const time = current.getTime();

          const dayHoliday = holidays.find(h => {
            const s = new Date(h.startDate);
            s.setUTCHours(0,0,0,0);
            const e = new Date(h.endDate);
            e.setUTCHours(23,59,59,999);
            return current >= s && current <= e;
          });

          if (dayHoliday) {
            paddedAttendance.push({
              teacher: teacher._id,
              date: new Date(current),
              status: 'Holiday',
              holidayTitle: dayHoliday.title,
              isPadding: true
            });
          } else if (recordMap[time]) {
            paddedAttendance.push(recordMap[time]);
          } else if (current.getUTCDay() === 0) {
            paddedAttendance.push({
              teacher: teacher._id,
              date: new Date(current),
              status: 'Sunday',
              isPadding: true
            });
          } else {
            let status = 'Not Marked';
            if (teacher.status !== 'Active') {
              status = teacher.status;
            }

            paddedAttendance.push({
              teacher: teacher._id,
              date: new Date(current),
              status: status,
              isPadding: true
            });
          }
          current.setDate(current.getDate() - 1);
        }
        return res.json(paddedAttendance);
      }
      res.json(attendanceRecords);
    } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
    }
});

// @route   GET api/attendance/summary
// Get monthly attendance summary for student/class/section within a range
router.get('/summary', auth, async (req, res) => {
  const { studentId, teacherId, classId, sectionId, startMonth, endMonth } = req.query;
  try {
     const [sYear, sMonth] = startMonth.split('-').map(Number);
     const [eYear, eMonth] = endMonth.split('-').map(Number);
     const startDate = new Date(sYear, sMonth - 1, 1);
     const endDate = new Date(eYear, eMonth, 0, 23, 59, 59);

     const query = { date: { $gte: startDate, $lte: endDate } };
     let Model = Attendance;
     
     if (studentId) {
        query.student = studentId;
     } else if (teacherId) {
        query.teacher = teacherId;
        Model = TeacherAttendance;
     } else if (sectionId) {
        const students = await Student.find({ section: sectionId });
        query.student = { $in: students.map(s => s._id) };
     } else if (classId) {
        const students = await Student.find({ class: classId });
        query.student = { $in: students.map(s => s._id) };
     }

     const records = await Model.find(query).sort({ date: 1 });
     
     // Detailed metrics for Class/Section overview
     let topStudents = [];
     let sectionPerformance = [];
     let overallAvg = 0;

     if (classId && !studentId && !teacherId) {
        // Calculate Top Students for the range
        const studentStats = {};
        records.forEach(r => {
           const stId = r.student.toString();
           if (!studentStats[stId]) studentStats[stId] = { points: 0, total: 0 };
           studentStats[stId].total++;
           if (r.status === 'Present' || r.status === 'Late') studentStats[stId].points++;
           else if (r.status === 'Half Leave') studentStats[stId].points += 0.5;
        });

        const studentsData = await Student.find({ class: classId })
           .populate('section', 'name')
           .select('name fatherName regNo gender section');

        topStudents = studentsData.map(s => {
           const stats = studentStats[s._id.toString()];
           return {
              studentId: s._id,
              name: s.name,
              fatherName: s.fatherName,
              gender: s.gender,
              sectionName: s.section ? s.section.name : 'N/A',
              percentage: stats && stats.total > 0 ? (stats.points / stats.total) * 100 : 0
           };
        })
        .filter(s => s.percentage > 0) // Only show students who have actually attended/have points
        .sort((a, b) => b.percentage - a.percentage).slice(0, 10);

        // Calculate Section Performance
        const secStats = {};
        records.forEach(r => {
           // We need to know which section the student belongs to
           // This requires mapping student -> section
        });
        // Since we already have studentsData with sections:
        const studentToSection = {};
        studentsData.forEach(s => {
           if (s.section) studentToSection[s._id.toString()] = s.section.name;
        });

        records.forEach(r => {
           const secName = studentToSection[r.student.toString()];
           if (secName) {
              if (!secStats[secName]) secStats[secName] = { points: 0, total: 0 };
              secStats[secName].total++;
              if (r.status === 'Present' || r.status === 'Late') secStats[secName].points++;
              else if (r.status === 'Half Leave') secStats[secName].points += 0.5;
           }
        });

        sectionPerformance = Object.keys(secStats).map(name => ({
           name,
           percentage: (secStats[name].points / secStats[name].total) * 100
        }));

        const totalPoints = records.reduce((acc, r) => acc + (r.status === 'Present' || r.status === 'Late' ? 1 : r.status === 'Half Leave' ? 0.5 : 0), 0);
        overallAvg = records.length > 0 ? (totalPoints / records.length) * 100 : 0;
     }

     // Group by label (either date or month)
     const chartSummary = {};
     let current = new Date(startDate);
     const today = new Date();
     today.setUTCHours(0,0,0,0);

     while (current <= endDate) {
        let label;
        if (startMonth === endMonth) {
           // Only show days up to today if we are in the current month
           if (current > today && current.getMonth() === today.getMonth() && current.getFullYear() === today.getFullYear()) {
              break; 
           }
           label = current.getDate().toString();
           current.setDate(current.getDate() + 1);
        } else {
           label = current.toISOString().slice(0, 7);
           current.setMonth(current.getMonth() + 1);
        }
        chartSummary[label] = { points: 0, total: 0 };
     }

     records.forEach(r => {
        let label;
        if (startMonth === endMonth) {
           label = new Date(r.date).getDate().toString();
        } else {
           label = r.date.toISOString().slice(0, 7);
        }

        if (chartSummary[label]) {
           chartSummary[label].total++;
           if (r.status === 'Present' || r.status === 'Late') chartSummary[label].points++;
           else if (r.status === 'Half Leave') chartSummary[label].points += 0.5;
        }
     });

     const chartData = Object.keys(chartSummary).sort((a, b) => {
        if (startMonth === endMonth) return parseInt(a) - parseInt(b);
        return a.localeCompare(b);
     }).map(label => ({
        month: label,
        percentage: chartSummary[label].total > 0 ? parseFloat((chartSummary[label].points / chartSummary[label].total * 100).toFixed(1)) : 0
     }));

     if (classId && !studentId && !teacherId) {
        return res.json({
           growth: chartData,
           topStudents,
           sectionPerformance,
           overallAvg: overallAvg.toFixed(1)
        });
     }

     res.json(chartData);
  } catch (err) {
     res.status(500).send('Server Error');
  }
});

// @route   GET api/attendance/school-wide
// Returns all active items and their attendance status for a specific date
router.get('/school-wide', auth, async (req, res) => {
  let { date, type, classId, sectionId } = req.query;
  try {
    // Fixed: Ensure we use Karachi timezone if date is not provided
    if (!date) {
      const now = new Date(new Date().getTime() + (5 * 60 * 60 * 1000));
      date = now.toISOString().split('T')[0];
    }
    
    const searchDate = new Date(date);
    searchDate.setUTCHours(0,0,0,0);

    if (type === 'teacher') {
      if (req.user.role === 'teacher') return res.status(403).json({ msg: 'Access denied' });
      
      // Teachers usually small list, keep as is but optimize query
      let teachers = await Teacher.find({ 
        status: { $nin: ['Inactive', 'Resigned', 'Passed Out', 'Expelled'] } 
      }).sort({ fullName: 1 }).select('fullName email status gender');
      
      const attendanceRecords = await TeacherAttendance.find({ date: searchDate }).populate('markedBy', 'name');
      
      const attendanceMap = {};
      attendanceRecords.forEach(rec => {
        if (rec.teacher) attendanceMap[rec.teacher.toString()] = { status: rec.status, markedBy: rec.markedBy?.name || 'Admin', markedAt: rec.createdAt };
      });

      const result = teachers.map(t => ({
        teacher: t,
        status: attendanceMap[t._id.toString()]?.status || null,
        markedBy: attendanceMap[t._id.toString()]?.markedBy || '',
        markedAt: attendanceMap[t._id.toString()]?.markedAt || null
      }));
      return res.json(result);
    }

    // Student optimization: Filter by class/section if provided
    let sQuery = { status: 'Active' };
    
    // If teacher, force their assigned section
    if (req.user.role === 'teacher') {
      const teacher = await Teacher.findOne({ user: req.user.id });
      if (!teacher) return res.status(404).json({ message: 'Teacher profile not found' });
      
      const managedSections = await Section.find({ classTeacher: teacher._id });
      const managedSectionIds = managedSections.map(s => s._id);
      sQuery.section = { $in: managedSectionIds };
    } else {
      if (classId) sQuery.class = classId;
      if (sectionId) sQuery.section = sectionId;
    }

    let students = await Student.find(sQuery)
      .populate('class', 'name')
      .populate('section', 'name')
      .select('name regNo class section status gender fatherName phone');

    const attendanceRecords = await Attendance.find({ 
      date: searchDate,
      student: { $in: students.map(s => s._id) }
    }).populate('markedBy', 'name');

    const attendanceMap = {};
    attendanceRecords.forEach(rec => {
      if (rec.student) attendanceMap[rec.student.toString()] = { status: rec.status, markedBy: rec.markedBy?.name || 'Admin', markedAt: rec.createdAt };
    });

    const result = students.map(st => ({
      student: st,
      status: attendanceMap[st._id.toString()]?.status || null,
      markedBy: attendanceMap[st._id.toString()]?.markedBy || '',
      markedAt: attendanceMap[st._id.toString()]?.markedAt || null
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
