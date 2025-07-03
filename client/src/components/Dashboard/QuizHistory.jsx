import { useState, useEffect } from 'react';
import { format, formatDistanceToNow } from 'date-fns';

const QuizHistory = ({ darkMode, onRetakeQuiz, onDeleteQuiz, onClearAllQuizzes }) => {
  const [quizHistory, setQuizHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(''); // Clear any previous errors
      
      // Get user data from localStorage
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const userId = userData.id;
      
      if (!userId) {
        setQuizHistory([]);
        setLoading(false);
        return;
      }
      
      // Get all quizzes from localStorage
      const allQuizzes = JSON.parse(localStorage.getItem('quizHistory') || '[]');
      
      // Filter quizzes for the current user
      const userQuizzes = allQuizzes.filter(quiz => 
        !quiz.userId || quiz.userId === userId
      );
      
      setQuizHistory(userQuizzes);
      
    } catch (err) {
      setError('Failed to load quiz history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuizItemClick = (quiz) => {
    if (onRetakeQuiz) {
      onRetakeQuiz(quiz.id);
    }
  };

  const handleDeleteQuiz = (e, quizId) => {
    e.stopPropagation(); // Prevent quiz retake when clicking delete
    
    if (onDeleteQuiz) {
      onDeleteQuiz(quizId);
      // Update local state to reflect deletion
      setQuizHistory(prev => prev.filter(quiz => quiz.id !== quizId));
    }
  };

  const handleClearAll = () => {
    setShowDeleteConfirm(true);
  };

  const confirmClearAll = () => {
    if (onClearAllQuizzes) {
      onClearAllQuizzes();
      setQuizHistory([]);
    }
    setShowDeleteConfirm(false);
  };

  if (loading) {
    return (
      <div className="animate-pulse p-6">
        <div className={`h-6 ${darkMode ? "bg-gray-700" : "bg-gray-200"} rounded w-1/3 mb-6`}></div>
        {[...Array(3)].map((_, i) => (
          <div key={i} className={`mb-4 pb-4 border-b ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
            <div className={`h-5 ${darkMode ? "bg-gray-700" : "bg-gray-200"} rounded w-3/4 mb-3`}></div>
            <div className={`h-4 ${darkMode ? "bg-gray-700" : "bg-gray-200"} rounded w-1/4 mb-2`}></div>
            <div className={`h-4 ${darkMode ? "bg-gray-700" : "bg-gray-200"} rounded w-1/2`}></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className={`${darkMode ? "bg-red-900/30 text-red-300" : "bg-red-100 text-red-700"} p-4 rounded-lg`}>
          {error}
        </div>
      </div>
    );
  }

  if (quizHistory.length === 0) {
    return (
      <div className="p-6">
        <h2 className={`text-xl font-semibold mb-6 ${darkMode ? "text-white" : "text-gray-800"}`}>
          Quiz History
        </h2>
        <div className={`text-center py-8 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-16 w-16 mx-auto mb-4 ${darkMode ? "text-gray-600" : "text-gray-300"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <p className="mb-2">No quiz history found</p>
          <p>Take your first quiz to see your activity here!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className={`text-xl font-semibold ${darkMode ? "text-white" : "text-gray-800"}`}>
          Quiz History
        </h2>
        
        {quizHistory.length > 0 && (
          <button
            onClick={handleClearAll}
            className={`px-3 py-1 text-sm rounded-full ${
              darkMode 
                ? "bg-red-900/30 hover:bg-red-800/40 text-red-300" 
                : "bg-red-100 hover:bg-red-200 text-red-700"
            } transition-colors flex items-center`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear All
          </button>
        )}
      </div>
      
      {showDeleteConfirm && (
        <div className={`mb-4 p-4 rounded-lg ${darkMode ? "bg-red-900/30 border-red-800" : "bg-red-50 border-red-200"} border`}>
          <p className={`mb-3 ${darkMode ? "text-red-200" : "text-red-700"}`}>
            Are you sure you want to delete all quiz history? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className={`px-3 py-1 text-sm rounded-full ${
                darkMode 
                  ? "bg-gray-700 hover:bg-gray-600 text-gray-200" 
                  : "bg-gray-200 hover:bg-gray-300 text-gray-700"
              }`}
            >
              Cancel
            </button>
            <button
              onClick={confirmClearAll}
              className="px-3 py-1 text-sm rounded-full bg-red-600 hover:bg-red-700 text-white"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      )}
      
      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
        {quizHistory.map((quiz) => {
          const date = new Date(quiz.created_at);
          const percentage = Math.round((quiz.correct_answers / quiz.total_questions) * 100);
          
          return (
            <div 
              key={quiz.id} 
              onClick={() => handleQuizItemClick(quiz)}
              className={`group ${darkMode ? "bg-gray-800" : "bg-white"} rounded-2xl shadow-sm p-4 border transition-all ${
                darkMode ? "border-gray-700" : "border-gray-200"
              } cursor-pointer hover:border-purple-400 dark:hover:border-purple-500 relative`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className={`font-medium text-base ${darkMode ? "text-white" : "text-gray-800"}`}>
                    {quiz.title || "Untitled Quiz"}
                  </h3>
                  <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    {format(date, 'PPP')} • {formatDistanceToNow(date, { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    percentage >= 70
                      ? darkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800'
                      : percentage >= 40
                      ? darkMode ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-800'
                      : darkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-800'
                  }`}>
                    {quiz.correct_answers}/{quiz.total_questions} ({percentage}%)
                  </div>
                  
                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDeleteQuiz(e, quiz.id)}
                    className={`p-1.5 rounded-full opacity-70 hover:opacity-100 ${
                      darkMode 
                        ? "hover:bg-red-900/50 text-red-400 hover:text-red-300" 
                        : "hover:bg-red-100 text-red-500"
                    }`}
                    title="Delete this quiz"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="mt-3 flex justify-between items-center text-sm">
                <div className={`flex items-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {Math.floor(quiz.time_taken / 60)}m {quiz.time_taken % 60}s
                </div>
                
                <button 
                  className={`text-xs px-3 py-1 rounded-full transition-colors flex items-center ${
                    darkMode 
                      ? "bg-purple-900/30 text-purple-300 hover:bg-purple-800/40" 
                      : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuizItemClick(quiz);
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retake Quiz
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default QuizHistory;