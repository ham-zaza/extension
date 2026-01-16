import React, { useState, useEffect } from 'react';
import PinSetup from './components/PinSetup';
import LockScreen from './components/LockScreen';
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';
import { Shield } from 'lucide-react';

const SESSION_TIMEOUT_MS = 300000; // 5 minutes (Fixed from 2 mins)

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
            if (secretX !== null && Date.now() - lastActivity > SESSION_TIMEOUT_MS) {
                console.log("Session Timed Out due to Inactivity");
                handleLogout();
            }
        }, 30000); // Check every 30s

        return () => clearInterval(interval);
    }, [secretX, lastActivity]);

    // This now updates on ANY mouse move or key press
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
            <div className="flex items-center justify-center h-screen bg-slate-950">
                <Shield className="animate-spin h-8 w-8 text-blue-500" />
            </div>
        );
    }

    /* ---------- Render ---------- */
    return (
        // 1. CHANGED: Global Dark Theme (bg-slate-950 text-slate-100)
        // 2. CHANGED: Added Global Activity Listeners (onMouseMove, onKeyDown)
        <div
            className="w-[350px] h-[600px] bg-slate-950 text-slate-100 overflow-hidden font-sans"
            onMouseMove={updateActivity}
            onKeyDown={updateActivity}
            onClick={updateActivity}
        >
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