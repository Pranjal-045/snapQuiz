import { useState, useEffect } from 'react';

const Timer = ({ timeLimit, onTimeUp, darkMode, isMobileView }) => {
  const [timeLeft, setTimeLeft] = useState(timeLimit * 60);
  const [isWarning, setIsWarning] = useState(false);
  
  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp();
      return;
    }

    // Set warning when less than 1 minute remains
    if (timeLeft <= 60 && !isWarning) {
      setIsWarning(true);
    }
    
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft, onTimeUp, isWarning]);
  
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  return (
    <div
      className={`flex items-center ${isMobileView ? 'px-3 py-1.5' : 'px-4 py-2'} rounded-full ${
        isWarning 
          ? darkMode ? "bg-red-900/40 text-red-400 animate-pulse" : "bg-red-100 text-red-700 animate-pulse"
          : darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"
      }`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className={`${isMobileView ? 'h-4 w-4 mr-1' : 'h-5 w-5 mr-2'} ${isWarning ? "text-red-500" : darkMode ? "text-orange-400" : "text-purple-600"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className={`font-medium ${isMobileView ? 'text-sm' : ''}`}>
        {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </span>
    </div>
  );
};

export default Timer;