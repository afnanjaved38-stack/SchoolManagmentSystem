const express = require('express');
const router = express.Router();
const Holiday = require('../models/Holiday');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// @route   GET api/holidays
// @desc    Get all holidays (Admin / Staff / All logged-in users)
router.get('/', auth, async (req, res) => {
  try {
    const holidays = await Holiday.find().sort({ startDate: -1, createdAt: -1 });
    res.json(holidays);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/holidays/upcoming
// @desc    Get current active or upcoming holidays
router.get('/upcoming', auth, async (req, res) => {
  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const holidays = await Holiday.find({
      endDate: { $gte: now }
    }).sort({ startDate: 1 }).limit(10);

    res.json(holidays);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/holidays/check
// @desc    Check if a specific date is a holiday
router.get('/check', auth, async (req, res) => {
  const { date } = req.query; // YYYY-MM-DD
  if (!date) return res.status(400).json({ msg: 'Date is required' });

  try {
    const targetDate = new Date(date + 'T12:00:00+05:00'); // Midday in PKT
    const holiday = await Holiday.findOne({
      startDate: { $lte: targetDate },
      endDate: { $gte: targetDate }
    });

    if (holiday) {
      return res.json({ isHoliday: true, holiday });
    }
    res.json({ isHoliday: false });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/holidays
// @desc    Create a new holiday or vacation period (Admin only)
router.post('/', [auth, roleCheck('admin')], async (req, res) => {
  const { title, type, startDate, endDate, description, appliesTo } = req.body;

  if (!title || !startDate || !endDate) {
    return res.status(400).json({ msg: 'Title, Start Date and End Date are required' });
  }

  try {
    const start = new Date(startDate + 'T00:00:00+05:00');
    const end = new Date(endDate + 'T23:59:59+05:00');

    if (start > end) {
      return res.status(400).json({ msg: 'Start date cannot be after End date' });
    }

    const holiday = new Holiday({
      title: title.trim(),
      type: type || 'Public Holiday',
      startDate: start,
      endDate: end,
      description: (description || '').trim(),
      appliesTo: appliesTo || 'All',
      createdBy: req.user.id
    });

    await holiday.save();
    res.json({ msg: 'Holiday created successfully', holiday });
  } catch (err) {
    console.error('Holiday create error:', err);
    res.status(500).json({ msg: 'Server error creating holiday', error: err.message });
  }
});

// @route   PUT api/holidays/:id
// @desc    Update a holiday (Admin only)
router.put('/:id', [auth, roleCheck('admin')], async (req, res) => {
  const { title, type, startDate, endDate, description, appliesTo } = req.body;

  try {
    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) return res.status(404).json({ msg: 'Holiday not found' });

    if (title) holiday.title = title.trim();
    if (type) holiday.type = type;
    if (startDate) holiday.startDate = new Date(startDate + 'T00:00:00+05:00');
    if (endDate) holiday.endDate = new Date(endDate + 'T23:59:59+05:00');
    if (description !== undefined) holiday.description = description.trim();
    if (appliesTo) holiday.appliesTo = appliesTo;

    await holiday.save();
    res.json({ msg: 'Holiday updated successfully', holiday });
  } catch (err) {
    console.error('Holiday update error:', err);
    res.status(500).json({ msg: 'Server error updating holiday' });
  }
});

// @route   DELETE api/holidays/:id
// @desc    Delete a holiday (Admin only)
router.delete('/:id', [auth, roleCheck('admin')], async (req, res) => {
  try {
    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) return res.status(404).json({ msg: 'Holiday not found' });

    await Holiday.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Holiday deleted successfully' });
  } catch (err) {
    console.error('Holiday delete error:', err);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
