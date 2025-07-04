const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');
const { protect } = require('../middleware/authMiddleware');
const QuizResult = require('../models/QuizResult');

// Setup multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `temp_${Date.now()}_${file.originalname}`);
  }
});

const upload = multer({ storage });

// Save quiz result
router.post('/quiz-result', protect, async (req, res) => {
  try {
    const { 
      quizId, 
      title, 
      numQuestions, 
      correctAnswers, 
      totalQuestions, 
      timeTaken, 
      pdfName 
    } = req.body;
    
    const quizResult = await QuizResult.create({
      user: req.user._id,
      quizId,
      title,
      numQuestions,
      correctAnswers,
      totalQuestions,
      timeTaken,
      pdfName
    });
    
    res.status(201).json({
      status: 'success',
      quizId: quizResult.quizId
    });
    
  } catch (error) {
    console.error('Save quiz result error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get quiz history for a user
router.get('/quiz-history', protect, async (req, res) => {
  try {
    const quizHistory = await QuizResult.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    
    // Format data to match the frontend expectations
    const formattedHistory = quizHistory.map(quiz => ({
      id: quiz.quizId,
      title: quiz.title,
      created_at: quiz.createdAt,
      num_questions: quiz.numQuestions,
      correct_answers: quiz.correctAnswers,
      total_questions: quiz.totalQuestions,
      time_taken: quiz.timeTaken,
      pdf_name: quiz.pdfName
    }));
    
    res.json(formattedHistory);
  } catch (error) {
    console.error('Get quiz history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload PDF and generate MCQs
router.post('/upload', protect, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const pdfPath = req.file.path;
    const numQuestions = parseInt(req.body.num_questions) || 5;
    const timeLimit = parseInt(req.body.time_limit) || 0;
    
    // Create form data for the Python backend
    const formData = new FormData();
    formData.append('pdf', fs.createReadStream(pdfPath));
    formData.append('num_questions', numQuestions);
    
    // Call the Python backend to generate MCQs
    const pythonResponse = await axios.post(
      'process.env.REACT_APP_RAG_URL',  // Your rag-backend URL
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );
    
    // Clean up the temporary file
    fs.unlink(pdfPath, (err) => {
      if (err) console.error('Error deleting temporary file:', err);
    });
    
    // Return the MCQs and additional data
    res.json({
      mcqs: pythonResponse.data.mcqs,
      pdf_id: uuidv4(),
      time_limit: timeLimit
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Failed to generate MCQs' });
    
    // Clean up in case of error
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});
    }
  }
});

module.exports = router;