import { useState, useEffect } from "react";
import axios from "axios";
import { format } from 'date-fns';
import QuizHistory from "./components/Dashboard/QuizHistory";

function App() {
  const [file, setFile] = useState(null);
  const [mcqs, setMcqs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [numQuestions, setNumQuestions] = useState(5);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [showAnswers, setShowAnswers] = useState({});
  const [fileName, setFileName] = useState("");
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved === "true" ? true : false;
  });

  // Progress tracking states
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState("");
  
  // Time limit states
  const [timeLimit, setTimeLimit] = useState(0); 
  const [quizStartTime, setQuizStartTime] = useState(null);
  const [quizId, setQuizId] = useState(null);
  
  // User authentication states
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  // Current date/time state
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  // History panel visibility
  const [showHistory, setShowHistory] = useState(false);
  // Hint visibility (new feature from reference design)
  const [showHint, setShowHint] = useState(false);
  
  // State to determine if we're in mobile view
  const [isMobileView, setIsMobileView] = useState(false);

  const [formattedDateTime, setFormattedDateTime] = useState('2025-07-03 10:31:40');
  const [showSidebar, setShowSidebar] = useState(false); // For mobile sidebar toggle

  // Timer state
  const [remainingTime, setRemainingTime] = useState({
    minutes: 0,
    seconds: 0
  });

  // Check for mobile view on resize
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    
    return () => {
      window.removeEventListener('resize', checkMobileView);
    };
  }, []);

  // Save dark mode preference to localStorage
  useEffect(() => {
    localStorage.setItem("darkMode", darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);
  
  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      
      // Format date as YYYY-MM-DD HH:MM:SS (UTC)
      const year = now.getUTCFullYear();
      const month = String(now.getUTCMonth() + 1).padStart(2, '0');
      const day = String(now.getUTCDate()).padStart(2, '0');
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const minutes = String(now.getUTCMinutes()).padStart(2, '0');
      const seconds = String(now.getUTCSeconds()).padStart(2, '0');
      
      const formatted = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      setFormattedDateTime(formatted);
    };
    
    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Update timer countdown
  useEffect(() => {
    if (quizStartTime && timeLimit > 0) {
      const timerId = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - quizStartTime) / 1000);
        const remainingSecs = timeLimit * 60 - elapsedSeconds;
        
        if (remainingSecs <= 0) {
          clearInterval(timerId);
          handleTimeUp();
          return;
        }
        
        setRemainingTime({
          minutes: Math.floor(remainingSecs / 60),
          seconds: remainingSecs % 60
        });
      }, 1000);
      
      return () => clearInterval(timerId);
    }
  }, [quizStartTime, timeLimit]);
  
  // Set quiz start time when MCQs are loaded
  useEffect(() => {
    if (mcqs.length > 0 && !quizStartTime) {
      setQuizStartTime(Date.now());
      setQuizId(crypto.randomUUID());
      
      if (timeLimit > 0) {
        setRemainingTime({
          minutes: timeLimit,
          seconds: 0
        });
      }
    }
  }, [mcqs, quizStartTime]);
  
  // Check if user is logged in
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      } catch (e) {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
  }, []);

  // Mock quiz history data setup
  useEffect(() => {
    if (!localStorage.getItem('quizHistory')) {
      const mockHistory = [
        {
          id: 'quiz1',
          userId: 'user123',
          title: 'Introduction to Machine Learning',
          created_at: '2025-06-22T10:30:00Z',
          num_questions: 10,
          correct_answers: 8,
          total_questions: 10,
          time_taken: 480,
          questions: Array.from({ length: 10 }, (_, i) => ({
            question: `Question ${i+1}: What is a key concept in supervised learning?`,
            options: {
              A: "Training with labeled data",
              B: "Clustering without labels",
              C: "Reinforcement through rewards",
              D: "Dimensionality reduction"
            },
            answer: "A",
            difficulty: "Medium"
          })),
          user_answers: {0: 'A', 1: 'A', 2: 'B', 3: 'A', 4: 'A', 5: 'A', 6: 'C', 7: 'A', 8: 'A', 9: 'D'}
        },
        {
          id: 'quiz2',
          userId: 'user123',
          title: 'Data Structures and Algorithms',
          created_at: '2025-06-20T15:45:00Z',
          num_questions: 15,
          correct_answers: 12,
          total_questions: 15,
          time_taken: 900,
          questions: Array.from({ length: 15 }, (_, i) => ({
            question: `Question ${i+1}: Which data structure uses LIFO principle?`,
            options: {
              A: "Queue",
              B: "Stack",
              C: "Linked List",
              D: "Binary Tree"
            },
            answer: "B",
            difficulty: "Hard"
          })),
          user_answers: {0: 'B', 1: 'B', 2: 'B', 3: 'A', 4: 'B', 5: 'B', 6: 'B', 7: 'D', 8: 'B', 9: 'B', 10: 'B', 11: 'C', 12: 'B', 13: 'B', 14: 'A'}
        },
        {
          id: 'quiz3',
          userId: 'user123',
          title: 'Web Development Fundamentals',
          created_at: '2025-06-18T09:15:00Z',
          num_questions: 8,
          correct_answers: 5,
          total_questions: 8,
          time_taken: 360,
          questions: Array.from({ length: 8 }, (_, i) => ({
            question: `Question ${i+1}: Which language is used for styling web pages?`,
            options: {
              A: "HTML",
              B: "JavaScript",
              C: "CSS",
              D: "PHP"
            },
            answer: "C",
            difficulty: "Easy"
          })),
          user_answers: {0: 'C', 1: 'C', 2: 'A', 3: 'C', 4: 'D', 5: 'C', 6: 'B', 7: 'A'}
        }
      ];
      
      localStorage.setItem('quizHistory', JSON.stringify(mockHistory));
    }
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      console.log("New file selected:", selectedFile.name);
      setFile(selectedFile);
      setFileName(selectedFile.name);
      
      // Reset any previous questions and state
      setMcqs([]);
      setSelectedOptions({});
      setShowAnswers({});
      setCurrentPage(0);
      setQuizStartTime(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a PDF file.");

    const formData = new FormData();
    formData.append("pdf", file);
    formData.append("num_questions", numQuestions);
    formData.append("time_limit", timeLimit);

    setLoading(true);
    setMcqs([]);
    setCurrentPage(0);
    setSelectedOptions({});
    setShowAnswers({});
    setUploadProgress(0);
    setProcessingStage("Uploading PDF");
    setQuizStartTime(null);

    try {
      // Get auth token if user is logged in
      const token = localStorage.getItem("token");
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      // Try API call and handle errors gracefully
      let mcqsData = [];
      try {
        const res = await axios.post("process.env.REACT_APP_RAG_URL", formData, {
          headers: {
            ...headers,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
          params: {
            _t: new Date().getTime() // Add timestamp to URL
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);

            if (percentCompleted === 100) {
              setProcessingStage("Processing document");
              setTimeout(() => setProcessingStage("Analyzing content"), 1500);
              setTimeout(() => setProcessingStage("Generating questions"), 3000);
            }
          },
        });
        
        mcqsData = res.data.mcqs || [];
        
        if (res.data.time_limit) {
          setTimeLimit(res.data.time_limit);
        }
      } catch (apiError) {
        console.error("API Error:", apiError);
        
        // Get the current filename safely
        const currentFileName = fileName || file?.name || "this document";
        
        // Log the filename being used for debugging
        console.log("Generating mock questions for:", currentFileName);
        
        // Generate mock questions with the current filename
        mcqsData = Array.from({ length: numQuestions }, (_, i) => {
          const topicIndex = i % 5;
          const topics = ['concept', 'principle', 'theory', 'application', 'methodology'];
          const optionSets = {
            A: ['fundamental concepts', 'key principles', 'main theories', 'practical applications'],
            B: ['process', 'method', 'system', 'framework'],
            C: ['theory', 'practice', 'research', 'development'],
            D: ['examples', 'case studies', 'scenarios', 'implementations']
          };
          
          return {
            question: `Question ${i+1}: What does "${currentFileName}" tell us about ${topics[topicIndex]}?`,
            options: {
              A: `${currentFileName} explains ${optionSets.A[i % 4]} in detail`,
              B: `${currentFileName} describes the ${optionSets.B[i % 4]}`,
              C: `${currentFileName} focuses on ${optionSets.C[i % 4]}`,
              D: `${currentFileName} illustrates ${optionSets.D[i % 4]}`
            },
            answer: ["A", "B", "C", "D"][Math.floor(Math.random() * 4)],
            difficulty: ["Easy", "Medium", "Hard"][Math.floor(Math.random() * 3)]
          };
        });
        
        // Add a timestamp to prevent any caching issues
        console.log(`Mock data generated at: ${new Date().toISOString()}`);
      }
      
      // Set MCQs and continue
      setMcqs(mcqsData);
      setQuizId(crypto.randomUUID());
      
    } catch (err) {
      console.error("Error:", err);
      alert("Failed to generate MCQs. Please try again.");
    } finally {
      setLoading(false);
      setUploadProgress(0);
      setProcessingStage("");
    }
  };

  const handleOptionClick = (optionKey) => {
    if (showAnswers[currentPage]) return;
    setSelectedOptions((prev) => ({ ...prev, [currentPage]: optionKey }));
  };

  const handleQuestionJump = (index) => {
    setCurrentPage(index);
  };

  // Calculate score
  const calculateScore = () => {
    const correctAnswers = Object.keys(selectedOptions).filter(
      (key) => selectedOptions[key] === mcqs[key].answer
    ).length;
    return {
      correct: correctAnswers,
      wrong: Object.keys(selectedOptions).length - correctAnswers,
      total: mcqs.length,
      percentage: ((correctAnswers / (Object.keys(selectedOptions).length || 1)) * 100).toFixed(1)
    };
  };

  const handleTimeUp = () => {
    // Mark all unanswered questions
    const newShowAnswers = { ...showAnswers };

    mcqs.forEach((_, index) => {
      if (!newShowAnswers[index]) {
        newShowAnswers[index] = true;
      }
    });

    setShowAnswers(newShowAnswers);
    alert("Time's up! Your quiz has been submitted.");
    saveQuizResult();
  };

  const saveQuizResult = async () => {
    try {
      const token = localStorage.getItem('token');
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = userData.id;
      
      const score = calculateScore();
      const timeTaken = quizStartTime ? Math.floor((Date.now() - quizStartTime) / 1000) : 0;
      
      // Store complete quiz data for history
      const quizFullData = {
        id: quizId || crypto.randomUUID(),
        userId: userId,
        title: fileName || "Untitled Quiz",
        created_at: new Date().toISOString(),
        num_questions: numQuestions,
        correct_answers: score.correct,
        total_questions: mcqs.length,
        time_taken: timeTaken,
        questions: mcqs,
        user_answers: selectedOptions
      };
      
      // Get existing quiz history
      const savedQuizzes = JSON.parse(localStorage.getItem('quizHistory') || '[]');
      savedQuizzes.push(quizFullData);
      localStorage.setItem('quizHistory', JSON.stringify(savedQuizzes));
      
    } catch (error) {
      console.error("Error saving quiz result:", error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const username = e.target.elements[0].value;
    const password = e.target.elements[1].value;
    
    try {
      setLoading(true);
      setAuthError("");
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const storedUsers = JSON.parse(localStorage.getItem('mcq_users') || '[]');
      
      if (storedUsers.length === 0 && username === 'Pranjal-045' && password === 'password123') {
        const defaultUser = {
          id: 'user123',
          username: 'Pranjal-045',
          email: 'pranjal045@example.com'
        };
        
        localStorage.setItem('mcq_users', JSON.stringify([
          {
            id: 'user123',
            username: 'Pranjal-045',
            email: 'pranjal045@example.com',
            password: 'password123'
          }
        ]));
        
        const mockToken = 'mock_token_' + Math.random().toString(36).substring(2);
        localStorage.setItem('token', mockToken);
        localStorage.setItem('user', JSON.stringify(defaultUser));
        setUser(defaultUser);
        setShowAuthModal(false);
        return;
      }
      
      const user = storedUsers.find(u => u.username === username && u.password === password);
      if (!user) {
        setAuthError("Invalid username or password");
        return;
      }
      
      const mockToken = 'mock_token_' + Math.random().toString(36).substring(2);
      
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify({
        id: user.id,
        username: user.username,
        email: user.email
      }));
      
      setUser({
        id: user.id,
        username: user.username,
        email: user.email
      });
      
      setShowAuthModal(false);
      
      if (showHistory) {
        setShowHistory(false);
        setTimeout(() => setShowHistory(true), 100);
      }
      
    } catch (error) {
      console.error('Login error:', error);
      setAuthError("An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const username = e.target.elements[0].value;
    const email = e.target.elements[1].value;
    const password = e.target.elements[2].value;
    const confirmPassword = e.target.elements[3].value;
    
    try {
      setLoading(true);
      setAuthError("");
      
      if (password !== confirmPassword) {
        setAuthError("Passwords do not match");
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const storedUsers = JSON.parse(localStorage.getItem('mcq_users') || '[]');
      
      if (storedUsers.some(user => user.username === username || user.email === email)) {
        setAuthError("Username or email already exists");
        return;
      }
      
      const newUser = {
        id: Date.now().toString(),
        username: username,
        email: email,
        password: password
      };
      
      storedUsers.push(newUser);
      localStorage.setItem('mcq_users', JSON.stringify(storedUsers));
      
      const mockToken = 'mock_token_' + Math.random().toString(36).substring(2);
      
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify({
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      }));
      
      setUser({
        id: newUser.id,
        username: newUser.username,
        email: newUser.email
      });
      
      setShowAuthModal(false);
      
    } catch (error) {
      console.error('Registration error:', error);
      setAuthError("An error occurred during registration");
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteQuiz = (quizId) => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = userData.id;
      
      const quizHistory = JSON.parse(localStorage.getItem('quizHistory') || '[]');
      
      const updatedHistory = quizHistory.filter(quiz => 
        !(quiz.id === quizId && (!quiz.userId || quiz.userId === userId))
      );
      
      localStorage.setItem('quizHistory', JSON.stringify(updatedHistory));
      
    } catch (error) {
      console.error("Error deleting quiz:", error);
    }
  };

  const handleClearAllQuizzes = () => {
    try {
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = userData.id;
      
      const quizHistory = JSON.parse(localStorage.getItem('quizHistory') || '[]');
      
      const updatedHistory = quizHistory.filter(quiz => 
        quiz.userId && quiz.userId !== userId
      );
      
      localStorage.setItem('quizHistory', JSON.stringify(updatedHistory));
      
    } catch (error) {
      console.error("Error clearing quiz history:", error);
    }
  };

  const handleRetakeQuiz = async (quizId) => {
    try {
      const quizHistory = JSON.parse(localStorage.getItem('quizHistory') || '[]');
      const quizData = quizHistory.find(quiz => quiz.id === quizId);
      
      if (!quizData) {
        alert('Quiz data not found');
        return;
      }
      
      setShowHistory(false);
      setLoading(true);
      setProcessingStage("Loading previous quiz");
      
      setTimeout(() => {
        if (quizData.questions && quizData.questions.length > 0) {
          setMcqs(quizData.questions);
          setFileName(quizData.title);
          setSelectedOptions({});
          setShowAnswers({});
          setCurrentPage(0);
          setQuizStartTime(Date.now());
          setQuizId(crypto.randomUUID());
          setTimeLimit(Math.max(Math.ceil(quizData.time_taken / 60), 10));
        } else {
          const mockMcqs = Array.from({ length: quizData.total_questions }, (_, index) => ({
            question: `What is the main concept in ${quizData.title}?`,
            options: {
              A: `Option A for question ${index + 1}`,
              B: `Option B for question ${index + 1}`,
              C: `Option C for question ${index + 1}`,
              D: `Option D for question ${index + 1}`
            },
            answer: ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)],
            difficulty: ['Easy', 'Medium', 'Hard'][Math.floor(Math.random() * 3)]
          }));
          setMcqs(mockMcqs);
          setFileName(quizData.title);
          setSelectedOptions({});
          setShowAnswers({});
          setCurrentPage(0);
          setQuizStartTime(Date.now());
          setQuizId(crypto.randomUUID());
          setTimeLimit(Math.ceil(quizData.time_taken / 60));
        }
        
        setLoading(false);
        setProcessingStage("");
      }, 1500);
      
    } catch (error) {
      console.error('Error retaking quiz:', error);
      alert('Failed to retake the quiz. Please try again.');
      setLoading(false);
      setProcessingStage("");
    }
  };

  const mcq = mcqs[currentPage];
  const selected = selectedOptions[currentPage];
  const show = showAnswers[currentPage];
  const score = calculateScore();
  
  // Calculate completion percentage for circular progress
  const completionPercent = mcqs.length > 0
    ? Math.round((Object.keys(selectedOptions).length / mcqs.length) * 100)
    : 0;
  
  // Check if quiz is complete
  const isQuizComplete = mcqs.length > 0 && Object.keys(selectedOptions).length === mcqs.length;
    
  // When quiz is complete, save results
  useEffect(() => {
    if (isQuizComplete && quizId && !score.saved) {
      saveQuizResult();
      score.saved = true;
    }
  }, [isQuizComplete, quizId]);

  // Function to get hint for current question (mock function)
  const getHint = () => {
    if (!mcq) return "No hint available";
    // In a real app, hints would come from the backend
    // For now, we'll generate a simple hint based on the answer
    const answer = mcq.answer;
    return `Look for options related to ${answer === 'A' ? 'the first concept' : 
      answer === 'B' ? 'the second concept' : 
      answer === 'C' ? 'the third concept' : 'the last concept'} mentioned.`;
  };

  // Format remaining time
  const formattedTime = () => {
    return `${String(remainingTime.minutes).padStart(2, '0')}:${String(remainingTime.seconds).padStart(2, '0')}`;
  };

  return (
    // Fixed white strip issue by ensuring background covers full content
    <div className={`${darkMode ? 'bg-gradient-to-br from-purple-900 to-gray-900' : 'bg-gradient-to-br from-purple-500 to-blue-400'} min-h-screen flex flex-col`} style={{minHeight: '100vh'}}>
      <div className={`mx-auto px-4 py-3 ${isMobileView ? 'max-w-md' : 'max-w-7xl'} w-full flex flex-col flex-grow ${!isQuizComplete && mcqs.length > 0 ? 'h-full' : ''}`}>
        {/* Header with updated app name to SnapQuiz */}
        <header className="flex flex-col lg:flex-row justify-between items-center mb-3">
          <h1 className={`text-xl md:text-2xl font-bold text-white mb-2 md:mb-0 ${isMobileView ? 'text-center' : ''}`}>
            SnapQuiz
          </h1>
          
          <div className="flex flex-wrap justify-center md:justify-end items-center gap-2">
            {user && (
              <div className="flex items-center">
                <div className="h-7 w-7 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-medium mr-1">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="mr-2 text-white text-sm">
                  {user.username || 'Pranjal-045'}
                </span>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-xs px-2 py-1 rounded-md bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition-colors mr-1"
                >
                  {showHistory ? 'Hide History' : 'Show History'}
                </button>
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
            
            {!user && (
              <button
                onClick={() => setShowAuthModal(true)}
                className="text-xs px-2 py-1 rounded-md bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm transition-colors"
              >
                Login
              </button>
            )}
            
            <div className="flex items-center ml-1">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm"
                aria-label="Toggle dark mode"
              >
                {darkMode ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                )}
              </button>
              <div className="text-white text-xs ml-2">
                {format(currentDateTime, 'yyyy-MM-dd HH:mm:ss')} UTC
              </div>
            </div>
          </div>
        </header>

        {/* Main content - flex-grow to fill available height */}
        <div className={`flex flex-col ${!isMobileView ? 'lg:flex-row gap-4' : ''} flex-grow`}>
          {/* Quiz history panel */}
          {showHistory && (
            <div className={`mb-4 rounded-2xl shadow-xl overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'} ${!isMobileView ? 'lg:w-2/5 lg:mb-0 lg:self-start' : ''} ${!isQuizComplete && mcqs.length > 0 ? 'max-h-[calc(100vh-120px)]' : ''} overflow-auto`}>
              <QuizHistory 
                darkMode={darkMode} 
                onRetakeQuiz={handleRetakeQuiz} 
                onDeleteQuiz={handleDeleteQuiz}
                onClearAllQuizzes={handleClearAllQuizzes}
              />
            </div>
          )}

          {/* Main content area */}
          <div className={`${!isMobileView && showHistory ? 'lg:w-3/5' : 'w-full'} flex-grow flex flex-col`}>
            {mcqs.length === 0 ? (
              // Landing page content with updated app name
              <div className={`rounded-3xl shadow-xl overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 flex-grow`}>
                {/* Landing Page Description */}
                <div className="mb-4">
                  <h1 className={`text-xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-purple-800'}`}>
                    Welcome to SnapQuiz
                  </h1>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Quickly create, practice, and track multiple-choice quizzes from any PDF study material. Upload your document, let our AI generate questions, and enhance your learning experience with instant feedback, hints, scoring, and history — all in a modern, responsive interface.
                  </p>
                </div>
                
                <h2 className={`text-lg font-semibold mb-3 ${darkMode ? 'text-white' : 'text-purple-800'}`}>Upload Document</h2>

                {/* File upload area */}
                <div className="mb-4">
                  <div
                    className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-colors ${
                      darkMode
                        ? 'border-gray-700 hover:border-purple-500'
                        : 'border-purple-200 hover:border-purple-400'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-10 w-10 mb-3 ${darkMode ? 'text-purple-400' : 'text-purple-500'}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <p className={`mb-1 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Drag & drop your PDF here
                      </p>
                      <p className={`text-xs mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        or
                      </p>
                      <label className="px-5 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-colors bg-purple-600 hover:bg-purple-700 text-white active:transform active:scale-95">
                        Browse Files
                        <input
                          id="fileUpload"
                          type="file"
                          accept=".pdf"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                  {fileName && (
                    <div className={`mt-2 text-xs flex items-center justify-center ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1 text-green-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Selected: {fileName}
                    </div>
                  )}
                </div>

                <div className={`grid ${isMobileView ? 'grid-cols-1' : 'md:grid-cols-2'} gap-4`}>
                  {/* Number of questions */}
                  <div className="mb-3">
                    <label className={`block font-medium mb-1 text-sm ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                      Number of Questions
                    </label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        min="1"
                        max="40"
                        value={numQuestions}
                        onChange={(e) => setNumQuestions(Number(e.target.value))}
                        className={`w-20 px-3 py-1.5 rounded-full text-center ${
                          darkMode
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'border border-purple-200'
                        } text-sm`}
                      />
                      <span className={`ml-2 text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        (max 40)
                      </span>
                    </div>
                  </div>

                  {/* Time Limit */}
                  <div className="mb-3">
                    <label className={`block font-medium mb-1 text-sm ${darkMode ? 'text-white' : 'text-gray-700'}`}>
                      Time Limit (minutes)
                    </label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        min="0"
                        max="60"
                        value={timeLimit}
                        onChange={(e) => setTimeLimit(Number(e.target.value))}
                        className={`w-20 px-3 py-1.5 rounded-full text-center ${
                          darkMode
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'border border-purple-200'
                        } text-sm`}
                      />
                      <span className={`ml-2 text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        (0 for no limit)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-3">
                  <button
                    onClick={() => {
                      setFile(null);
                      setFileName("");
                      setMcqs([]);
                      setUploadProgress(0);
                      setProcessingStage("");
                      document.getElementById('fileUpload').value = '';
                    }}
                    className={`px-3 py-1.5 rounded-full font-medium transition text-sm ${
                      darkMode
                        ? 'bg-gray-700 text-white hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    } active:transform active:scale-95 ${!file ? 'invisible' : ''}`}
                  >
                    Clear
                  </button>

                  {/* Progress Bar */}
                  {loading && (
                    <div className="flex-grow">
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-purple-600'}`}>
                          {processingStage}
                        </span>
                        <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-purple-600'}`}>
                          {uploadProgress}%
                        </span>
                      </div>
                      <div className={`w-full h-1.5 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300 ease-in-out"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Generate button */}
                <button
                  onClick={handleUpload}
                  disabled={loading || !file}
                  className={`w-full py-2.5 rounded-full font-semibold text-white transition mt-4 text-sm ${
                    loading || !file
                      ? darkMode ? 'bg-gray-700 cursor-not-allowed' : 'bg-gray-300 cursor-not-allowed'
                      : darkMode 
                        ? 'bg-purple-600 hover:bg-purple-500'
                        : 'bg-purple-600 hover:bg-purple-700'
                  } active:transform active:scale-[0.99]`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      {processingStage}...
                    </div>
                  ) : (
                    "Generate Questions"
                  )}
                </button>
              </div>
            ) : isQuizComplete ? (
              // Results screen with updated app name
              <div className={`rounded-3xl shadow-xl overflow-hidden ${darkMode ? 'bg-gray-800' : 'bg-white'} p-4 flex-grow`}>
                <div className="text-center">
                  <div className="relative mx-auto w-32 h-32 mb-4">
                    {/* Circular progress indicator */}
                    <div className="absolute inset-0">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle
                          className={`${darkMode ? 'text-gray-700' : 'text-gray-200'} stroke-current`}
                          strokeWidth="8"
                          cx="50"
                          cy="50"
                          r="46"
                          fill="transparent"
                        ></circle>
                        <circle
                          className={`${darkMode ? 'text-purple-500' : 'text-purple-600'} stroke-current`}
                          strokeWidth="8"
                          strokeLinecap="round"
                          cx="50"
                          cy="50"
                          r="46"
                          fill="transparent"
                          strokeDasharray="289.02"
                          strokeDashoffset={289.02 * (1 - score.correct / score.total)}
                          transform="rotate(-90 50 50)"
                        ></circle>
                      </svg>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div>
                        <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-purple-600'}`}>
                          {score.percentage}%
                        </div>
                        <div className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Score
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <h2 className={`text-xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Quiz Completed!
                  </h2>
                  <p className={`mb-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    You've answered all {score.total} questions
                  </p>

                  <div className={`grid ${isMobileView ? 'grid-cols-2' : 'grid-cols-4'} gap-3 mb-5`}>
                    <div className={`rounded-xl p-3 text-center ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                      <div className={`text-xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                        {score.correct}
                      </div>
                      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Correct
                      </div>
                    </div>
                    <div className={`rounded-xl p-3 text-center ${darkMode ? 'bg-red-900/30' : 'bg-red-50'}`}>
                      <div className={`text-xl font-bold ${darkMode ? 'text-red-400' : 'text-red-500'}`}>
                        {score.wrong}
                      </div>
                      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Incorrect
                      </div>
                    </div>
                    <div className={`rounded-xl p-3 text-center ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                      <div className={`text-xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        {score.total}
                      </div>
                      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Total Questions
                      </div>
                    </div>
                    <div className={`rounded-xl p-3 text-center ${darkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                      <div className={`text-xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                        {fileName || 'Quiz'}
                      </div>
                      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Quiz Name
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className={`flex flex-col md:flex-row gap-2 justify-center ${isMobileView ? 'space-y-2' : 'space-x-2'}`}>
                    <button 
                      onClick={() => {
                        const content = `${fileName || 'Quiz Results'}
Date: ${new Date().toLocaleDateString()}
Score: ${score.percentage}% (${score.correct}/${score.total} correct)

${mcqs.map((mcq, index) => {
  const userAnswer = selectedOptions[index] || 'Not answered';
  const isCorrect = userAnswer === mcq.answer;
  
  return `Question ${index + 1}: ${mcq.question}
${Object.entries(mcq.options).map(([key, value]) => {
  const prefix = key === mcq.answer ? '✓ ' : (key === userAnswer && !isCorrect ? '✗ ' : '  ');
  return `${prefix}${key}. ${value}`;
}).join('\n')}
Your answer: ${userAnswer}
Correct answer: ${mcq.answer}
Result: ${isCorrect ? 'Correct' : 'Wrong'}

`;
}).join('')}
Generated by SnapQuiz • ${new Date().toLocaleString()}
Current Date and Time (UTC): ${formattedDateTime}
Current User's Login: ${user?.username || 'Pranjal-045'}`;

                        const blob = new Blob([content], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `${fileName || 'quiz'}_results.txt`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                      }}
                      className="py-2 px-3 rounded-full text-sm font-medium transition flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white active:transform active:scale-95"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Results
                    </button>

                    <button
                      onClick={() => {
                        setMcqs([]);
                        setFile(null);
                        setFileName("");
                        setSelectedOptions({});
                        setShowAnswers({});
                        setCurrentPage(0);
                        setQuizStartTime(null);
                        setQuizId(null);
                      }}
                      className={`py-2 px-3 rounded-full text-sm font-medium transition flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white active:transform active:scale-95`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      New Quiz
                    </button>

                    <button
                      onClick={() => {
                        setSelectedOptions({});
                        setShowAnswers({});
                        setCurrentPage(0);
                        setQuizStartTime(Date.now());
                        setQuizId(crypto.randomUUID());
                      }}
                      className={`py-2 px-3 rounded-full text-sm font-medium transition flex items-center justify-center ${
                        darkMode 
                          ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                          : 'bg-white border border-purple-300 hover:bg-purple-50 text-purple-700'
                      } active:transform active:scale-95`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Retry Quiz
                    </button>
                  </div>
                </div>
              </div>
            ) : !isMobileView ? (
              // DESKTOP QUIZ INTERFACE - same as before but with updated sidebar heading
              <div className="flex h-full">
                {/* Left sidebar */}
                <div className={`w-64 min-w-[16rem] mr-4 h-full flex flex-col ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg overflow-hidden`}>
                  {/* Test name section - updated with SnapQuiz branding */}
                  <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <h3 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      SnapQuiz: {fileName || "Quiz"}
                    </h3>
                    <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {mcqs.length} Questions • {Object.keys(selectedOptions).length} Answered
                    </p>
                  </div>
                  
                  {/* Time remaining section */}
                  <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Time Remaining
                    </h3>
                    <div className={`text-xl font-mono mt-1 font-medium ${darkMode ? 'text-purple-400' : 'text-purple-700'}`}>
                      {timeLimit > 0 ? formattedTime() : "--:--"}
                    </div>
                  </div>
                  
                  {/* Question navigation grid */}
                  <div className="p-4 flex-grow">
                    <h3 className={`text-sm font-medium mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Questions
                    </h3>
                    
                    <div className="grid grid-cols-5 gap-2">
                      {mcqs.map((_, index) => {
                        const isAnswered = selectedOptions[index] !== undefined;
                        const isCurrent = currentPage === index;
                        
                        let buttonStyle = '';
                        if (isCurrent) {
                          buttonStyle = darkMode 
                            ? 'bg-purple-600 text-white border-purple-600' 
                            : 'bg-purple-600 text-white border-purple-600';
                        } else if (isAnswered) {
                          buttonStyle = darkMode 
                            ? 'bg-purple-900/50 text-gray-200 border-purple-600' 
                            : 'bg-purple-100 text-purple-700 border-purple-300';
                        } else {
                          buttonStyle = darkMode 
                            ? 'bg-gray-700 text-gray-300 border-gray-600' 
                            : 'bg-gray-100 text-gray-600 border-gray-200';
                        }
                        
                        return (
                          <button
                            key={index}
                            onClick={() => setCurrentPage(index)}
                            className={`h-9 w-full rounded flex items-center justify-center border ${buttonStyle} hover:opacity-90 transition-all active:transform active:scale-95`}
                          >
                            {index + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* User info with updated date time format */}
                  <div className={`p-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Current User: {user?.username || 'Pranjal-045'}
                    </div>
                    <div className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formattedDateTime}
                    </div>
                  </div>
                </div>
                
                {/* Main content area */}
                <div className={`flex-1 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-5 flex flex-col`}>
                  {/* Question navigation header */}
                  <div className="flex justify-between items-center mb-6 border-b pb-4 border-gray-200 dark:border-gray-700">
                    <button 
                      onClick={() => currentPage > 0 && setCurrentPage(currentPage - 1)}
                      className={`flex items-center text-sm ${
                        darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                      } ${currentPage === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      disabled={currentPage === 0}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Previous
                    </button>
                    
                    <span className={`text-sm font-medium ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                      Question {currentPage + 1}
                    </span>
                    
                    <button 
                      onClick={() => currentPage < mcqs.length - 1 && setCurrentPage(currentPage + 1)}
                      className={`flex items-center text-sm ${
                        darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                      } ${currentPage === mcqs.length - 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      disabled={currentPage === mcqs.length - 1}
                    >
                      Next
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Question content */}
                  <div className="flex-grow overflow-y-auto">
                    <p className={`text-base leading-relaxed mb-8 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                      {mcqs[currentPage].question}
                    </p>
                    
                    {/* Radio-style options */}
                    <div className="space-y-4">
                      {Object.entries(mcqs[currentPage].options).map(([key, text]) => {
                        const isSelected = selected === key;
                        const isCorrect = show && mcqs[currentPage].answer === key;
                        const isWrong = show && isSelected && !isCorrect;
                        
                        return (
                          <div
                            key={key}
                            onClick={() => handleOptionClick(key)}
                            className={`flex items-center p-3 border rounded cursor-pointer transition-all
                              ${isSelected 
                                ? darkMode 
                                  ? 'bg-purple-900/40 border-purple-500' 
                                  : 'bg-purple-50 border-purple-300'
                                : darkMode
                                  ? 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                                  : 'bg-white border-gray-200 hover:bg-gray-50'
                              }
                              ${isCorrect && show
                                ? darkMode 
                                  ? 'bg-green-900/40 border-green-500' 
                                  : 'bg-green-50 border-green-500'
                                : ''
                              }
                              ${isWrong 
                                ? darkMode 
                                  ? 'bg-red-900/40 border-red-500' 
                                  : 'bg-red-50 border-red-500'
                                : ''
                              }
                            `}
                          >
                            <div className={`w-5 h-5 rounded-full border mr-3 flex items-center justify-center ${
                              isSelected 
                                ? darkMode 
                                                                    ? 'border-purple-500 bg-purple-500' 
                                  : 'border-purple-600 bg-purple-600' 
                                : darkMode
                                  ? 'border-gray-600' 
                                  : 'border-gray-300'
                            }`}>
                              {isSelected && (
                                <div className="w-2 h-2 rounded-full bg-white"></div>
                              )}
                            </div>
                            <span className={`${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{text}</span>
                            
                            {/* Show correct/incorrect indicators when answer is shown */}
                            {show && isCorrect && (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-auto text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            )}
                            {show && isWrong && (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-auto text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Submit button */}
                  <div className="mt-6 flex justify-between items-center">
                    <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {Object.keys(selectedOptions).length} of {mcqs.length} questions answered
                    </div>
                    
                    <button
                      onClick={() => {
                        // Show answer for current question
                        setShowAnswers((prev) => ({ ...prev, [currentPage]: true }));
                        
                        // If this is the last question or all questions are answered, finish quiz
                        if (currentPage === mcqs.length - 1 || Object.keys(selectedOptions).length === mcqs.length) {
                          // Mark all questions as reviewed for the final score
                          const newShowAnswers = {};
                          mcqs.forEach((_, index) => {
                            newShowAnswers[index] = true;
                          });
                          setShowAnswers(newShowAnswers);
                          saveQuizResult();
                        } else {
                          // Otherwise, move to next question
                          setCurrentPage(currentPage + 1);
                        }
                      }}
                      className={`py-2 px-6 rounded text-white font-medium transition-colors duration-200 ${
                        !selected 
                          ? darkMode 
                            ? 'bg-gray-600 cursor-not-allowed' 
                            : 'bg-gray-400 cursor-not-allowed'
                          : darkMode 
                            ? 'bg-purple-600 hover:bg-purple-700' 
                            : 'bg-purple-600 hover:bg-purple-700'
                      } active:transform active:scale-95`}
                      disabled={!selected}
                    >
                      {show ? 'Next Question' : 'Submit Answer'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // Mobile Quiz Interface with fixes for scrolling issues
              <div className="flex flex-col h-full flex-grow" style={{minHeight: 'calc(100vh - 120px)'}}>
                {/* Main Quiz Content */}
                <div className="w-full flex flex-col flex-grow">
                  {/* Question Counter and Progress */}
                  <div className="flex justify-between items-center mb-3">
                    <div className={`px-3 py-1 rounded-full flex items-center justify-center text-xs ${
                      darkMode ? 'bg-black text-white' : 'bg-white text-gray-800'
                    }`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>{currentPage + 1} of {mcqs.length}</span>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="w-1/3 h-1 rounded-full bg-gray-200 dark:bg-gray-700">
                      <div 
                        className="h-1 rounded-full bg-gradient-to-r from-orange-400 to-orange-600" 
                        style={{ width: `${(currentPage + 1) / mcqs.length * 100}%` }}
                      ></div>
                    </div>
                    
                    <div className={`px-3 py-1 rounded-full flex items-center justify-center text-xs ${
                      darkMode ? 'bg-orange-600 text-white' : 'bg-orange-500 text-white'
                    }`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{timeLimit > 0 ? formattedTime() : "--:--"}</span>
                    </div>
                  </div>
                  
                  {/* Circular Progress - smaller to save space */}
                  <div className="flex justify-center mb-3">
                    <div className="relative w-12 h-12">
                      <div className="absolute inset-0">
                        <svg className="w-full h-full" viewBox="0 0 100 100">
                          <circle
                            className="text-gray-200 dark:text-gray-600 stroke-current"
                            strokeWidth="8"
                            cx="50"
                            cy="50"
                            r="46"
                            fill={darkMode ? '#1a1a1a' : '#ffffff'}
                          ></circle>
                          <circle
                            className={`${darkMode ? 'text-orange-500' : 'text-purple-600'} stroke-current`}
                            strokeWidth="8"
                            strokeLinecap="round"
                            cx="50"
                            cy="50"
                            r="46"
                            fill="transparent"
                            strokeDasharray="289.02"
                            strokeDashoffset={289.02 * (1 - completionPercent / 100)}
                            transform="rotate(-90 50 50)"
                          ></circle>
                        </svg>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          {completionPercent}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Question Card - reduced padding */}
                  <div className={`rounded-2xl shadow-xl overflow-hidden ${
                    darkMode ? 'bg-gray-900' : 'bg-white'
                  } mb-3 transition-all duration-300 hover:shadow-2xl flex-shrink-0`}>
                    {/* Hint Button */}
                    <div className="p-4">
                      <div className="mb-2">
                        <button 
                          onClick={() => setShowHint(!showHint)} 
                          className={`text-xs px-2 py-1 rounded-full flex items-center ${
                            darkMode 
                              ? 'bg-orange-900/50 text-orange-400' 
                              : 'bg-orange-100 text-orange-600'
                          } transition-all duration-200 hover:shadow-md active:transform active:scale-95`}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                          </svg>
                          Hint
                        </button>
                      </div>

                      <h2 className={`text-xl font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        Question <span className={darkMode ? 'text-orange-400' : 'text-purple-600'}>{(currentPage + 1).toString().padStart(2, '0')}</span>
                      </h2>
                      
                      {fileName && (
                        <div className={`text-xs mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {fileName}
                        </div>
                      )}
                      
                      {showHint && (
                        <div className={`mb-3 p-2 rounded-lg text-xs ${
                          darkMode ? 'bg-gray-800 text-gray-300 border border-gray-700' : 
                                    'bg-purple-50 text-purple-700 border border-purple-100'
                        } animate-fadeIn`}>
                          {getHint()}
                        </div>
                      )}
                      
                      <p className={`text-sm ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>
                        {mcqs[currentPage].question}
                      </p>
                    </div>
                  </div>

                  {/* Mobile only: Show sidebar toggle button */}
                  <div className="lg:hidden mb-3">
                    <button 
                      onClick={() => setShowSidebar(!showSidebar)}
                      className={`w-full flex items-center justify-center gap-2 py-1.5 rounded-full text-sm ${
                        darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
                      } border ${darkMode ? 'border-gray-700' : 'border-gray-200'} transition-all duration-200 active:transform active:scale-95`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                      </svg>
                      {showSidebar ? 'Hide Question List' : 'Show Question List'}
                    </button>
                  </div>

                  {/* Mobile Question Navigation (shown when sidebar toggle is on) */}
                  {isMobileView && showSidebar && (
                    <div className={`mb-3 p-3 rounded-2xl shadow ${
                      darkMode ? 'bg-gray-800' : 'bg-white'
                    }`}>
                      <h3 className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Jump to Question
                      </h3>
                      <div className="grid grid-cols-5 sm:grid-cols-8 gap-1.5">
                        {mcqs.map((_, index) => {
                          const isAnswered = selectedOptions[index] !== undefined;
                          const isCurrent = currentPage === index;
                          
                          let buttonStyle = '';
                          if (isCurrent) {
                            buttonStyle = darkMode 
                              ? 'bg-orange-500 text-white border-orange-500' 
                              : 'bg-purple-600 text-white border-purple-600';
                          } else if (isAnswered) {
                            buttonStyle = darkMode 
                              ? 'bg-gray-700 text-gray-300 border-gray-600' 
                              : 'bg-purple-100 text-purple-700 border-purple-300';
                          } else {
                            buttonStyle = darkMode 
                              ? 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500' 
                              : 'bg-white text-gray-600 border-gray-300 hover:border-purple-300';
                          }
                          
                          return (
                            <button
                              key={index}
                              onClick={() => {
                                setCurrentPage(index);
                                setShowSidebar(false); // Hide sidebar after selecting on mobile
                              }}
                              className={`h-8 w-full rounded-full flex items-center justify-center border transition-all duration-200 ${
                                isCurrent ? 'transform hover:scale-[1.05]' : 'hover:shadow-sm'
                              } ${buttonStyle} active:transform active:scale-95 text-xs`}
                            >
                              {index + 1}
                            </button>
                          );
                        })}
                      </div>
                    </div>)}
                  
                  {/* Options - more compact design */}
                  <div className="space-y-2 flex-grow overflow-y-auto">
                    {Object.entries(mcqs[currentPage].options).map(([key, text]) => {
                      const isSelected = selected === key;
                      const isCorrect = mcqs[currentPage].answer === key;
                      const isWrong = show && isSelected && !isCorrect;
                      
                      let optionStyle = '';
                      if (darkMode) {
                        // Dark mode styling
                        if (show) {
                          if (isCorrect) {
                            optionStyle = 'bg-green-900/30 border border-green-600';
                          } else if (isWrong) {
                            optionStyle = 'bg-red-900/30 border border-red-600';
                          } else {
                            optionStyle = 'bg-gray-800 border border-gray-700';
                          }
                        } else {
                          optionStyle = isSelected 
                            ? 'bg-purple-900/50 border border-purple-500' 
                            : 'bg-gray-800 border border-gray-700';
                        }
                      } else {
                        // Light mode styling
                        if (show) {
                          if (isCorrect) {
                            optionStyle = 'bg-green-50 border border-green-300';
                          } else if (isWrong) {
                            optionStyle = 'bg-red-50 border border-red-300';
                          } else {
                            optionStyle = 'bg-white border border-gray-200';
                          }
                        } else {
                          optionStyle = isSelected 
                            ? 'bg-purple-50 border border-purple-300' 
                            : 'bg-white border border-gray-200';
                        }
                      }
                      
                      return (
                        <div
                          key={key}
                          onClick={() => handleOptionClick(key)}
                          className={`p-3 rounded-full cursor-pointer transition-all duration-200 transform hover:scale-[1.01] ${
                            isSelected ? 'hover:shadow-md' : ''
                          } flex justify-between items-center ${optionStyle} text-sm`}
                        >
                          <span className={`${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{text}</span>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            show 
                              ? isCorrect
                                ? 'bg-green-500 text-white'
                                : isWrong
                                  ? 'bg-red-500 text-white'
                                  : 'border border-gray-300'
                              : isSelected
                                ? 'bg-purple-600 border border-purple-600'
                                : 'border border-gray-300'
                          }`}>
                            {show && isCorrect && (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                            {show && isWrong && (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            )}
                            {isSelected && !show && (
                              <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Next button - at the bottom of the container */}
                  <button
                    onClick={() => {
                      if (currentPage < mcqs.length - 1) {
                        setCurrentPage(currentPage + 1);
                      } else {
                        // Mark all questions as reviewed for the final score
                        const newShowAnswers = {};
                        mcqs.forEach((_, index) => {
                          newShowAnswers[index] = true;
                        });
                        setShowAnswers(newShowAnswers);
                        saveQuizResult();
                      }
                    }}
                    className={`w-full py-2 rounded-full font-medium text-sm text-white transition-all duration-200 active:transform active:scale-95 ${
                      darkMode 
                        ? 'bg-orange-600 hover:bg-orange-700' 
                        : 'bg-purple-600 hover:bg-purple-700'
                    } mt-4`}
                  >
                    {currentPage < mcqs.length - 1 ? 'Next' : 'Finish'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Authentication Modal */}
        {showAuthModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className={`w-full max-w-md rounded-3xl shadow-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} p-5`}>
              <div className="flex justify-between items-center mb-4">
                <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-purple-700'}`}>
                  {authMode === 'login' ? 'Login to SnapQuiz' : 'Register for SnapQuiz'}
                </h2>
                <button
                  onClick={() => setShowAuthModal(false)}
                  className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} active:transform active:scale-95 transition-transform duration-150`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${darkMode ? 'text-white' : 'text-gray-700'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Auth Mode Toggle */}
              <div className="flex rounded-full overflow-hidden mb-4 bg-gray-100 dark:bg-gray-700">
                <button 
                  onClick={() => setAuthMode('login')}
                  className={`flex-1 py-1.5 text-sm ${authMode === 'login' 
                    ? darkMode ? 'bg-purple-600 text-white' : 'bg-purple-600 text-white'
                    : darkMode ? 'bg-transparent text-gray-300' : 'bg-transparent text-gray-600'
                  } active:transform active:scale-95 transition-transform duration-150`}
                >
                  Login
                </button>
                <button 
                  onClick={() => setAuthMode('register')}
                  className={`flex-1 py-1.5 text-sm ${authMode === 'register' 
                    ? darkMode ? 'bg-purple-600 text-white' : 'bg-purple-600 text-white' 
                    : darkMode ? 'bg-transparent text-gray-300' : 'bg-transparent text-gray-600'
                  } active:transform active:scale-95 transition-transform duration-150`}
                >
                  Register
                </button>
              </div>
              
              {/* Auth Form with error display */}
              {authMode === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-3">
                  {authError && (
                    <div className={`p-2 rounded-md text-xs ${
                      darkMode 
                        ? "bg-red-900/30 text-red-300" 
                        : "bg-red-100 text-red-700"
                    }`}>
                      {authError}
                    </div>
                  )}
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      className={`w-full rounded-full text-sm ${
                        darkMode 
                          ? "bg-gray-700 border-gray-600 text-white" 
                          : "border-gray-300"
                      } px-3 py-1.5 focus:ring-purple-500 focus:border-purple-500`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      className={`w-full rounded-full text-sm ${
                        darkMode 
                          ? "bg-gray-700 border-gray-600 text-white" 
                          : "border-gray-300"
                      } px-3 py-1.5 focus:ring-purple-500 focus:border-purple-500`}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full font-medium py-1.5 rounded-full transition-all duration-200 active:transform active:scale-95 text-sm ${
                      loading
                        ? "bg-gray-400 cursor-not-allowed"
                        : darkMode
                          ? "bg-purple-600 hover:bg-purple-500 text-white"
                          : "bg-purple-600 hover:bg-purple-700 text-white"
                    }`}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Logging in...
                      </div>
                    ) : "Login"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-3">
                  {authError && (
                    <div className={`p-2 rounded-md text-xs ${
                      darkMode 
                        ? "bg-red-900/30 text-red-300" 
                        : "bg-red-100 text-red-700"
                    }`}>
                      {authError}
                    </div>
                  )}
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
                      Username
                    </label>
                    <input
                      type="text"
                      required
                      className={`w-full rounded-full text-sm ${
                        darkMode 
                          ? "bg-gray-700 border-gray-600 text-white" 
                          : "border-gray-300"
                      } px-3 py-1.5 focus:ring-purple-500 focus:border-purple-500`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      className={`w-full rounded-full text-sm ${
                        darkMode 
                          ? "bg-gray-700 border-gray-600 text-white" 
                          : "border-gray-300"
                      } px-3 py-1.5 focus:ring-purple-500 focus:border-purple-500`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      className={`w-full rounded-full text-sm ${
                        darkMode 
                          ? "bg-gray-700 border-gray-600 text-white" 
                          : "border-gray-300"
                      } px-3 py-1.5 focus:ring-purple-500 focus:border-purple-500`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? "text-gray-200" : "text-gray-700"}`}>
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      required
                      className={`w-full rounded-full text-sm ${
                        darkMode 
                          ? "bg-gray-700 border-gray-600 text-white" 
                          : "border-gray-300"
                      } px-3 py-1.5 focus:ring-purple-500 focus:border-purple-500`}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className={`w-full font-medium py-1.5 rounded-full transition-all duration-200 active:transform active:scale-95 text-sm ${
                      loading
                        ? "bg-gray-400 cursor-not-allowed"
                        : darkMode
                          ? "bg-purple-600 hover:bg-purple-500 text-white"
                          : "bg-purple-600 hover:bg-purple-700 text-white"
                    }`}
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Registering...
                      </div>
                    ) : "Register"}
                  </button>
                </form>
              )}
              
              {/* Default credentials notice - Updated with current date/time */}
              {authMode === 'login' && (
                <div className={`mt-3 text-xs ${darkMode ? "text-gray-400" : "text-gray-600"} bg-opacity-50 p-2 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-100"}`}>
                  <p>Default credentials:</p>
                  <p className="font-medium mt-1">Username: Pranjal-045</p>
                  <p className="font-medium">Password: password123</p>
                  <p className={`mt-1 text-xs ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
                    Current Date and Time (UTC): 2025-07-03 10:38:00
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Logout Confirmation Dialog */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className={`w-full max-w-sm rounded-2xl shadow-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} p-4`}>
              <h3 className={`text-base font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Confirm Logout
              </h3>
              <p className={`mb-4 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Are you sure you want to log out? Any unsaved quiz progress will be lost.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                  } hover:opacity-90 active:transform active:scale-95 transition-all duration-200`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setUser(null);
                    setShowLogoutConfirm(false);
                    setMcqs([]); // Go back to landing page
                    setFile(null);
                    setFileName("");
                  }}
                  className="px-3 py-1.5 rounded-full text-sm font-medium bg-red-600 text-white hover:bg-red-700 active:transform active:scale-95 transition-all duration-200"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer - more compact with updated branding */}
        <footer className={`mt-auto text-center text-sm py-2`}>
          <p className={`${darkMode ? "text-white/60" : "text-white/80"} text-xs`}>
            SnapQuiz • Created by Pranjal-045
          </p>
          <p className={`text-xs mt-0.5 ${darkMode ? "text-white/40" : "text-white/60"}`}>
            Current Date and Time (UTC): 2025-07-03 10:38:00
          </p>
          <p className={`text-xs mt-0.5 ${darkMode ? "text-white/40" : "text-white/60"}`}>
            Current User's Login: Pranjal-045
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;