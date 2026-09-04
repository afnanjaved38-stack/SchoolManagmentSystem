const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Teacher = require('../models/Teacher');
const Section = require('../models/Section');
const TeacherAttendance = require('../models/TeacherAttendance');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// @route   GET api/teachers
router.get('/', auth, async (req, res) => {
  try {
    const teachers = await Teacher.find().sort({ fullName: 1 });
    res.json(teachers);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   GET api/teachers/my-schedule
// Get my schedule (for logged in teacher)
router.get('/my-schedule', auth, async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ user: req.user.id });
        if (!teacher) return res.status(404).json({ message: 'Teacher profile not found' });

        const sections = await Section.find()
            .populate('class', 'name')
            .lean();

        const schedule = {
            'Monday': [], 'Tuesday': [], 'Wednesday': [], 'Thursday': [], 'Friday': [], 'Saturday': [], 'Sunday': []
        };

        sections.forEach(section => {
            if (section.schedules) {
                section.schedules.forEach(sch => {
                    sch.days.forEach(day => {
                        sch.periods.forEach(p => {
                            if (p.teacher && p.teacher.toString() === teacher._id.toString()) {
                                schedule[day].push({
                                    time: p.startTime,
                                    endTime: p.endTime,
                                    subject: p.subject,
                                    sectionName: section.name,
                                    className: section.class?.name,
                                    sectionId: section._id
                                });
                            }
                        });
                    });
                });
            }
        });

        // Sort each day by time
        Object.keys(schedule).forEach(day => {
            schedule[day].sort((a, b) => a.time.localeCompare(b.time));
        });

        res.json(schedule);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get schedule for any teacher
router.get('/:id/schedule', auth, async (req, res) => {
    try {
        const teacherId = req.params.id;
        const sections = await Section.find()
            .populate('class', 'name')
            .lean();

        // Let's return categorized schedules by session name
        const sessions = {}; // { "Session Name": [periods] }

        sections.forEach(section => {
            const schedules = section.schedules || [];
            
            schedules.forEach(sch => {
                sch.periods.forEach(p => {
                    if (p.teacher && p.teacher.toString() === teacherId) {
                        const sessionName = sch.name || 'Standard';
                        if (!sessions[sessionName]) {
                            sessions[sessionName] = {
                                name: sessionName,
                                days: sch.days,
                                periods: []
                            };
                        }
                        
                        sessions[sessionName].periods.push({
                            subject: p.subject,
                            startTime: p.startTime,
                            endTime: p.endTime,
                            className: section.class?.name,
                            sectionName: section.name,
                            sectionId: section._id,
                            days: sch.days // matched to the session's days
                        });
                    }
                });
            });
        });

        // Convert sessions object to sorted array and sort periods within each
        const timeToNum = (t) => {
            if (!t) return 0;
            const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
            if (!match) return 0;
            let [_, hours, minutes, modifier] = match;
            if (hours === '12') hours = '00';
            let h = parseInt(hours, 10);
            if (modifier.toUpperCase() === 'PM') h += 12;
            return h * 60 + parseInt(minutes, 10);
        };

        const result = Object.values(sessions).map(session => {
            session.periods.sort((a, b) => timeToNum(a.startTime) - timeToNum(b.startTime));
            return session;
        });

        // Sort sessions alphabetically or prioritize "Standard"
        result.sort((a, b) => {
            if (a.name.toLowerCase() === 'standard') return -1;
            if (b.name.toLowerCase() === 'standard') return 1;
            return a.name.localeCompare(b.name);
        });

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

// @route   GET api/teachers/:id
router.get('/:id', auth, async (req, res) => {
  try {
    // Determine which user fields to populate based on requester role
    const userFields = req.user.role === 'admin' ? 'email name plainPassword' : 'email name';
    
    const teacher = await Teacher.findById(req.params.id).populate('user', userFields);
    if (!teacher) return res.status(404).json({ message: 'Teacher not found' });
    
    // Find sections where this teacher is class teacher
    const sections = await Section.find({ classTeacher: teacher._id }).populate('class', 'name');
    
    // Lifetime Attendance Calculations
    const allRecords = await TeacherAttendance.find({ teacher: teacher._id });
    const totalRecords = allRecords.length;
    
    // Calculate attendance points: Present=1, Late=1, Half Leave=0.5, else 0
    const attendancePoints = allRecords.reduce((acc, rec) => {
      if (rec.status === 'Present' || rec.status === 'Late') return acc + 1;
      if (rec.status === 'Half Leave') return acc + 0.5;
      return acc;
    }, 0);

    const attendanceRate = totalRecords > 0 ? Math.round((attendancePoints / totalRecords) * 100) : 0;

    res.json({
        ...teacher.toObject(),
        managedSections: sections,
        attendanceRate
    });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/teachers/:id
router.put('/:id', [auth, roleCheck('admin')], async (req, res) => {
    try {
        const { fullName, email, phone, password, status, gender, qualifications, subjects } = req.body;
        
        let teacher = await Teacher.findById(req.params.id);
        if (!teacher) return res.status(404).json({ message: 'Teacher not found' });

        // Update Teacher Profile
        teacher.fullName = fullName || teacher.fullName;
        teacher.email = email || teacher.email;
        teacher.phone = phone || teacher.phone;
        teacher.status = status || teacher.status;
        teacher.gender = gender || teacher.gender;
        if (qualifications) {
            teacher.qualifications = Array.isArray(qualifications) ? qualifications : qualifications.split(',').map(s => s.trim());
        }
        if (subjects) {
            teacher.subjects = Array.isArray(subjects) ? subjects : subjects.split(',').map(s => s.trim());
        }
        await teacher.save();

        // Update User
        if (teacher.user) {
            const user = await User.findById(teacher.user);
            if (user) {
                user.name = fullName || user.name;
                user.email = email || user.email;
                if (password) {
                    user.password = password; // Will be hashed by pre-save hook
                    user.plainPassword = password; // Visible for eye reveal
                }
                await user.save();
            }
        }

        res.json(teacher);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

router.post('/', [auth, roleCheck('admin')], async (req, res) => {
  const { fullName, email, phone, password, gender, qualifications, subjects } = req.body;
  try {
    // Create User first
    const user = new User({
      name: fullName,
      email,
      password,
      plainPassword: password,
      role: 'teacher'
    });
    await user.save();

    // Create Teacher profile
    const teacher = new Teacher({
      fullName,
      email,
      phone,
      gender,
      qualifications: qualifications.split(',').map(s => s.trim()),
      subjects: subjects.split(',').map(s => s.trim()),
      user: user._id
    });
    await teacher.save();

    // Link back to User
    user.teacherProfile = teacher._id;
    await user.save();

    res.json(teacher);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/teachers/:id
router.delete('/:id', [auth, roleCheck('admin')], async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) return res.status(404).json({ msg: 'Teacher not found' });

    // 1. Permanently Delete Teacher
    const teacherId = teacher._id;
    const userId = teacher.user;

    await Teacher.findByIdAndDelete(teacherId);

    // 2. Clear related records
    await TeacherAttendance.deleteMany({ teacher: teacherId });

    // 3. Remove from managed sections
    await Section.updateMany(
      { classTeacher: teacherId },
      { $unset: { classTeacher: "" } }
    );

    // 3. Remove from periods in sections (to stop showing in current schedules)
    const sections = await Section.find({ "periods.teacher": teacherId });
    for (let sec of sections) {
        sec.periods = sec.periods.filter(p => p.teacher.toString() !== teacherId.toString());
        await sec.save();
    }

    // 4. Delete corresponding user account
    if (userId) {
      await User.findByIdAndDelete(userId);
    }

    res.json({ msg: 'Teacher and associated user account permanently deleted.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
