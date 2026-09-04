const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// Import Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/classes', require('./routes/classes'));
app.use('/api/students', require('./routes/students'));
app.use('/api/teachers', require('./routes/teachers'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/substitutions', require('./routes/substitutions'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/academic-years', require('./routes/academicYears'));
app.use('/api/diary', require('./routes/diary'));
app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/exams', require('./routes/exams'));
app.use('/api/holidays', require('./routes/holidays'));
app.use('/api/ai', require('./routes/ai'));

// Serve Static Assets in Production
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.resolve(__dirname, '..', 'frontend', 'build');
  console.log('Serving frontend from:', buildPath);
  
  // Set static folder
  app.use(express.static(buildPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
} else {
  // Standard API Welcome for Dev
  app.get('/', (req, res) => {
    res.send('CampusCore API is running...');
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
