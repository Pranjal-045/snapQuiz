const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
require('dotenv').config();

// Create Express app
const app = express();

// Define port
const PORT = process.env.PORT || 5001;

// Middleware
// REPLACE YOUR EXISTING CORS CONFIGURATION WITH THIS:
// This will allow all Vercel deployments for your project
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all Vercel deployments for your project
    if (origin.endsWith('pranjal-077s-projects.vercel.app')) {
      return callback(null, true);
    }
    
    // Allow localhost for development
    if (origin.match(/http:\/\/localhost:[0-9]+/)) {
      return callback(null, true);
    }
    
    // Otherwise, block the request
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(bodyParser.json());

// Better logging for debugging registration issues
app.use((req, res, next) => {
  // Log all requests with method, path, and timestamp
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.path === '/register' || req.path === '/api/register') {
    console.log('Registration attempt received');
  }
  next();
});

// Create uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
const fs = require('fs');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Connect to MongoDB with error handling
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz_app', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB Connected Successfully!');
  
  // Test ping to verify connection
  return mongoose.connection.db.admin().ping();
})
.then(() => {
  console.log('Database ping successful - connection is fully operational');
})
.catch(err => {
  console.error('❌ MongoDB Connection Error:', err.message);
  
  // More detailed error info
  if (err.name === 'MongoNetworkError') {
    console.error('Network issue - check your connection string or firewall settings');
  } else if (err.name === 'MongoServerSelectionError') {
    console.error('Server selection timeout - cluster might be down or unreachable');
  }
});

// MongoDB connection event listeners
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

// Define mongoose schemas
// User model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Quiz result model
const quizResultSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quizId: { type: String, required: true },
  title: { type: String, default: 'Untitled Quiz' },
  numQuestions: { type: Number, required: true },
  correctAnswers: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  timeTaken: { type: Number, required: true },
  questions: [{ type: Object }],
  userAnswers: { type: Object },
  createdAt: { type: Date, default: Date.now }
});

// Create models
const User = mongoose.model('User', userSchema);
const QuizResult = mongoose.model('QuizResult', quizResultSchema);

// Auth middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    req.user = {
      id: user._id,
      username: user.username,
      email: user.email
    };
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// FIXED: Route prefix handling - support both /api/register and /register paths
// Authentication routes - added detailed logging
// In the registration route handler:
app.post(['/api/register', '/register'], async (req, res) => {
  try {
    const { username, email, password } = req.body;
    console.log(`Registration attempt for: ${username}, ${email}`);
    
    // IMPROVED ERROR HANDLING: Check for existing username/email separately
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      console.log(`Username already exists: ${username}`);
      return res.status(400).json({ message: 'Username already taken, please choose another one' });
    }
    
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      console.log(`Email already exists: ${email}`);
      return res.status(400).json({ message: 'Email already registered, please use another email or try logging in' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create new user
    const user = new User({
      username,
      email,
      password: hashedPassword
    });
    
    await user.save();
    console.log(`User registered successfully: ${user._id}`);
    
    // Create token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );
    
    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    // IMPROVED ERROR HANDLING: Log detailed error and provide better message
    console.error('Registration error details:', error);
    
    // Return more specific error messages based on error type
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Validation error: ' + error.message });
    } else if (error.name === 'MongoError' && error.code === 11000) {
      return res.status(400).json({ message: 'This username or email is already taken' });
    } else if (error.name === 'MongoNetworkError') {
      return res.status(503).json({ message: 'Database connection error, please try again later' });
    }
    
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});
// FIXED: Login route supporting both /api/login and /login paths
app.post(['/api/login', '/login'], async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`Login attempt for: ${username}`);
    
    // Check if user exists
    const user = await User.findOne({ username });
    console.log(`User found: ${user ? 'Yes' : 'No'}`);
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`Password match: ${isMatch ? 'Yes' : 'No'}`);
    
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    // Create token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '1h' }
    );
    
    console.log(`Login successful for: ${user.username}`);
    
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Protected routes - support both paths
app.get(['/api/me', '/me'], auth, async (req, res) => {
  res.json(req.user);
});

// Quiz result routes with both path patterns
app.post(['/api/quiz-result', '/quiz-result'], auth, async (req, res) => {
  try {
    const { quizId, title, numQuestions, correctAnswers, totalQuestions, timeTaken, questions, userAnswers } = req.body;
    
    const quizResult = new QuizResult({
      userId: req.user.id,
      quizId,
      title,
      numQuestions,
      correctAnswers,
      totalQuestions,
      timeTaken,
      questions,
      userAnswers
    });
    
    await quizResult.save();
    console.log(`Quiz result saved for user: ${req.user.username}, score: ${correctAnswers}/${totalQuestions}`);
    
    res.status(201).json(quizResult);
  } catch (error) {
    console.error('Save quiz error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get(['/api/quiz-history', '/quiz-history'], auth, async (req, res) => {
  try {
    const quizResults = await QuizResult.find({ userId: req.user.id }).sort({ createdAt: -1 });
    
    // Format for frontend
    const formattedResults = quizResults.map(quiz => ({
      id: quiz.quizId,
      title: quiz.title,
      created_at: quiz.createdAt.toISOString(),
      num_questions: quiz.numQuestions,
      correct_answers: quiz.correctAnswers,
      total_questions: quiz.totalQuestions,
      time_taken: quiz.timeTaken,
      questions: quiz.questions,
      user_answers: quiz.userAnswers
    }));
    
    res.json(formattedResults);
  } catch (error) {
    console.error('Get quiz history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete(['/api/quiz-history/:id', '/quiz-history/:id'], auth, async (req, res) => {
  try {
    const quizId = req.params.id;
    
    const result = await QuizResult.deleteOne({ 
      userId: req.user.id,
      quizId
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Quiz not found or not authorized' });
    }
    
    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Delete quiz error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete(['/api/quiz-history', '/quiz-history'], auth, async (req, res) => {
  try {
    const result = await QuizResult.deleteMany({ userId: req.user.id });
    
    res.json({ message: `${result.deletedCount} quizzes deleted` });
  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Database test route - helpful for checking connectivity
app.get('/api/test-db-connection', async (req, res) => {
  try {
    // Check connection state
    const state = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    // Try to perform a simple operation
    const dbPing = await mongoose.connection.db.admin().ping();
    
    // If User model exists, try counting users
    let userCount = null;
    try {
      userCount = await User.countDocuments();
    } catch (err) {
      console.log('User collection may not exist yet');
    }
    
    res.json({
      success: true,
      connection: {
        state: states[state],
        status: state === 1 ? 'healthy' : 'unhealthy'
      },
      ping: dbPing,
      diagnostics: {
        userCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      details: {
        name: error.name,
        code: error.code
      }
    });
  }
});

// Helper route to get current UTC time in the required format
app.get(['/api/current-time', '/current-time'], (req, res) => {
  const now = new Date();
  
  // Format date as YYYY-MM-DD HH:MM:SS (UTC)
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');
  
  const formatted = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  
  res.json({ currentTime: formatted });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Current Date and Time (UTC): ${new Date().toISOString()}`);
});