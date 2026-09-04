const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

// @route   POST api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;

  try {
    let user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid Credentials' });

    // Demo/hackathon default admin email; override with MASTER_ADMIN_EMAIL in .env
    const masterAdminEmail = (process.env.MASTER_ADMIN_EMAIL || 'afnanjaved38@gmail.com').trim().toLowerCase();
    if (
      role === 'admin' &&
      masterAdminEmail &&
      email.toLowerCase() !== masterAdminEmail
    ) {
      return res.status(403).json({ msg: 'Unauthorized admin access attempt.' });
    }

    if (user.role !== role) {
      if (user.role === 'inactive') {
          return res.status(401).json({ msg: 'Your account has been deactivated. Please contact administration.' });
      }
      return res.status(400).json({ msg: `Access denied. Please use the ${user.role} login tab.` });
    }

    // Additional check for teachers status
    if (role === 'teacher' && user.teacherProfile) {
        const Teacher = require('../models/Teacher');
        const teacher = await Teacher.findById(user.teacherProfile);
        if (teacher && teacher.status !== 'Active') {
            return res.status(403).json({ msg: `Access denied. Account status: ${teacher.status}` });
        }
    }

    // Additional check for student / parent status
    if ((role === 'student' || role === 'parent') && user.studentProfile) {
        const Student = require('../models/Student');
        const student = await Student.findById(user.studentProfile);
        if (student && student.status !== 'Active') {
            return res.status(403).json({ msg: `Access denied. Student status is: ${student.status}` });
        }
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });

    const payload = {
      user: {
        id: user.id,
        role: user.role,
        teacherProfile: user.teacherProfile,
        studentProfile: user.studentProfile
      }
    };

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' }, (err, token) => {
      if (err) throw err;
      res.json({ 
        token, 
        user: { 
          id: user.id, 
          name: user.name, 
          email: user.email, 
          role: user.role,
          teacherProfile: user.teacherProfile,
          studentProfile: user.studentProfile
        } 
      });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/auth/user
// @desc    Get user data
router.get('/user', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -plainPassword');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
