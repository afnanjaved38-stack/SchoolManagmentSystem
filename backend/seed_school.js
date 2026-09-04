/**
 * CampusCore - Realistic School Data Seeder
 * Usage:
 *   node seed_school.js          → seed only if no students exist
 *   node seed_school.js --fresh  → wipe academic data & reseed
 *
 * Creates ~300 students across grades with ~5 months of:
 * attendance, fees/vouchers, diaries, assignments, class tests,
 * plus 2 conducted exam terms with marks.
 *
 * Admin: afnanjaved38@gmail.com / Admin123 (or ADMIN_* from .env)
 * Teachers: portal logins generated from names (password Teacher123)
 * Students/Parents: NO seeded portal accounts — create from Admin portal
 */
require('dotenv').config();
const mongoose = require('mongoose');

const Class = require('./models/Class');
const Section = require('./models/Section');
const Student = require('./models/Student');
const Teacher = require('./models/Teacher');
const Attendance = require('./models/Attendance');
const TeacherAttendance = require('./models/TeacherAttendance');
const FeeRecord = require('./models/FeeRecord');
const Substitution = require('./models/Substitution');
const GlobalSession = require('./models/GlobalSession');
const Settings = require('./models/Settings');
const User = require('./models/User');
const AcademicYear = require('./models/AcademicYear');
const ExamTerm = require('./models/ExamTerm');
const ExamResult = require('./models/ExamResult');
const Diary = require('./models/Diary');
const Assignment = require('./models/Assignment');
const ClassTest = require('./models/ClassTest');
const Holiday = require('./models/Holiday');

const FRESH = process.argv.includes('--fresh');
const TEACHER_PASSWORD = 'Teacher123';
const TARGET_STUDENTS = 300;

const TEACHING_STAFF = [
  { name: 'Aqsa Yaseen', gender: 'Female', subjects: ['Islamiyat', 'Urdu', 'Pakistan Studies'], qualifications: ['BA (Islamiyat)'] },
  { name: 'Asia Mushtaq', gender: 'Female', subjects: ['Science', 'Biology'], qualifications: ['FSc (Medical)'] },
  { name: 'Ayesha Akbar', gender: 'Female', subjects: ['Science', 'English', 'Biology', 'Urdu'], qualifications: ['MSc (Zoology)'] },
  { name: 'Eman Mustafa', gender: 'Female', subjects: ['Urdu', 'English', 'Arts'], qualifications: ['FA'] },
  { name: 'Fatima Munir', gender: 'Female', subjects: ['Biology', 'Science'], qualifications: ['FSc (Pre Medical)'] },
  { name: 'Khadija Shareef', gender: 'Female', subjects: ['Islamiyat', 'Urdu', 'Tarjma tul Quran'], qualifications: ['Matric (Islamic)'] },
  { name: 'Misbah Shoukat', gender: 'Female', subjects: ['Urdu', 'English', 'Pakistan Studies'], qualifications: ['FSc (Pre Medical)'] },
  { name: 'Rifat Ashiq', gender: 'Female', subjects: ['Biology', 'Physics', 'Science'], qualifications: ['FSc (Pre Medical)'] },
  { name: 'Samra Mansha', gender: 'Female', subjects: ['Computer', 'Science', 'English', 'Mathematics'], qualifications: ['ICS (Physics)'] },
  { name: 'Samra Perwez', gender: 'Female', subjects: ['English', 'Pakistan Studies', 'Science'], qualifications: ['BBA (HRM)'] },
  { name: 'Shabana Munir', gender: 'Female', subjects: ['Mathematics', 'Physics', 'Computer'], qualifications: ['BSc (Double Math, Physics)'] },
  { name: 'Uzma Mustafa', gender: 'Female', subjects: ['Islamiyat', 'Quran Nazra'], qualifications: ['FA (Islamiyat)'] },
  { name: 'Zoha Mushtaq', gender: 'Female', subjects: ['Science', 'English', 'Urdu'], qualifications: ['FSc (Pre Medical)'] },
  { name: 'Hira Malik', gender: 'Female', subjects: ['English', 'Urdu', 'Mathematics'], qualifications: ['BA (English)'] },
  { name: 'Maryam Ahmed', gender: 'Female', subjects: ['Mathematics', 'Science'], qualifications: ['BSc (Math)'] },
  { name: 'Nimra Khan', gender: 'Female', subjects: ['Computer', 'Mathematics'], qualifications: ['BS (IT)'] },
  { name: 'Maher Munir', gender: 'Male', subjects: ['Computer', 'Mathematics', 'English'], qualifications: ['BS (Information Technology)'] },
  { name: 'Muhammad Yahya', gender: 'Male', subjects: ['Islamiyat', 'Urdu'], qualifications: ['B.Ed (Islamiyat)'] },
  { name: 'Munib Naeem', gender: 'Male', subjects: ['Physics', 'Mathematics'], qualifications: ['FSc'] },
  { name: 'Rashid Mehmood', gender: 'Male', subjects: ['Mathematics', 'Physics', 'Chemistry', 'English'], qualifications: ['BS (Math)', 'B.Ed'] },
  { name: 'Muhammad Jangeer', gender: 'Male', subjects: ['Security'], qualifications: ['Non Teaching'], login: false },
  { name: 'Asma Azam', gender: 'Female', subjects: ['Administration'], qualifications: ['Non Teaching Staff'], login: false },
  { name: 'Fiza Tyyab', gender: 'Female', subjects: ['Administration'], qualifications: ['Non Teaching Staff'], login: false },
  { name: 'Sobia Bibi', gender: 'Female', subjects: ['Administration'], qualifications: ['Non Teaching Staff'], login: false },
  { name: 'Ali Hassan', gender: 'Male', subjects: ['English', 'Urdu'], qualifications: ['MA (English)'] },
  { name: 'Usman Khan', gender: 'Male', subjects: ['Mathematics', 'Physics'], qualifications: ['MSc (Physics)'] },
  { name: 'Hamza Malik', gender: 'Male', subjects: ['Chemistry', 'Science'], qualifications: ['MSc (Chemistry)'] },
  { name: 'Bilal Sheikh', gender: 'Male', subjects: ['Computer', 'Mathematics'], qualifications: ['BS (CS)'] },
  { name: 'Hassan Raza', gender: 'Male', subjects: ['Biology', 'Science'], qualifications: ['MSc (Botany)'] },
  { name: 'Saad Hussain', gender: 'Male', subjects: ['English', 'Pakistan Studies'], qualifications: ['BA', 'B.Ed'] },
  { name: 'Imran Akhtar', gender: 'Male', subjects: ['Urdu', 'Islamiyat'], qualifications: ['MA (Urdu)'] },
  { name: 'Zain Abbas', gender: 'Male', subjects: ['Mathematics', 'Statistics'], qualifications: ['BS (Math)'] },
  { name: 'Arslan Ahmed', gender: 'Male', subjects: ['Physics', 'Science'], qualifications: ['MSc (Physics)'] },
  { name: 'Farhan Ali', gender: 'Male', subjects: ['English', 'Computer'], qualifications: ['BS (English)'] },
  { name: 'Kamran Hussain', gender: 'Male', subjects: ['Chemistry', 'Physics'], qualifications: ['MSc (Chemistry)'] },
  { name: 'Naveed Hussain', gender: 'Male', subjects: ['Mathematics', 'Computer'], qualifications: ['BS (Math)'] },
  { name: 'Waqas Ahmed', gender: 'Male', subjects: ['Biology', 'Chemistry'], qualifications: ['MSc (Zoology)'] },
  { name: 'Yasir Ali', gender: 'Male', subjects: ['Urdu', 'Pakistan Studies'], qualifications: ['MA (Urdu)'] }
];

