const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
require('dotenv').config();

// Create Express app
const app = express();

// Define port
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests from these origins
    const allowedOrigins = [
      'http://localhost:5173',  // Vite dev server
      'http://localhost:3000',  // Alternative dev server
      'http://localhost:4173',  // Vite preview
    ];
    
    // For development, allow requests with no origin (like Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`CORS blocked request from: ${origin}`);
      callback(null, true);  // Allow all origins for development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(bodyParser.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hackfolio', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB Connected Successfully!');
  return mongoose.connection.db.admin().ping();
})
.then(() => {
  console.log('Database ping successful - connection is fully operational');
})
.catch(err => {
  console.error('❌ MongoDB Connection Error:', err.message);
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

// Resume model
const resumeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  personalInfo: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    address: { type: String },
    linkedIn: { type: String },
    website: { type: String }
  },
  summary: { type: String },
  experience: [{
    company: { type: String, required: true },
    position: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    current: { type: Boolean, default: false },
    description: { type: String }
  }],
  education: [{
    institution: { type: String, required: true },
    degree: { type: String, required: true },
    field: { type: String },
    startDate: { type: Date },
    endDate: { type: Date },
    gpa: { type: String }
  }],
  skills: [{ type: String }],
  projects: [{
    name: { type: String, required: true },
    description: { type: String },
    technologies: [{ type: String }],
    url: { type: String },
    startDate: { type: Date },
    endDate: { type: Date }
  }],
  certifications: [{
    name: { type: String, required: true },
    issuer: { type: String, required: true },
    date: { type: Date },
    url: { type: String }
  }],
  template: { type: String, default: 'modern' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Create models
const User = mongoose.model('User', userSchema);
const Resume = mongoose.model('Resume', resumeSchema);

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

// Authentication routes
app.post(['/api/register', '/register'], async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    console.log("Registration request received:");
    console.log("Username:", username);
    console.log("Email:", email);
    console.log("Password:", password ? "provided" : "missing");
    
    // Validate required fields
    if (!username || !email || !password) {
      console.log("Registration failed: Missing required fields");
      return res.status(400).json({ 
        message: "All fields are required",
        missing: {
          username: !username,
          email: !email,
          password: !password
        }
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      console.log(`User already exists: ${existingUser.username}`);
      return res.status(400).json({ message: 'User already exists with that email or username' });
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
      { expiresIn: '24h' }
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
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

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
      { expiresIn: '24h' }
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

// Protected routes
app.get(['/api/me', '/me'], auth, async (req, res) => {
  res.json(req.user);
});

// Resume routes
app.get(['/api/resumes', '/resumes'], auth, async (req, res) => {
  try {
    const resumes = await Resume.find({ userId: req.user.id }).sort({ updatedAt: -1 });
    res.json(resumes);
  } catch (error) {
    console.error('Get resumes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post(['/api/resumes', '/resumes'], auth, async (req, res) => {
  try {
    const resumeData = {
      ...req.body,
      userId: req.user.id,
      updatedAt: new Date()
    };
    
    const resume = new Resume(resumeData);
    await resume.save();
    
    console.log(`Resume created for user: ${req.user.username}, title: ${resume.title}`);
    res.status(201).json(resume);
  } catch (error) {
    console.error('Create resume error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get(['/api/resumes/:id', '/resumes/:id'], auth, async (req, res) => {
  try {
    const resume = await Resume.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });
    
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    
    res.json(resume);
  } catch (error) {
    console.error('Get resume error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put(['/api/resumes/:id', '/resumes/:id'], auth, async (req, res) => {
  try {
    const resume = await Resume.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    
    res.json(resume);
  } catch (error) {
    console.error('Update resume error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete(['/api/resumes/:id', '/resumes/:id'], auth, async (req, res) => {
  try {
    const resume = await Resume.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user.id 
    });
    
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }
    
    res.json({ message: 'Resume deleted successfully' });
  } catch (error) {
    console.error('Delete resume error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Health check routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Hackfolio API Server'
  });
});

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
  console.log(`Hackfolio API Server running on port ${PORT}`);
  console.log(`Current Date and Time (UTC): ${new Date().toISOString()}`);
});