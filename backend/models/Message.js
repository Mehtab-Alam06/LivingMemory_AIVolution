const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  user: {
    name: { type: String },
    email: { type: String }
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Message', MessageSchema);