const MALE_NAMES = [
  'Muhammad Ahmed', 'Abdullah Khan', 'Ahmad Ali', 'Rayyan Ahmed', 'Ibrahim Khan',
  'Abdul Rehman', 'Moiz Ali', 'Danish Ahmed', 'Shahzaib Khan', 'Waleed Hassan',
  'Taimoor Ali', 'Haris Malik', 'Umar Farooq', 'Talha Sheikh', 'Zeeshan Ali',
  'Noman Ahmed', 'Asad Khan', 'Junaid Malik', 'Adnan Khan', 'Rizwan Ahmed',
  'Hassan Raza', 'Faizan Ali', 'Sufyan Khan', 'Ayan Malik', 'Huzaifa Ahmed',
  'Murtaza Ali', 'Sameer Khan', 'Yousaf Ahmed', 'Rehan Malik', 'Basit Ali'
];

const FEMALE_NAMES = [
  'Zainab Hussain', 'Sana Sheikh', 'Mahnoor Ali', 'Iqra Ahmed', 'Amina Khan',
  'Hafsa Malik', 'Rabia Ahmed', 'Sadaf Hussain', 'Saba Ali', 'Noor Fatima',
  'Alisha Ahmed', 'Hania Khan', 'Laiba Sheikh', 'Areeba Malik', 'Sadia Ahmed',
  'Nida Khan', 'Saima Ali', 'Bushra Hussain', 'Farah Ahmed', 'Samina Khan',
  'Eman Fatima', 'Mehwish Ali', 'Khadija Ahmed', 'Maryam Sheikh', 'Dua Malik',
  'Hoorain Khan', 'Ayesha Noor', 'Fatima Zahra', 'Sundas Ali', 'Rimsha Ahmed'
];

const FATHER_NAMES = [
  'Muhammad Aslam', 'Abdul Ghafoor', 'Muhammad Ramzan', 'Ghulam Abbas', 'Muhammad Yousaf',
  'Abdul Hameed', 'Muhammad Iqbal', 'Muhammad Ashraf', 'Abdul Majeed', 'Muhammad Shabbir',
  'Muhammad Akram', 'Abdul Razzaq', 'Muhammad Tariq', 'Muhammad Nadeem', 'Abdul Karim',
  'Shahid Mehmood', 'Javed Iqbal', 'Nasir Ali', 'Pervaiz Ahmed', 'Iftikhar Hussain'
];

const CASTES = ['Rajput', 'Jutt', 'Arain', 'Mughal', 'Kashmiri', 'Pathan', 'Syed', 'Malik'];
const FINE_TYPES = ['Late Fee Fine', 'Library Fine', 'Discipline Fine', 'Lab Fine', 'Uniform Fine'];
const SECTION_LABELS = ['A', 'B', 'C'];

