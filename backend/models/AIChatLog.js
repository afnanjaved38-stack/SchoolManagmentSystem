const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  hasDiagram: {
    type: Boolean,
    default: false
  },
  diagramType: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const aiChatLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  role: {
    type: String,
    enum: ['student', 'teacher', 'parent', 'admin'],
    required: true
  },
  sessionTitle: {
    type: String,
    default: 'General Learning Query'
  },
  subject: {
    type: String,
    default: 'General'
  },
  messages: [messageSchema],
  extractedTopics: [{
    type: String
  }],
  identifiedWeaknesses: [{
    type: String
  }],
  interestTags: [{
    type: String
  }],
  summary: {
    type: String,
    default: ''
  }
}, { timestamps: true });

aiChatLogSchema.index({ student: 1, createdAt: -1 });
aiChatLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('AIChatLog', aiChatLogSchema);
