const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// @route   GET api/settings
// @desc    Get all settings
router.get('/', auth, async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({});
      await settings.save();
    }
    res.json(settings);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/settings
// @desc    Update settings
router.post('/', [auth, roleCheck('admin')], async (req, res) => {
  const { 
    teacherStartTime, 
    teacherEndTime, 
    adminStartTime, 
    adminEndTime, 
    showFullFeeOnVoucher, 
    showPreviousDuesOnVoucher,
    showTeacherPhoneToStudents,
    showTeacherPhoneToParents,
    showFeesOnStudentPortal
  } = req.body;

  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings({ 
        teacherStartTime, 
        teacherEndTime, 
        adminStartTime, 
        adminEndTime, 
        showFullFeeOnVoucher, 
        showPreviousDuesOnVoucher,
        showTeacherPhoneToStudents,
        showTeacherPhoneToParents,
        showFeesOnStudentPortal
      });
    } else {
      if (teacherStartTime !== undefined) settings.teacherStartTime = teacherStartTime;
      if (teacherEndTime !== undefined) settings.teacherEndTime = teacherEndTime;
      if (adminStartTime !== undefined) settings.adminStartTime = adminStartTime;
      if (adminEndTime !== undefined) settings.adminEndTime = adminEndTime;
      if (showFullFeeOnVoucher !== undefined) settings.showFullFeeOnVoucher = showFullFeeOnVoucher;
      if (showPreviousDuesOnVoucher !== undefined) settings.showPreviousDuesOnVoucher = showPreviousDuesOnVoucher;
      if (showTeacherPhoneToStudents !== undefined) settings.showTeacherPhoneToStudents = showTeacherPhoneToStudents;
      if (showTeacherPhoneToParents !== undefined) settings.showTeacherPhoneToParents = showTeacherPhoneToParents;
      if (showFeesOnStudentPortal !== undefined) settings.showFeesOnStudentPortal = showFeesOnStudentPortal;
    }
    await settings.save();
    res.json(settings);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