// ~35 sections × ~9 students ≈ 300
const CLASS_CONFIG = [
  { name: 'Play Group', sections: 2, tuition: 2500, admission: 3000, exam: 500 },
  { name: 'Nursery', sections: 2, tuition: 2800, admission: 3500, exam: 600 },
  { name: 'Prep', sections: 3, tuition: 3000, admission: 4000, exam: 700 },
  { name: 'Class 1', sections: 3, tuition: 3500, admission: 5000, exam: 800 },
  { name: 'Class 2', sections: 3, tuition: 3800, admission: 5000, exam: 800 },
  { name: 'Class 3', sections: 3, tuition: 4000, admission: 5500, exam: 900 },
  { name: 'Class 4', sections: 3, tuition: 4200, admission: 5500, exam: 900 },
  { name: 'Class 5', sections: 3, tuition: 4500, admission: 6000, exam: 1000 },
  { name: 'Class 6', sections: 3, tuition: 5000, admission: 6500, exam: 1200 },
  { name: 'Class 7', sections: 2, tuition: 5500, admission: 7000, exam: 1300 },
  { name: 'Class 8', sections: 2, tuition: 6000, admission: 7500, exam: 1400 },
  { name: 'Class 9', sections: 2, tuition: 7000, admission: 8000, exam: 1500 },
  { name: 'Class 10', sections: 2, tuition: 7500, admission: 8500, exam: 1600 }
];

const TOTAL_SECTIONS = CLASS_CONFIG.reduce((s, c) => s + c.sections, 0);
const STUDENTS_PER_SECTION = Math.max(8, Math.round(TARGET_STUDENTS / TOTAL_SECTIONS));

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rand(0, arr.length - 1)];
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);

function phone() {
  const prefixes = ['0300', '0301', '0302', '0303', '0310', '0312', '0321', '0333', '0345'];
  return `${pick(prefixes)}${rand(1000000, 9999999)}`;
}

function cnic() {
  return `${rand(35201, 36603)}-${rand(1000000, 9999999)}-${rand(1, 9)}`;
}

function emailFromName(name, idx) {
  const base = name.toLowerCase().replace(/[^a-z\s]/g, '').trim().replace(/\s+/g, '.');
  return `${base}${idx > 0 ? idx : ''}@school.demo`;
}

