const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Teacher = require('../models/Teacher');
const Class = require('../models/Class');
const Section = require('../models/Section');
const TeacherAttendance = require('../models/TeacherAttendance');
const Substitution = require('../models/Substitution');
const roleCheck = require('../middleware/roleCheck');

// Get absent staff and their schedule for today
router.get('/absent-staff', auth, async (req, res) => {
    try {
        const { date } = req.query;
        let targetDate;
        if (date) {
            targetDate = new Date(date);
        } else {
            const now = new Date();
            const kTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
            targetDate = new Date(`${kTime.getUTCFullYear()}-${String(kTime.getUTCMonth() + 1).padStart(2, '0')}-${String(kTime.getUTCDate()).padStart(2, '0')}`);
        }
        targetDate.setUTCHours(0,0,0,0);
        
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const currentDay = dayNames[targetDate.getDay()];

        // 1. Find teachers absent or on leave today
        const attendance = await TeacherAttendance.find({
            date: targetDate,
            status: { $in: ['Absent', 'Leave', 'Half Leave'] }
        }).populate('teacher');

        const absentTeachers = attendance.map(a => a.teacher).filter(t => t !== null);
        const absentTeacherIds = absentTeachers.map(t => t._id.toString());

        // 2. Find all periods assigned to these teachers today
        const sections = await Section.find().populate('class', 'name');
        
        const result = absentTeachers.map(teacher => {
            const schedule = [];
            const teacherId = teacher._id.toString();

            sections.forEach(section => {
                // Check in new schedules format
                const activeSchedules = (section.schedules || []).filter(s => s.days.includes(currentDay));
                activeSchedules.forEach(sch => {
                    sch.periods.forEach(p => {
                        if (p.teacher && p.teacher.toString() === teacherId) {
                            schedule.push({
                                subject: p.subject,
                                startTime: p.startTime,
                                endTime: p.endTime,
                                className: section.class?.name,
                                sectionName: section.name,
                                sectionId: section._id,
                                classId: section.class?._id
                            });
                        }
                    });
                });

                // Check in legacy periods format
                if (!section.schedules || section.schedules.length === 0) {
                    (section.periods || []).forEach(p => {
                        if (p.teacher && p.teacher.toString() === teacherId) {
                             // Legacy might not have day filtering, assume it applies if no schedules exist
                             // but usually we should have schedules now.
                             schedule.push({
                                subject: p.subject,
                                startTime: p.startTime,
                                endTime: p.endTime,
                                className: section.class?.name,
                                sectionName: section.name,
                                sectionId: section._id,
                                classId: section.class?._id
                            });
                        }
                    });
                }
            });

            // Sort schedule by time
            schedule.sort((a, b) => a.startTime.localeCompare(b.startTime));

            return {
                ...teacher.toObject(),
                schedule
            };
        });

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

// Get already assigned substitutions for today
router.get('/today', auth, async (req, res) => {
    try {
        const { date } = req.query;
        let targetDate;
        if (date) {
            targetDate = new Date(date);
        } else {
            const now = new Date();
            const kTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
            targetDate = new Date(`${kTime.getUTCFullYear()}-${String(kTime.getUTCMonth() + 1).padStart(2, '0')}-${String(kTime.getUTCDate()).padStart(2, '0')}`);
        }
        targetDate.setUTCHours(0,0,0,0);
        
        const subs = await Substitution.find({ date: targetDate })
            .populate('originalTeacher', 'fullName')
            .populate('substituteTeacher', 'fullName')
            .populate('class', 'name')
            .populate('section', 'name');
            
        res.json(subs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
// @route   GET api/substitutions/my-assignments
// Get substitutions assigned TO the logged-in teacher for today
router.get('/my-assignments', auth, async (req, res) => {
    try {
        const teacher = await Teacher.findOne({ user: req.user.id });
        if (!teacher) return res.status(404).json({ message: 'Teacher profile not found' });

        // Fixed: Use Karachi timezone for server-side "Today"
        const now = new Date();
        const kTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
        const karachiNowStr = `${kTime.getUTCFullYear()}-${String(kTime.getUTCMonth() + 1).padStart(2, '0')}-${String(kTime.getUTCDate()).padStart(2, '0')}`;
        
        const today = new Date(karachiNowStr);
        today.setUTCHours(0,0,0,0);

        const mySubs = await Substitution.find({
            substituteTeacher: teacher._id,
            date: today
        })
        .populate('originalTeacher', 'fullName')
        .populate('class', 'name')
        .populate('section', 'name')
        .lean();

        res.json(mySubs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
// Create a new substitution
router.post('/', [auth, roleCheck('admin')], async (req, res) => {
    try {
        const { originalTeacherId, substituteTeacherId, classId, sectionId, subject, time, date } = req.body;
        
        let targetDate;
        if (date) {
            targetDate = new Date(date);
        } else {
            // Use Karachi timezone for server-side "Today"
            const now = new Date();
            const kTime = new Date(now.getTime() + (5 * 60 * 60 * 1000));
            const karachiNowStr = `${kTime.getUTCFullYear()}-${String(kTime.getUTCMonth() + 1).padStart(2, '0')}-${String(kTime.getUTCDate()).padStart(2, '0')}`;
            targetDate = new Date(karachiNowStr);
        }
        targetDate.setUTCHours(0,0,0,0);

        const substitution = new Substitution({
            date: targetDate,
            originalTeacher: originalTeacherId,
            substituteTeacher: substituteTeacherId,
            class: classId,
            section: sectionId,
            subject,
            time
        });

        await substitution.save();
        res.json(substitution);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get substitution suggestions (Available teachers for a specific slot)
router.get('/suggestions', auth, async (req, res) => {
    try {
        const { day, time, date } = req.query; // e.g., day="Wednesday", time="09:00 AM"
        
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

        const targetTime = timeToNum(time);

        // 1. Get all active teachers
        const teachers = await Teacher.find({ 
            status: { $in: ['Active', 'On Leave', 'Suspended', null] } 
        });
        
        const targetDate = date ? new Date(date) : new Date();
        targetDate.setUTCHours(0,0,0,0);

        // 2. Get teachers who are absent today
        const attendance = await TeacherAttendance.find({
            date: targetDate,
            status: { $in: ['Absent', 'Leave', 'Half Leave'] }
        });
        const absentIds = attendance.map(a => a.teacher.toString());

        // 3. Get teachers who are already busy at this time
        const busyIds = [];
        const sections = await Section.find();
        sections.forEach(sec => {
            const activeSchedules = (sec.schedules || []).filter(s => s.days.includes(day));
            activeSchedules.forEach(sch => {
                sch.periods.forEach(p => {
                    const start = timeToNum(p.startTime);
                    const end = timeToNum(p.endTime);
                    
                    // If target time falls within this period
                    if (targetTime >= start && targetTime < end) {
                        if (p.teacher) busyIds.push(p.teacher.toString());
                    }
                });
            });
        });

        // 4. Get teachers already assigned a substitution at this time
        const subs = await Substitution.find({ date: targetDate, time });
        const subBusyIds = subs.map(s => s.substituteTeacher.toString());

        const suggestions = teachers.map(t => {
            const tid = t._id.toString();
            let status = 'Available';
            let isAvailable = true;

            if (absentIds.includes(tid)) {
                status = 'Absent';
                isAvailable = false;
            } else if (busyIds.includes(tid)) {
                status = 'Busy (Reg. Class)';
                isAvailable = false;
            } else if (subBusyIds.includes(tid)) {
                status = 'Busy (Substitution)';
                isAvailable = false;
            }

            return {
                ...t.toObject(),
                status,
                isAvailable
            };
        });

        res.json(suggestions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
