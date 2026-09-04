const express = require('express');
const router = express.Router();
const AcademicYear = require('../models/AcademicYear');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// @route   GET api/academic-years/active
// @desc    Get the current active academic year (or create default if none exists)
router.get('/active', auth, async (req, res) => {
  try {
    let activeYear = await AcademicYear.findOne({ isActive: true });
    if (!activeYear) {
      activeYear = await AcademicYear.findOne().sort({ startDate: -1 });
      if (!activeYear) {
        const curYear = new Date().getFullYear();
        activeYear = await AcademicYear.create({
          name: `Academic Year ${curYear}-${(curYear + 1).toString().slice(2)}`,
          startDate: new Date(curYear, 3, 1), // April 1st
          endDate: new Date(curYear + 1, 2, 31), // March 31st
          isActive: true
        });
      } else {
        activeYear.isActive = true;
        await activeYear.save();
      }
    }
    res.json(activeYear);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/academic-years
// @desc    Get all academic years
router.get('/', auth, async (req, res) => {
  try {
    const years = await AcademicYear.find().sort({ startDate: -1, createdAt: -1 });
    res.json(years);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   POST api/academic-years
// @desc    Create a new academic year
router.post('/', [auth, roleCheck('admin')], async (req, res) => {
  try {
    const { name, startDate, endDate, isActive } = req.body;

    if (!name || !startDate || !endDate) {
      return res.status(400).json({ message: 'Name, Start Date and End Date are required' });
    }

    if (isActive) {
      await AcademicYear.updateMany({}, { isActive: false });
    }

    const count = await AcademicYear.countDocuments();

    const academicYear = new AcademicYear({
      name: name.trim(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: isActive !== undefined ? isActive : count === 0
    });

    await academicYear.save();
    res.json(academicYear);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/academic-years/:id/activate
// @desc    Switch active academic year
router.put('/:id/activate', [auth, roleCheck('admin')], async (req, res) => {
  try {
    await AcademicYear.updateMany({}, { isActive: false });
    const year = await AcademicYear.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    );
    if (!year) return res.status(404).json({ message: 'Academic Year not found' });
    res.json({ message: `Active Academic Year switched to ${year.name}`, academicYear: year });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/academic-years/:id
// @desc    Update academic year details
router.put('/:id', [auth, roleCheck('admin')], async (req, res) => {
  try {
    const { name, startDate, endDate, isActive } = req.body;

    if (isActive) {
      await AcademicYear.updateMany({ _id: { $ne: req.params.id } }, { isActive: false });
    }

    let updateData = {};
    if (name) updateData.name = name.trim();
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);
    if (isActive !== undefined) updateData.isActive = isActive;

    const year = await AcademicYear.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    res.json(year);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/academic-years/:id
// @desc    Delete an academic year (cannot delete active)
router.delete('/:id', [auth, roleCheck('admin')], async (req, res) => {
  try {
    const year = await AcademicYear.findById(req.params.id);
    if (year?.isActive) {
      return res.status(400).json({ message: 'Cannot delete the currently active academic year. Please activate another year first.' });
    }
    await AcademicYear.findByIdAndDelete(req.params.id);
    res.json({ message: 'Academic year deleted successfully' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;
