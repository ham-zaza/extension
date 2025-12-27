import React, { useState, useEffect } from 'react';
import PinSetup from './components/PinSetup';
import LockScreen from './components/LockScreen';
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';
import { Shield } from 'lucide-react';

const SESSION_TIMEOUT_MS = 120000; // 2 minutes

const App = () => {
    const [currentScreen, setCurrentScreen] = useState('loading');
    const [secretX, setSecretX] = useState(null);
    const [username, setUsername] = useState('');
    const [sessionStart, setSessionStart] = useState(null);
    const [lastActivity, setLastActivity] = useState(Date.now());

    /* ---------- Initial Setup Check ---------- */
    useEffect(() => {
        checkSetup();
    }, []);

    /* ---------- Global Session Timeout ---------- */
    useEffect(() => {
        const interval = setInterval(() => {
            if (
                secretX !== null &&
                Date.now() - lastActivity > SESSION_TIMEOUT_MS
            ) {
                handleLogout();
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [secretX, lastActivity]);

    const updateActivity = () => {
        setLastActivity(Date.now());
    };

    /* ---------- Storage Check ---------- */
    const checkSetup = async () => {
        const data = await chrome.storage.local.get(['encryptedX']);
        if (data.encryptedX) {
            setCurrentScreen('lock');
        } else {
            setCurrentScreen('pinSetup');
        }
    };

    /* ---------- Handlers ---------- */
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

    /* ---------- Loading ---------- */
    if (currentScreen === 'loading') {
        return (
            <div className="flex items-center justify-center h-screen">
                <Shield className="animate-spin h-8 w-8 text-blue-500" />
            </div>
        );
    }

    /* ---------- Render ---------- */
    return (
        <div className="w-[350px] h-[600px] bg-white text-slate-900 overflow-hidden">
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
    );
};

export default App;
