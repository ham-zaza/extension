import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { io } from 'socket.io-client';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { computeProof, getPublicKeys } from '../utils/cryptoUtils';

// ⚠️ VERIFY SERVER IP
const SERVER_URL = "http://192.168.100.187:3000";

const LoginForm = ({ secretX, onLogin }) => {
    // Modes: login-zkp | login-qr | recovery
    const [mode, setMode] = useState('login-zkp');
    const [status, setStatus] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);

    // QR state
    const [sessionId, setSessionId] = useState(null);
    const socketRef = useRef(null);

    // Recovery state
    const [totpCode, setTotpCode] = useState('');
    const [recoveryToken, setRecoveryToken] = useState(null);

    /* =====================================================
       1. QR LOGIN FLOW
    ===================================================== */
    useEffect(() => {
        if (mode !== 'login-qr') return;

        const newSessionId = crypto.randomUUID();
        setSessionId(newSessionId);

        socketRef.current = io(SERVER_URL);

        socketRef.current.on('connect', () => {
            socketRef.current.emit('join_session', newSessionId);
        });

        socketRef.current.on('login_success', (data) => {
            setStatus('✅ Verified by Mobile');
            setTimeout(() => onLogin(data.username), 1000);
        });

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [mode, onLogin]);

    /* =====================================================
       2. MANUAL REGISTRATION
    ===================================================== */
    const handleRegister = async () => {
        if (!username) {
            setStatus('❌ Username required');
            return;
        }

        setLoading(true);
        setStatus('Registering identity...');

        try {
            const keys = await getPublicKeys(secretX);

            const response = await fetch(`${SERVER_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    publicKeyY: keys.y,
                    publicKeyZ: keys.z
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Registration failed');
            }

            setStatus('✅ Registered successfully');
        } catch (e) {
            setStatus(`❌ ${e.message}`);
        }

        setLoading(false);
    };

    /* =====================================================
       3. MANUAL ZKP LOGIN
    ===================================================== */
    const handleZKPLogin = async () => {
        if (!username) {
            setStatus('❌ Username required');
            return;
        }

        setLoading(true);
        setStatus('Generating proof...');

        try {
            const proof = await computeProof(secretX, 'chrome-extension://zk-auth');

            const response = await fetch(`${SERVER_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, ...proof })
            });

            if (!response.ok) {
                throw new Error('Invalid proof');
            }

            const data = await response.json();
            onLogin(data.username || username);
        } catch (e) {
            setStatus(`❌ ${e.message}`);
        }

        setLoading(false);
    };

    /* =====================================================
       4. ACCOUNT RECOVERY (NO LOGIN)
    ===================================================== */
    const handleRecovery = async () => {
        if (totpCode.length !== 6) return;

        setLoading(true);
        setStatus('Verifying ownership...');

        try {
            const response = await fetch(`${SERVER_URL}/api/recover`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    token: totpCode
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Invalid backup code');
            }

            setRecoveryToken(data.recoveryToken);
            setStatus('✅ Recovery approved');
        } catch (e) {
            setStatus(`❌ ${e.message}`);
        }

        setLoading(false);
    };

    /* =====================================================
       5. HANDLE FINAL RESET
    ===================================================== */
    const handleFinalReset = async () => {
        if (!confirm("Are you sure? This will disconnect all devices.")) return;
        setLoading(true);
        try {
            const response = await fetch(`${SERVER_URL}/api/reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, recoveryToken })
            });

            if (response.ok) {
                alert("Account Reset Successful! You can now Register as a new user.");
                window.location.reload();
            } else {
                const data = await response.json();
                alert("Reset Failed: " + data.message);
            }
        } catch (e) {
            alert("Network Error");
        }
        setLoading(false);
    };

    /* =====================================================
       TERMINAL RECOVERY VIEW
    ===================================================== */
    if (recoveryToken) {
        return (
            <div className="p-6 h-full flex flex-col items-center justify-center bg-red-50 text-slate-900">
                <ShieldAlert className="w-16 h-16 text-red-600 mb-4" />
                <h2 className="text-xl font-bold text-red-700 mb-2">Account Reset Mode</h2>
                <p className="text-sm text-center text-slate-600 mb-6">
                    Identity verified. You can now wipe your old keys and start over.
                </p>

                <div className="bg-white p-3 rounded border border-red-200 font-mono text-[10px] break-all w-full mb-6">
                    {recoveryToken}
                </div>

                <button
                    onClick={handleFinalReset}
                    className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition shadow-lg mb-4"
                >
                    ⚠ RESET ACCOUNT KEYS
                </button>

                <button
                    onClick={() => window.location.reload()}
                    className="text-sm text-slate-500 underline"
                >
                    Cancel
                </button>
            </div>
        );
    }

    /* =====================================================
       MAIN UI
    ===================================================== */
    return (
        <div className="p-6 h-full flex flex-col bg-white text-slate-900">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-slate-800">
                    {mode === 'recovery' ? 'Recover Account' : 'ZK Login'}
                </h2>
                <p className="text-sm text-slate-500">
                    {mode === 'recovery'
                        ? 'Use backup code to reset access'
                        : 'Zero-Knowledge Authentication'}
                </p>
            </div>

            {mode !== 'recovery' && (
                <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
                    <button
                        onClick={() => setMode('login-zkp')}
                        className={`flex-1 py-2 text-xs font-bold rounded-md ${
                            mode === 'login-zkp'
                                ? 'bg-white shadow text-blue-600'
                                : 'text-slate-400'
                        }`}
                    >
                        Manual
                    </button>
                    <button
                        onClick={() => setMode('login-qr')}
                        className={`flex-1 py-2 text-xs font-bold rounded-md ${
                            mode === 'login-qr'
                                ? 'bg-white shadow text-blue-600'
                                : 'text-slate-400'
                        }`}
                    >
                        QR Scan
                    </button>
                </div>
            )}

            {mode === 'login-zkp' && (
                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full p-3 border rounded-lg"
                    />
                    <div className="flex space-x-3">
                        <button
                            onClick={handleRegister}
                            disabled={loading}
                            className="flex-1 bg-slate-100 py-3 rounded-lg font-bold"
                        >
                            Register
                        </button>
                        <button
                            onClick={handleZKPLogin}
                            disabled={loading}
                            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold"
                        >
                            Login
                        </button>
                    </div>
                </div>
            )}

            {mode === 'login-qr' && (
                <div className="flex flex-col items-center flex-1 justify-center">
                    <div className="p-2 border rounded-xl mb-4">
                        {sessionId && (
                            <QRCodeSVG
                                value={JSON.stringify({ sessionId })}
                                size={140}
                            />
                        )}
                    </div>
                    <p className="text-xs text-slate-400 mb-6">
                        Scan with ZK-Auth Mobile
                    </p>
                    <button
                        onClick={() => setMode('recovery')}
                        className="text-xs text-red-500 flex items-center"
                    >
                        <ShieldAlert className="w-3 h-3 mr-1" />
                        Lost Device? Recover Account
                    </button>
                </div>
            )}

            {mode === 'recovery' && (
                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full p-3 border rounded-lg"
                    />
                    <input
                        type="text"
                        placeholder="000000"
                        value={totpCode}
                        onChange={(e) =>
                            setTotpCode(
                                e.target.value.replace(/\D/g, '').slice(0, 6)
                            )
                        }
                        className="w-full p-3 border rounded-lg text-center text-2xl font-mono"
                    />
                    <button
                        onClick={handleRecovery}
                        disabled={loading || totpCode.length !== 6}
                        className="w-full bg-red-600 text-white py-3 rounded-lg font-bold"
                    >
                        Recover Account
                    </button>
                    <button
                        onClick={() => setMode('login-qr')}
                        className="w-full text-xs text-slate-500 flex justify-center items-center"
                    >
                        <ArrowLeft className="w-3 h-3 mr-1" /> Cancel
                    </button>
                </div>
            )}

            {status && (
                <div
                    className={`mt-auto p-3 text-xs font-bold text-center rounded-lg ${
                        status.includes('❌')
                            ? 'bg-red-100 text-red-600'
                            : status.includes('✅')
                                ? 'bg-green-100 text-green-600'
                                : 'bg-blue-50 text-blue-600'
                    }`}
                >
                    {status}
                </div>
            )}
        </div>
    );
};

export default LoginForm;
