const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const ShareSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  quizId: {
    type: String,
    required: true
  },
  shareId: {
    type: String,
    required: true,
    unique: true,
    default: () => uuidv4()
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60*60*24*30 // 30 days expiration
  }
});

module.exports = mongoose.model('Share', ShareSchema);