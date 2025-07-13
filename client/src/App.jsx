import { useState, useEffect } from "react";
import axios from "axios";

function App() {
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState("");
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved === "true" ? true : false;
  });

  // API URL configuration
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

  // Check for existing authentication on load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token and get user info
      axios.get(`${API_BASE_URL}/api/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(response => {
        setUser(response.data);
      })
      .catch(() => {
        localStorage.removeItem('token');
      });
    }
  }, [API_BASE_URL]);

  // Toggle dark mode
  useEffect(() => {
    localStorage.setItem("darkMode", darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const handleAuth = async (formData) => {
    try {
      setAuthError("");
      const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
      const response = await axios.post(`${API_BASE_URL}${endpoint}`, formData);
      
      localStorage.setItem('token', response.data.token);
      setUser(response.data.user);
      setShowAuthModal(false);
    } catch (error) {
      setAuthError(error.response?.data?.message || 'Authentication failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white min-h-screen">
        {/* Header */}
        <header className="bg-blue-600 dark:bg-blue-700 text-white p-4">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold">Hackfolio</h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg bg-blue-500 hover:bg-blue-400 transition-colors"
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
              {user ? (
                <div className="flex items-center space-x-2">
                  <span>Welcome, {user.username}!</span>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto p-8">
          {user ? (
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-8">Build Your Professional Resume</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">📝 Create New Resume</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Start building your resume from scratch with our AI-powered suggestions.
                  </p>
                  <button className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
                    Get Started
                  </button>
                </div>
                
                <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">📋 My Resumes</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    View and edit your existing resumes.
                  </p>
                  <button className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors">
                    View Resumes
                  </button>
                </div>
                
                <div className="bg-gray-100 dark:bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold mb-4">🎨 Templates</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    Choose from professional resume templates.
                  </p>
                  <button className="w-full px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors">
                    Browse Templates
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <h2 className="text-4xl font-bold mb-6">Welcome to Hackfolio</h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
                Build professional resumes with AI-powered suggestions
              </p>
              <div className="grid md:grid-cols-3 gap-8 mb-12">
                <div className="text-center">
                  <div className="text-4xl mb-4">🤖</div>
                  <h3 className="text-xl font-semibold mb-2">AI-Powered</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Get intelligent suggestions for your resume content
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-4xl mb-4">📱</div>
                  <h3 className="text-xl font-semibold mb-2">Responsive Design</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Works perfectly on all devices and screen sizes
                  </p>
                </div>
                <div className="text-center">
                  <div className="text-4xl mb-4">📄</div>
                  <h3 className="text-xl font-semibold mb-2">Professional Templates</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Choose from multiple professional resume templates
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-lg font-semibold transition-colors"
              >
                Get Started Today
              </button>
            </div>
          )}
        </main>

        {/* Authentication Modal */}
        {showAuthModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg w-full max-w-md">
              <h2 className="text-2xl font-bold mb-6 text-center">
                {authMode === 'login' ? 'Sign In' : 'Sign Up'}
              </h2>
              
              {authError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {authError}
                </div>
              )}
              
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData);
                handleAuth(data);
              }}>
                {authMode === 'register' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                )}
                
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Username</label>
                  <input
                    type="text"
                    name="username"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Password</label>
                  <input
                    type="password"
                    name="password"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {authMode === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              </form>
              
              <div className="mt-4 text-center">
                <button
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  {authMode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
                </button>
              </div>
              
              <button
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;