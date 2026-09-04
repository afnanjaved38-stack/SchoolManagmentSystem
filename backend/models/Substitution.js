const mongoose = require('mongoose');

const SubstitutionSchema = new mongoose.Schema({
    date: { type: Date, required: true },
    originalTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    substituteTeacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
    subject: { type: String, required: true },
    time: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('Substitution', SubstitutionSchema);
