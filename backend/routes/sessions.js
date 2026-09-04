const express = require('express');
const router = express.Router();
const GlobalSession = require('../models/GlobalSession');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// @route   GET api/sessions
// @desc    Get all weekly timetable day sessions (e.g. Regular Days vs Friday)
router.get('/', auth, async (req, res) => {
  try {
    const sessions = await GlobalSession.find().sort({ createdAt: 1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   POST api/sessions
// @desc    Create new weekly timetable day session
router.post('/', [auth, roleCheck('admin')], async (req, res) => {
  const { name, days } = req.body;
  try {
    const count = await GlobalSession.countDocuments();
    if (count >= 6) {
      return res.status(400).json({ message: 'Maximum 6 timetable day profiles allowed' });
    }

    // Filter out Sunday
    const filteredDays = (days || []).filter(d => d !== 'Sunday');

    let session = new GlobalSession({
      name,
      days: filteredDays
    });

    await session.save();
    res.json(session);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/sessions/:id
// @desc    Update weekly timetable day session
router.put('/:id', [auth, roleCheck('admin')], async (req, res) => {
  const { name, days } = req.body;
  try {
    const filteredDays = days ? days.filter(d => d !== 'Sunday') : undefined;
    const session = await GlobalSession.findByIdAndUpdate(
      req.params.id,
      { name, days: filteredDays },
      { new: true }
    );
    res.json(session);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/sessions/:id
// @desc    Delete weekly timetable day session
router.delete('/:id', [auth, roleCheck('admin')], async (req, res) => {
  try {
    await GlobalSession.findByIdAndDelete(req.params.id);
    res.json({ message: 'Timetable day profile deleted successfully' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;