function schoolDaysBetween(start, end) {
  const days = [];
  const cur = new Date(start);
  cur.setUTCHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setUTCHours(0, 0, 0, 0);
  while (cur <= last) {
    if (cur.getUTCDay() !== 0) days.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

function lastNMonths(n) {
  const months = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

function attendanceStatus(studentRate) {
  const r = Math.random();
  if (r < studentRate) return 'Present';
  if (r < studentRate + 0.04) return 'Late';
  if (r < studentRate + 0.07) return 'Leave';
  if (r < studentRate + 0.085) return 'Half Leave';
  return 'Absent';
}

function to12h(totalMinutes) {
  const h24 = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  let h = h24 % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

function buildTimeSlots(count) {
  const slots = [];
  let mins = 8 * 60;
  for (let i = 0; i < count; i++) {
    const start = mins;
    mins += 40;
    const end = mins;
    mins += 10;
    slots.push({ startTime: to12h(start), endTime: to12h(end) });
  }
  return slots;
}

function subjectsForClass(className) {
  const n = className.toLowerCase();
  if (n.includes('play') || n.includes('nursery')) {
    return ['English', 'Urdu', 'Mathematics', 'Drawing & Activities'];
  }
  if (n.includes('prep') || /class [12]/.test(n)) {
    return ['English', 'Urdu', 'Mathematics', 'Islamiyat', 'General Knowledge'];
  }
  if (/class [345]/.test(n)) {
    return ['English', 'Urdu', 'Mathematics', 'Science', 'Islamiyat', 'Computer'];
  }
  if (/class [678]/.test(n)) {
    return ['English', 'Urdu', 'Mathematics', 'Science', 'Islamiyat', 'Computer', 'Social Studies'];
  }
  return ['English', 'Urdu', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Islamiyat', 'Pakistan Studies'];
}

function periodCounts(className) {
  const n = className.toLowerCase();
  if (n.includes('play') || n.includes('nursery')) return { regular: 4, friday: 3 };
  if (n.includes('prep') || /class [12]/.test(n)) return { regular: 5, friday: 4 };
  if (/class [345]/.test(n)) return { regular: 6, friday: 5 };
  return { regular: 7, friday: 5 };
}

function subjectMatches(teacherSubjects, subject) {
  const subj = subject.toLowerCase();
  return teacherSubjects.some((s) => {
    const sl = s.toLowerCase();
    if (sl.includes('non') || sl.includes('admin') || sl.includes('security')) return false;
    return sl.includes(subj) || subj.includes(sl)
      || (subj.includes('math') && sl.includes('math'))
      || (subj.includes('english') && sl.includes('eng'))
      || (subj.includes('urdu') && sl.includes('urdu'))
      || (subj.includes('science') && sl.includes('science'))
      || (subj.includes('islam') && sl.includes('islam'))
      || (subj.includes('physics') && sl.includes('phy'))
      || (subj.includes('chem') && sl.includes('chem'))
      || (subj.includes('bio') && sl.includes('bio'))
      || (subj.includes('computer') && sl.includes('computer'))
      || (subj.includes('pakistan') && sl.includes('pak'))
      || (subj.includes('drawing') && (sl.includes('art') || sl.includes('urdu')))
      || (subj.includes('general') && sl.includes('science'));
  });
}

function pickTeacherForSubject(subject, classTeacherId, teacherMetas) {
  const ct = teacherMetas.find((t) => t.doc._id.equals(classTeacherId));
  if (ct && subjectMatches(ct.doc.subjects, subject)) return classTeacherId;
  const pool = teacherMetas.filter(
    (t) => t.hasLogin && t.doc.status === 'Active' && subjectMatches(t.doc.subjects, subject)
  );
  if (pool.length) return pick(pool).doc._id;
  return classTeacherId;
}

function buildSchedules(className, classTeacherId, teacherMetas) {
  const { regular, friday } = periodCounts(className);
  const allSubjects = subjectsForClass(className);

  const buildPeriodList = (count) => {
    const slots = buildTimeSlots(count);
    const subjects = allSubjects.slice(0, count);
    return subjects.map((subject, i) => ({
      title: `Period ${i + 1}`,
      subject,
      teacher: pickTeacherForSubject(subject, classTeacherId, teacherMetas),
      startTime: slots[i].startTime,
      endTime: slots[i].endTime
    }));
  };

  const regularPeriods = buildPeriodList(regular);
  return {
    schedules: [
      {
        name: 'Regular Weekdays',
        days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Saturday'],
        periods: regularPeriods
      },
      {
        name: 'Friday',
        days: ['Friday'],
        periods: buildPeriodList(friday)
      }
    ],
    periods: regularPeriods
  };
}

function gradeFromPct(pct) {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'F';
}

function insertChunks(Model, docs, size = 500) {
  return (async () => {
    for (let i = 0; i < docs.length; i += size) {
      await Model.insertMany(docs.slice(i, i + size), { ordered: false });
    }
  })();
}

async function clearSeedData() {
  console.log('Clearing existing seed data...');
  await Promise.all([
    Substitution.deleteMany({}),
    Attendance.deleteMany({}),
    TeacherAttendance.deleteMany({}),
    FeeRecord.deleteMany({}),
    Diary.deleteMany({}),
    Assignment.deleteMany({}),
    ClassTest.deleteMany({}),
    ExamResult.deleteMany({}),
    ExamTerm.deleteMany({}),
    Holiday.deleteMany({}),
    Student.deleteMany({}),
    Section.deleteMany({}),
    Class.deleteMany({})
  ]);
  await User.deleteMany({ role: { $in: ['teacher', 'student', 'parent'] } });
  await Teacher.deleteMany({});
}

async function seedTeachers() {
  console.log('Creating faculty & portal accounts...');
  const teacherMetas = [];
  const loginCredentials = [];
  const usedEmails = new Set();

  for (let i = 0; i < TEACHING_STAFF.length; i++) {
    const s = TEACHING_STAFF[i];
    const wantsLogin = s.login !== false && !s.qualifications.some((q) => q.toLowerCase().includes('non teaching'));

    let email = emailFromName(s.name, 0);
    let suffix = 1;
    while (usedEmails.has(email)) {
      email = emailFromName(s.name, suffix++);
    }
    usedEmails.add(email);

    let user = null;
    if (wantsLogin) {
      user = await User.create({
        name: s.name,
        email,
        password: TEACHER_PASSWORD,
        plainPassword: TEACHER_PASSWORD,
        role: 'teacher'
      });
    }

    const teacher = await Teacher.create({
      fullName: s.name,
      email,
      phone: phone(),
      gender: s.gender,
      qualifications: s.qualifications,
      subjects: s.subjects,
      status: 'Active',
      user: user ? user._id : undefined
    });

    if (user) {
      user.teacherProfile = teacher._id;
      await user.save();
      loginCredentials.push({ name: s.name, email, role: 'teacher' });
    }

    teacherMetas.push({ doc: teacher, hasLogin: !!user, isClassTeacher: false });
  }

  console.log(`  ${teacherMetas.length} staff (${loginCredentials.length} with portal login)`);
  return { teacherMetas, loginCredentials };
}

async function seedSubstitutions(teacherMetas, sectionRegistry, adminId) {
  console.log('Creating substitution records...');
  const loginTeachers = teacherMetas.filter((t) => t.hasLogin);
  if (loginTeachers.length < 4 || sectionRegistry.length === 0) return 0;

  const subs = [];
  const recentDays = schoolDaysBetween(new Date(Date.now() - 45 * 86400000), new Date())
    .filter((d) => d.getUTCDay() !== 0);

  for (let i = 0; i < 12; i++) {
    const day = pick(recentDays);
    const absent = pick(loginTeachers);
    const substitute = pick(loginTeachers.filter((t) => !t.doc._id.equals(absent.doc._id)));
    const sec = pick(sectionRegistry);
    const schedule = buildSchedules(sec.className, sec.classTeacherId, teacherMetas);
    const period = pick(schedule.periods);

    subs.push({
      date: day,
      originalTeacher: absent.doc._id,
      substituteTeacher: substitute.doc._id,
      class: sec.classId,
      section: sec.sectionId,
      subject: period.subject,
      time: period.startTime,
      status: i < 9 ? 'Completed' : 'Pending'
    });
  }

  await Substitution.insertMany(subs);
  return subs.length;
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const existingCount = await Student.countDocuments();
  if (existingCount > 0 && !FRESH) {
    console.log(`Database already has ${existingCount} students. Use --fresh to reseed.`);
    process.exit(0);
  }

  if (FRESH) await clearSeedData();

  const DEMO_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'afnanjaved38@gmail.com').trim().toLowerCase();
  const DEMO_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123';

  // Prefer the user that already owns the demo email (avoids E11000 when
  // another leftover admin doc is found first by role).
  let admin = await User.findOne({ email: DEMO_ADMIN_EMAIL });
  if (!admin) {
    admin = await User.findOne({ role: 'admin' });
  }

  if (admin) {
    if (String(admin.email).toLowerCase() !== DEMO_ADMIN_EMAIL) {
      await User.deleteMany({ email: DEMO_ADMIN_EMAIL, _id: { $ne: admin._id } });
      admin.email = DEMO_ADMIN_EMAIL;
    }
    admin.name = admin.name || 'PLATFORM ADMIN';
    admin.password = DEMO_ADMIN_PASSWORD;
    admin.role = 'admin';
    await admin.save();
    console.log(`Updated admin: ${DEMO_ADMIN_EMAIL}`);
  } else {
    admin = await User.create({
      name: 'PLATFORM ADMIN',
      email: DEMO_ADMIN_EMAIL,
      password: DEMO_ADMIN_PASSWORD,
      role: 'admin'
    });
    console.log(`Created admin: ${DEMO_ADMIN_EMAIL}`);
  }

  const { teacherMetas, loginCredentials } = await seedTeachers();
  const classTeacherPool = teacherMetas.filter((t) => t.hasLogin);
  if (classTeacherPool.length === 0) {
    console.error('No teachers with login.');
    process.exit(1);
  }

  let classTeacherIdx = 0;
  const nextClassTeacher = () => {
    const t = classTeacherPool[classTeacherIdx % classTeacherPool.length];
    classTeacherIdx++;
    t.isClassTeacher = true;
    return t.doc._id;
  };

  await Settings.findOneAndUpdate({}, {}, { upsert: true, new: true });
  await GlobalSession.findOneAndUpdate(
    { name: 'Academic Year 2025-26' },
    { name: 'Academic Year 2025-26', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], isActive: true },
    { upsert: true, new: true }
  );

  const academicYear = await AcademicYear.findOneAndUpdate(
    { name: 'Academic Year 2025-26' },
    {
      name: 'Academic Year 2025-26',
      startDate: new Date('2025-08-01'),
      endDate: new Date('2026-07-31'),
      isActive: true
    },
    { upsert: true, new: true }
  );

  const feeMonths = lastNMonths(5);
  const dataStart = new Date();
  dataStart.setMonth(dataStart.getMonth() - 5);
  dataStart.setDate(1);
  dataStart.setUTCHours(0, 0, 0, 0);
  const dataEnd = new Date();
  dataEnd.setUTCHours(0, 0, 0, 0);
  const schoolDays = schoolDaysBetween(dataStart, dataEnd);

  console.log(`Creating classes/sections (~${STUDENTS_PER_SECTION}/section, target ~${TARGET_STUDENTS})...`);
  const malePool = shuffle([...MALE_NAMES, ...MALE_NAMES]);
  const femalePool = shuffle([...FEMALE_NAMES, ...FEMALE_NAMES]);
  let maleIdx = 0;
  let femaleIdx = 0;
  let regCounter = 1;

  const allStudents = [];
  const classMap = [];
  const sectionRegistry = [];

  for (const cfg of CLASS_CONFIG) {
    const cls = await Class.create({
      name: cfg.name,
      fees: {
        admissionFee: cfg.admission,
        monthlyTuition: cfg.tuition,
        examFee: cfg.exam,
        miscCharges: rand(200, 500)
      }
    });

    const sections = [];
    for (let s = 0; s < cfg.sections; s++) {
      const classTeacherId = nextClassTeacher();
      const { schedules, periods } = buildSchedules(cfg.name, classTeacherId, teacherMetas);
      const classTeacherMeta = teacherMetas.find((t) => t.doc._id.equals(classTeacherId));

      const sec = await Section.create({
        name: SECTION_LABELS[s],
        class: cls._id,
        classTeacher: classTeacherId,
        schedules,
        periods
      });
      sections.push(sec);
      sectionRegistry.push({
        classId: cls._id,
        sectionId: sec._id,
        className: cfg.name,
        sectionName: SECTION_LABELS[s],
        classTeacherId,
        classTeacherName: classTeacherMeta?.doc.fullName || 'Class Teacher',
        subjects: subjectsForClass(cfg.name),
        periods
      });

      const studentCount = STUDENTS_PER_SECTION + rand(-1, 1);
      for (let i = 0; i < studentCount; i++) {
        const isMale = Math.random() > 0.48;
        const gender = isMale ? 'Male' : 'Female';
        let name;
        if (isMale) {
          name = malePool[maleIdx % malePool.length];
          if (maleIdx >= malePool.length) name += ` ${Math.floor(maleIdx / malePool.length) + 1}`;
          maleIdx++;
        } else {
          name = femalePool[femaleIdx % femalePool.length];
          if (femaleIdx >= femalePool.length) name += ` ${Math.floor(femaleIdx / femalePool.length) + 1}`;
          femaleIdx++;
        }

        const admissionDate = new Date(dataStart);
        admissionDate.setDate(admissionDate.getDate() - rand(0, 20));
        const dob = new Date(admissionDate.getFullYear() - rand(4, 16), rand(0, 11), rand(1, 28));
        const discount = Math.random() < 0.12 ? rand(300, 1500) : 0;

        const student = await Student.create({
          regNo: `STD-2025-${String(regCounter++).padStart(4, '0')}`,
          admissionDate,
          name,
          fatherName: pick(FATHER_NAMES),
          dob,
          gender,
          phone: phone(),
          bForm: cnic(),
          fatherCnic: cnic(),
          cast: pick(CASTES),
          religion: 'Islam',
          address: `${rand(1, 200)} Street ${pick(['Model Town', 'Gulberg', 'Cantt', 'Satellite Town'])}, Rawalpindi`,
          class: cls._id,
          section: sec._id,
          status: 'Active',
          discount,
          admissionFeePaid: true
        });

        allStudents.push({
          doc: student,
          attendanceRate: 0.78 + Math.random() * 0.18,
          payReliability: Math.random(),
          className: cfg.name,
          sectionId: sec._id,
          classId: cls._id
        });
      }
    }
    classMap.push({ cls, sections });
    console.log(`  ${cfg.name}: ${sections.length} sections · class teachers assigned`);
  }

  console.log(`Created ${allStudents.length} students`);

  // ─── Fees / vouchers (admission + last 5 months) ─────────────────────────
  console.log('Generating fee vouchers (5 months)...');
  const feeBatch = [];
  for (const { doc: student, payReliability } of allStudents) {
    const cls = classMap.find((c) => c.cls._id.equals(student.class));
    const tuition = cls.cls.fees.monthlyTuition;
    const discount = student.discount || 0;

    feeBatch.push({
      student: student._id,
      type: 'Admission',
      month: `${student.admissionDate.getFullYear()}-${String(student.admissionDate.getMonth() + 1).padStart(2, '0')}`,
      description: 'Admission Fee',
      amount: cls.cls.fees.admissionFee,
      discount: 0,
      totalAmount: cls.cls.fees.admissionFee,
      paidAmount: cls.cls.fees.admissionFee,
      balance: 0,
      status: 'Paid',
      paymentHistory: [{ amount: cls.cls.fees.admissionFee, date: student.admissionDate, method: 'Cash' }],
      paymentDate: student.admissionDate
    });

    for (const month of feeMonths) {
      const totalAmount = Math.max(0, tuition - discount);
      const roll = Math.random();
      let paidAmount = 0;
      let paymentHistory = [];
      let paymentDate = null;

      if (roll < payReliability * 0.72) {
        paidAmount = totalAmount;
        const [y, m] = month.split('-').map(Number);
        paymentDate = new Date(y, m - 1, rand(1, 10));
        paymentHistory = [{ amount: totalAmount, date: paymentDate, method: pick(['Cash', 'Cash', 'Bank Transfer']) }];
      } else if (roll < payReliability * 0.72 + 0.16) {
        paidAmount = Math.round(totalAmount * (0.45 + Math.random() * 0.4));
        const [y, m] = month.split('-').map(Number);
        paymentDate = new Date(y, m - 1, rand(5, 18));
        paymentHistory = [{ amount: paidAmount, date: paymentDate, method: 'Cash' }];
      }

      feeBatch.push({
        student: student._id,
        type: 'Monthly Fees',
        month,
        description: `Monthly Fee (${month})`,
        amount: tuition,
        discount,
        totalAmount,
        paidAmount,
        balance: Math.max(0, totalAmount - paidAmount),
        status: paidAmount === 0 ? 'Unpaid' : paidAmount >= totalAmount ? 'Paid' : 'Partial',
        paymentHistory,
        paymentDate
      });
    }

    if (Math.random() < 0.1) {
      const fineMonth = pick(feeMonths);
      const fineAmount = pick([200, 300, 500, 750]);
      const isPaid = Math.random() > 0.4;
      feeBatch.push({
        student: student._id,
        type: 'Other',
        month: fineMonth,
        description: pick(FINE_TYPES),
        amount: fineAmount,
        discount: 0,
        totalAmount: fineAmount,
        paidAmount: isPaid ? fineAmount : 0,
        balance: isPaid ? 0 : fineAmount,
        status: isPaid ? 'Paid' : 'Unpaid',
        paymentHistory: isPaid ? [{ amount: fineAmount, date: new Date(`${fineMonth}-12`), method: 'Cash' }] : [],
        paymentDate: isPaid ? new Date(`${fineMonth}-12`) : null
      });
    }
  }
  await insertChunks(FeeRecord, feeBatch);
  console.log(`  ${feeBatch.length} fee records`);

  // ─── Attendance (last 5 months) ──────────────────────────────────────────
  console.log('Generating student & teacher attendance (5 months)...');
  const attBatch = [];
  for (const { doc: student, attendanceRate } of allStudents) {
    for (const day of schoolDays) {
      if (day < student.admissionDate) continue;
      if (Math.random() > 0.94) continue;
      attBatch.push({
        student: student._id,
        date: day,
        status: attendanceStatus(attendanceRate),
        markedBy: admin._id
      });
      if (attBatch.length >= 2500) {
        await Attendance.insertMany(attBatch, { ordered: false });
        attBatch.length = 0;
      }
    }
  }
  if (attBatch.length) await Attendance.insertMany(attBatch, { ordered: false });

  const tAttBatch = [];
  for (const { doc: teacher } of teacherMetas.filter((t) => t.hasLogin)) {
    for (const day of schoolDays) {
      if (Math.random() > 0.95) continue;
      const r = Math.random();
      let status = 'Present';
      if (r > 0.94) status = 'Late';
      else if (r > 0.97) status = 'Leave';
      else if (r > 0.99) status = 'Absent';
      tAttBatch.push({ teacher: teacher._id, date: day, status, markedBy: admin._id });
    }
  }
  await insertChunks(TeacherAttendance, tAttBatch, 2000);
  console.log(`  attendance days covered: ${schoolDays.length}`);

  // ─── Diaries (previous months — a few per section/week) ───────────────────
  console.log('Generating diaries...');
  const diaryBatch = [];
  const diaryTemplates = [
    'Read chapter pages and write key points in notebook.',
    'Complete workbook exercise and revise formulas.',
    'Learn vocabulary words and make 5 sentences.',
    'Prepare short notes for tomorrow oral quiz.',
    'Practice math word problems from the textbook.',
    'Revise science diagram and label parts.',
    'Write a short paragraph on today\'s topic.'
  ];

  for (const sec of sectionRegistry) {
    const teacher = teacherMetas.find((t) => t.doc._id.equals(sec.classTeacherId))?.doc;
    const diaryDays = schoolDays.filter((d) => d.getUTCDay() === 1 || d.getUTCDay() === 3 || d.getUTCDay() === 5);
    for (const day of diaryDays) {
      if (Math.random() > 0.55) continue;
      const subject = pick(sec.subjects);
      diaryBatch.push({
        class: sec.classId,
        section: sec.sectionId,
        teacher: teacher?._id,
        postedByRole: 'teacher',
        postedByName: teacher?.fullName || sec.classTeacherName,
        date: day,
        subject,
        homework: pick(diaryTemplates),
        submissionDate: 'Tomorrow',
        notes: Math.random() > 0.7 ? 'Bring notebook for checking.' : ''
      });
    }
  }
  await insertChunks(Diary, diaryBatch);
  console.log(`  ${diaryBatch.length} diary entries`);

  // ─── Assignments ─────────────────────────────────────────────────────────
  console.log('Generating assignments...');
  const assignmentBatch = [];
  for (const sec of sectionRegistry) {
    const teacher = teacherMetas.find((t) => t.doc._id.equals(sec.classTeacherId))?.doc;
    for (let i = 0; i < 4; i++) {
      const month = pick(feeMonths);
      const [y, m] = month.split('-').map(Number);
      const due = new Date(y, m - 1, rand(10, 26));
      const subject = pick(sec.subjects);
      assignmentBatch.push({
        class: sec.classId,
        section: sec.sectionId,
        teacher: teacher?._id,
        postedByRole: 'teacher',
        postedByName: teacher?.fullName || sec.classTeacherName,
        title: `${subject} Assignment ${i + 1}`,
        subject,
        content: `Complete the ${subject} worksheet and submit on time. Show all working steps clearly.`,
        dueDate: due.toISOString().slice(0, 10),
        createdAt: new Date(due.getTime() - rand(5, 14) * 86400000)
      });
    }
  }
  await insertChunks(Assignment, assignmentBatch);
  console.log(`  ${assignmentBatch.length} assignments`);

  // ─── Class tests with marks ──────────────────────────────────────────────
  console.log('Generating class tests...');
  const testBatch = [];
  for (const sec of sectionRegistry) {
    const teacher = teacherMetas.find((t) => t.doc._id.equals(sec.classTeacherId))?.doc;
    const sectionStudents = allStudents.filter((s) => s.sectionId.equals(sec.sectionId));
    for (let i = 0; i < 2; i++) {
      const month = feeMonths[Math.min(feeMonths.length - 1, i + 1)];
      const [y, m] = month.split('-').map(Number);
      const date = new Date(y, m - 1, rand(8, 22));
      const subject = pick(sec.subjects);
      const totalMarks = pick([20, 25, 30]);
      testBatch.push({
        title: `${subject} Class Test ${i + 1}`,
        subject,
        class: sec.classId,
        section: sec.sectionId,
        teacher: teacher?._id,
        postedByName: teacher?.fullName || 'Class Teacher',
        date,
        totalMarks,
        results: sectionStudents.map(({ doc }) => {
          const obtained = Math.max(0, Math.min(totalMarks, Math.round(totalMarks * (0.45 + Math.random() * 0.55))));
          return {
            student: doc._id,
            obtainedMarks: obtained,
            remarks: obtained / totalMarks >= 0.8 ? 'Excellent' : obtained / totalMarks >= 0.5 ? 'Good' : 'Needs improvement'
          };
        })
      });
    }
  }
  await insertChunks(ClassTest, testBatch, 100);
  console.log(`  ${testBatch.length} class tests`);

  // ─── Two exam terms + results ────────────────────────────────────────────
  console.log('Creating 2 exam terms with results...');
  const midTerm = await ExamTerm.create({
    name: 'Mid Term Examinations 2025-26',
    academicYear: academicYear._id,
    termType: 'Mid Term',
    startDate: new Date(dataStart.getFullYear(), dataStart.getMonth() + 1, 10),
    endDate: new Date(dataStart.getFullYear(), dataStart.getMonth() + 1, 22),
    isPublished: true
  });
  const finalTerm = await ExamTerm.create({
    name: 'Second Term Examinations 2025-26',
    academicYear: academicYear._id,
    termType: 'Final Term',
    startDate: new Date(dataEnd.getFullYear(), dataEnd.getMonth() - 1, 5),
    endDate: new Date(dataEnd.getFullYear(), dataEnd.getMonth() - 1, 18),
    isPublished: true
  });

  const examBatch = [];
  for (const term of [midTerm, finalTerm]) {
    for (const { doc: student, className, classId, sectionId } of allStudents) {
      const subjects = subjectsForClass(className);
      const subjectResults = subjects.map((subjectName) => {
        const totalMarks = 100;
        const obtainedMarks = Math.max(20, Math.min(100, Math.round(55 + Math.random() * 40)));
        const pct = (obtainedMarks / totalMarks) * 100;
        return {
          subjectName,
          totalMarks,
          passingMarks: 40,
          obtainedMarks,
          grade: gradeFromPct(pct),
          remarks: pct >= 80 ? 'Outstanding' : pct >= 50 ? 'Satisfactory' : 'Needs attention'
        };
      });
      const grandTotal = subjectResults.reduce((s, x) => s + x.totalMarks, 0);
      const totalObtained = subjectResults.reduce((s, x) => s + x.obtainedMarks, 0);
      const percentage = Number(((totalObtained / grandTotal) * 100).toFixed(2));
      examBatch.push({
        examTerm: term._id,
        academicYear: academicYear._id,
        student: student._id,
        class: classId,
        section: sectionId,
        subjects: subjectResults,
        grandTotal,
        totalObtained,
        percentage,
        overallGrade: gradeFromPct(percentage),
        status: percentage >= 40 ? 'Pass' : 'Fail',
        position: '',
        isPublished: true,
        generalRemarks: percentage >= 80 ? 'Keep up the excellent work.' : 'Encourage regular revision at home.'
      });
    }
  }
  await insertChunks(ExamResult, examBatch, 300);
  console.log(`  ${examBatch.length} exam results (2 terms)`);

  // ─── Holidays ────────────────────────────────────────────────────────────
  await Holiday.insertMany([
    {
      title: 'Eid-ul-Fitr Holiday',
      type: 'Public Holiday',
      startDate: new Date(dataStart.getFullYear(), dataStart.getMonth() + 1, 1),
      endDate: new Date(dataStart.getFullYear(), dataStart.getMonth() + 1, 3),
      description: 'Eid holidays',
      appliesTo: 'All',
      createdBy: admin._id
    },
    {
      title: 'Winter Break',
      type: 'Winter Vacation',
      startDate: new Date(dataEnd.getFullYear() - (dataEnd.getMonth() < 1 ? 1 : 0), 11, 24),
      endDate: new Date(dataEnd.getFullYear(), 0, 2),
      description: 'Winter vacation',
      appliesTo: 'All',
      createdBy: admin._id
    }
  ]);

  const subCount = await seedSubstitutions(teacherMetas, sectionRegistry, admin._id);
  const classTeachers = teacherMetas.filter((t) => t.isClassTeacher);

  console.log('\n=== SEED COMPLETE ===');
  console.log(`Staff:          ${teacherMetas.length} (${loginCredentials.length} teacher logins)`);
  console.log(`Class Teachers: ${classTeachers.length} (one per section)`);
  console.log(`Sections:       ${sectionRegistry.length}`);
  console.log(`Students:       ${allStudents.length}`);
  console.log(`Fee vouchers:   ${feeBatch.length}`);
  console.log(`Diaries:        ${diaryBatch.length}`);
  console.log(`Assignments:    ${assignmentBatch.length}`);
  console.log(`Class tests:    ${testBatch.length}`);
  console.log(`Exam results:   ${examBatch.length}`);
  console.log(`Substitutions:  ${subCount}`);
  console.log(`Data window:    ${feeMonths[0]} → ${feeMonths[feeMonths.length - 1]}`);
  console.log('\n--- ADMIN (live demo) ---');
  console.log(`${DEMO_ADMIN_EMAIL} / ${DEMO_ADMIN_PASSWORD}`);
  console.log('\n--- TEACHER PORTAL LOGINS (password for all: Teacher123) ---');
  loginCredentials.slice(0, 10).forEach((c) => console.log(`  ${c.email}  (${c.name})`));
  console.log('  ... (remaining teachers same password)');
  console.log('\nStudent / Parent accounts: create from Admin portal (Students → generate login).');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
