const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Share = require('../models/Share');
const QuizResult = require('../models/QuizResult');
const User = require('../models/User');

// Create a shareable link
router.post('/share-quiz', protect, async (req, res) => {
  try {
    const { quizId } = req.body;
    
    // Verify quiz belongs to user
    const quiz = await QuizResult.findOne({
      user: req.user._id,
      quizId
    });
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    
    // Create share record
    const share = await Share.create({
      user: req.user._id,
      quizId
    });
    
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    res.status(201).json({
      quiz_id: quizId,
      share_id: share.shareId,
      shareUrl: `${baseUrl}/shared/${share.shareId}`
    });
    
  } catch (error) {
    console.error('Create share error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get shared quiz data
router.get('/shared/:shareId', async (req, res) => {
  try {
    const { shareId } = req.params;
    
    // Find share
    const share = await Share.findOne({ shareId });
    if (!share) {
      return res.status(404).json({ message: 'Shared quiz not found or expired' });
    }
    
    // Get quiz data
    const quiz = await QuizResult.findOne({
      user: share.user,
      quizId: share.quizId
    });
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz data not found' });
    }
    
    // Get username
    const user = await User.findById(share.user).select('username');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return non-sensitive quiz data
    res.json({
      quizId: quiz.quizId,
      title: quiz.title,
      username: user.username,
      numQuestions: quiz.numQuestions,
      correctAnswers: quiz.correctAnswers,
      totalQuestions: quiz.totalQuestions,
      percentage: ((quiz.correctAnswers / quiz.totalQuestions) * 100).toFixed(1),
      timeTaken: quiz.timeTaken,
      createdAt: quiz.createdAt
    });
    
  } catch (error) {
    console.error('Get shared quiz error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;