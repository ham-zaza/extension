import React, { useState, useEffect } from 'react';
import { Shield, Users, Clock, LogOut, Sun, Moon, HelpCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const Dashboard = ({ username, sessionStart, onLogout, updateActivity }) => {
  const { isDark, toggleTheme } = useTheme();
  const [timeLeft, setTimeLeft] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - sessionStart;
      const remaining = Math.max(0, 120000 - elapsed);
      setTimeLeft(Math.ceil(remaining / 1000));
      if (remaining <= 0) {
        onLogout();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStart, onLogout]);

  useEffect(() => {
    // Simulate fetching active users
    setActiveUsers(Math.floor(Math.random() * 100) + 1);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleActivity = () => {
    updateActivity();
  };

  return (
    <div className="p-6 space-y-6" onClick={handleActivity}>
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <div className="flex space-x-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title="Toggle theme"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            onClick={onLogout}
            className="p-2 rounded-full hover:bg-red-200 dark:hover:bg-red-700 transition-colors text-red-500"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Shield className={`h-6 w-6 ${timeLeft > 0 ? 'text-green-500' : 'text-red-500'}`} />
            <span className="font-medium">Session Status</span>
          </div>
          <div className={`text-2xl font-bold ${timeLeft > 0 ? 'text-green-500' : 'text-red-500'}`}>
            {timeLeft > 0 ? 'Active' : 'Expired'}
          </div>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Users className="h-6 w-6 text-blue-500" />
            <span className="font-medium">Active Users</span>
          </div>
          <div className="text-2xl font-bold text-blue-500">{activeUsers}</div>
        </div>
      </div>

      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <Clock className="h-6 w-6 text-orange-500" />
          <span className="font-medium">Session Time Left</span>
        </div>
        <div className="text-3xl font-bold text-orange-500">{formatTime(timeLeft)}</div>
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Auto-logout in {formatTime(timeLeft)}
        </div>
      </div>

      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <HelpCircle className="h-6 w-6 text-purple-500" />
          <span className="font-medium">Welcome, {username}!</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your session is secure with zero-knowledge proof authentication.
        </p>
      </div>

      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        Click anywhere to extend session
      </div>
    </div>
  );
};

export default Dashboard;
