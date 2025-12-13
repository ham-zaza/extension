import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import PinSetup from './components/PinSetup';
import LockScreen from './components/LockScreen';
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';
import { Shield } from 'lucide-react';

const App = () => {
  const [currentScreen, setCurrentScreen] = useState('loading');
  const [secretX, setSecretX] = useState(null);
  const [username, setUsername] = useState('');
  const [sessionStart, setSessionStart] = useState(null);
  const [lastActivity, setLastActivity] = useState(Date.now());

  useEffect(() => {
    checkSetup();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (secretX !== null && Date.now() - lastActivity > 120000) {
        setSecretX(null);
        setCurrentScreen('lock');
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [secretX, lastActivity]);

  const updateActivity = () => {
    setLastActivity(Date.now());
  };

  const checkSetup = async () => {
    const data = await chrome.storage.local.get(['encryptedX']);
    if (data.encryptedX) {
      setCurrentScreen('lock');
    } else {
      setCurrentScreen('pinSetup');
    }
  };

  const handlePinSet = (x) => {
    setSecretX(x);
    setCurrentScreen('login');
  };

  const handleUnlock = (x) => {
    setSecretX(x);
    setCurrentScreen('login');
  };

  const handleLogin = (user) => {
    setUsername(user);
    setSessionStart(Date.now());
    setCurrentScreen('dashboard');
  };

  const handleLogout = () => {
    setSecretX(null);
    setUsername('');
    setSessionStart(null);
    setCurrentScreen('lock');
  };

  if (currentScreen === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen">
        <Shield className="animate-spin h-8 w-8 text-blue-500" />
      </div>
    );
  }

  return (
    <ThemeProvider>
      <div className="w-96 h-[600px] bg-white dark:bg-gray-900 text-gray-900 dark:text-white overflow-hidden">
        {currentScreen === 'pinSetup' && (
          <PinSetup onPinSet={handlePinSet} />
        )}
        {currentScreen === 'lock' && (
          <LockScreen onUnlock={handleUnlock} />
        )}
        {currentScreen === 'login' && (
          <LoginForm
            secretX={secretX}
            onLogin={handleLogin}
            updateActivity={updateActivity}
          />
        )}
        {currentScreen === 'dashboard' && (
          <Dashboard
            username={username}
            sessionStart={sessionStart}
            onLogout={handleLogout}
            updateActivity={updateActivity}
          />
        )}
      </div>
    </ThemeProvider>
  );
};

export default App;
