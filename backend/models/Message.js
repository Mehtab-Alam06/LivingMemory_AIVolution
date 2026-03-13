const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  user: {
    name: { type: String },
    email: { type: String },
    role: { type: String, default: 'user' }
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Message', MessageSchema);