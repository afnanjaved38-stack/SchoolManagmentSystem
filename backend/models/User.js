const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  plainPassword: { type: String }, // For reveal eye toggle (User requested)
  role: { type: String, enum: ['admin', 'teacher', 'student', 'parent', 'inactive'], required: true },
  teacherProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' },
  studentProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  studentProfiles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }]
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.plainPassword = this.password; // Update plain text version for eye reveal
  this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.model('User', userSchema);
