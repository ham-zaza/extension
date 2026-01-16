import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { io } from 'socket.io-client';
import { ShieldAlert, ArrowLeft, Scan, Lock, Zap, RefreshCw } from 'lucide-react';
import { computeProof, getPublicKeys } from '../utils/cryptoUtils';

// ⚠️ VERIFY SERVER IP
const SERVER_URL = "http://192.168.100.10:3000";

const LoginForm = ({ secretX, onLogin }) => {
    // Modes: login-zkp | login-qr | recovery
    const [mode, setMode] = useState('login-zkp');
    const [status, setStatus] = useState('System Ready');
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
        setStatus('Initializing Secure Handshake...');

        socketRef.current = io(SERVER_URL);

        socketRef.current.on('connect', () => {
            setStatus('>> Socket Connected. Waiting for Mobile...');
            socketRef.current.emit('join_session', newSessionId);
        });

        socketRef.current.on('login_success', (data) => {
            setStatus('✅ ACCESS GRANTED. Decrypting Session...');
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
        if (!username) { setStatus('❌ ERROR: Username missing'); return; }
        setLoading(true);
        setStatus('>> Generating Identity Pair...');
        try {
            const keys = await getPublicKeys(secretX);
            const response = await fetch(`${SERVER_URL}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, publicKeyY: keys.y, publicKeyZ: keys.z })
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || 'Registration failed');
            }
            setStatus('✅ Identity Registered on Blockchain.');
        } catch (e) { setStatus(`❌ Error: ${e.message}`); }
        setLoading(false);
    };

    /* =====================================================
       3. MANUAL ZKP LOGIN
    ===================================================== */
    const handleZKPLogin = async () => {
        if (!username) { setStatus('❌ ERROR: Username missing'); return; }
        setLoading(true);
        setStatus('>> Computing Zero-Knowledge Proof...');
        try {
            const proof = await computeProof(secretX, 'chrome-extension://zk-auth');
            const response = await fetch(`${SERVER_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, ...proof })
            });
            if (!response.ok) throw new Error('Invalid proof');
            const data = await response.json();
            onLogin(data.username || username);
        } catch (e) { setStatus(`❌ Access Denied: ${e.message}`); }
        setLoading(false);
    };

    /* =====================================================
       4. ACCOUNT RECOVERY
    ===================================================== */
    const handleRecovery = async () => {
        if (totpCode.length !== 6) return;
        setLoading(true);
        setStatus('>> Verifying TOTP Signature...');
        try {
            const response = await fetch(`${SERVER_URL}/api/recover`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, token: totpCode })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Invalid backup code');
            setRecoveryToken(data.recoveryToken);
            setStatus('✅ OVERRIDE APPROVED.');
        } catch (e) { setStatus(`❌ Recovery Failed: ${e.message}`); }
        setLoading(false);
    };

    /* =====================================================
       5. HANDLE FINAL RESET
    ===================================================== */
    const handleFinalReset = async () => {
        if (!confirm("CONFIRM PROTOCOL: Wipe all keys?")) return;
        setLoading(true);
        try {
            const response = await fetch(`${SERVER_URL}/api/reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, recoveryToken })
            });
            if (response.ok) {
                // 🛑 CRITICAL : Wipe Local Storage before reloading
                await chrome.storage.local.clear();

                alert("SYSTEM RESET COMPLETE. Rerouting...");
                window.location.reload();
            } else {
                const data = await response.json();
                alert("RESET FAILED: " + data.message);
            }
        } catch (e)
        {
            console.error(e);
            alert("Network Error");
        }
        setLoading(false);
    };

    /* =====================================================
       RENDER: RECOVERY RED SCREEN (Preserved & Polished)
    ===================================================== */
    if (recoveryToken) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-6 bg-red-950/30 border-[6px] border-red-600 rounded-lg relative overflow-hidden">
                <div className="absolute opacity-20 pointer-events-none animate-pulse">
                    <ShieldAlert size={300} className="text-red-600" />
                </div>
                <div className="z-10 flex flex-col items-center w-full">
                    <div className="bg-red-900/50 p-4 rounded-full mb-4 border-2 border-red-500 shadow-[0_0_30px_rgba(220,38,38,0.5)]">
                        <ShieldAlert className="w-12 h-12 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-black text-red-500 tracking-tighter uppercase mb-1">PROTOCOL 6: RESET</h2>
                    <p className="text-xs font-bold text-red-200 bg-red-900/50 px-3 py-1 rounded-full mb-6 border border-red-500/50">IDENTITY DESTRUCTION IMMINENT</p>
                    <div className="w-full bg-black/50 p-4 rounded-md border-l-4 border-red-500 mb-6 font-mono text-xs">
                        <p className="text-red-400 opacity-70">TARGET: {username}</p>
                        <p className="text-red-500 break-all">{recoveryToken}</p>
                    </div>
                    <button onClick={handleFinalReset} className="w-full bg-red-600 hover:bg-red-500 text-white py-4 rounded font-bold tracking-widest uppercase shadow-lg border border-red-400">
                        ⚠ BURN IDENTITY
                    </button>
                    <button onClick={() => window.location.reload()} className="mt-4 text-xs font-bold text-red-400 hover:text-red-300 uppercase">ABORT</button>
                </div>
            </div>
        );
    }

    /* =====================================================
       RENDER: MAIN UI (Dark Terminal Theme)
    ===================================================== */
    return (
        <div className="p-0 h-full flex flex-col bg-slate-900 text-slate-100 font-sans overflow-hidden relative">

            {/* Header / Top Bar */}
            <div className="p-6 pb-2 z-10">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-blue-400 tracking-wide flex items-center">
                            <Lock className="w-5 h-5 mr-2" /> ZK-AUTH <span className="text-xs ml-2 bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">v2.0</span>
                        </h2>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Zero Knowledge Protocol</p>
                    </div>
                    {/* Status Dot */}
                    <div className={`w-3 h-3 rounded-full shadow-[0_0_10px] ${status.includes('❌') ? 'bg-red-500 shadow-red-500' : 'bg-emerald-400 shadow-emerald-400'} animate-pulse`} />
                </div>

                {/* Mode Switcher */}
                {mode !== 'recovery' && (
                    <div className="flex bg-slate-800 p-1 rounded-lg mb-4 border border-slate-700">
                        <button
                            onClick={() => setMode('login-zkp')}
                            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                                mode === 'login-zkp' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            Manual Input
                        </button>
                        <button
                            onClick={() => setMode('login-qr')}
                            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${
                                mode === 'login-qr' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                            }`}
                        >
                            QR Scanner
                        </button>
                    </div>
                )}
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 px-6 flex flex-col relative z-10">

                {/* 1. MANUAL MODE */}
                {mode === 'login-zkp' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="space-y-1">
                            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Identity Handle</label>
                            <input
                                type="text"
                                placeholder="Enter Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full p-3 bg-slate-800 border border-slate-700 rounded text-blue-100 placeholder-slate-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-mono text-sm"
                            />
                        </div>
                        <div className="flex space-x-3 pt-2">
                            <button onClick={handleRegister} disabled={loading} className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 py-3 rounded font-bold text-xs uppercase tracking-wider transition-colors">
                                Register
                            </button>
                            <button onClick={handleZKPLogin} disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded font-bold text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all">
                                Login
                            </button>
                        </div>
                    </div>
                )}

                {/* 2. QR SCAN MODE (THE COOL PART) */}
                {mode === 'login-qr' && (
                    <div className="flex flex-col items-center flex-1 justify-center animate-in zoom-in-95 duration-500">
                        {/* HUD Container */}
                        <div className="relative p-1 border border-blue-500/30 rounded-lg">
                            {/* Animated Corners */}
                            <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-blue-400"></div>
                            <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-blue-400"></div>
                            <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-blue-400"></div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-blue-400"></div>

                            {/* QR Code */}
                            <div className="bg-white p-2 rounded relative overflow-hidden">
                                {sessionId && (
                                    <QRCodeSVG value={JSON.stringify({ sessionId })} size={160} level="M" />
                                )}
                                {/* Moving Laser Scanline */}
                                <div className="absolute left-0 w-full h-1 bg-blue-500/50 shadow-[0_0_10px_#3b82f6] animate-scan pointer-events-none"></div>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col items-center space-y-2">
                            <p className="text-[10px] text-blue-400 uppercase tracking-[0.2em] animate-pulse">Waiting for Device...</p>
                            <button onClick={() => setMode('recovery')} className="text-[10px] text-slate-500 hover:text-red-400 flex items-center transition-colors">
                                <ShieldAlert className="w-3 h-3 mr-1" /> Lost Device?
                            </button>
                        </div>
                    </div>
                )}

                {/* 3. RECOVERY MODE INPUT */}
                {mode === 'recovery' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-8">
                        <div className="bg-orange-500/10 border-l-2 border-orange-500 p-3 mb-2">
                            <p className="text-[10px] text-orange-400 font-bold uppercase tracking-widest flex items-center">
                                <ShieldAlert className="w-3 h-3 mr-2" /> Emergency Override
                            </p>
                        </div>
                        <input
                            type="text"
                            placeholder="USERNAME"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full p-3 bg-slate-800 border border-slate-700 rounded text-slate-200 text-xs font-mono"
                        />
                        <input
                            type="text"
                            placeholder="000 000"
                            value={totpCode}
                            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="w-full p-3 bg-slate-800 border border-slate-700 rounded text-center text-2xl font-mono tracking-[0.5em] text-white focus:border-orange-500 focus:outline-none"
                        />
                        <button onClick={handleRecovery} disabled={loading || totpCode.length !== 6} className="w-full bg-orange-600 hover:bg-orange-500 text-white py-3 rounded font-bold text-xs uppercase tracking-widest shadow-lg">
                            Verify Code
                        </button>
                        <button onClick={() => setMode('login-qr')} className="w-full text-[10px] text-slate-500 hover:text-slate-300 flex justify-center items-center py-2 uppercase tracking-wider">
                            <ArrowLeft className="w-3 h-3 mr-1" /> Return
                        </button>
                    </div>
                )}
            </div>

            {/* FOOTER: TERMINAL LOGS */}
            <div className="p-3 bg-slate-950 border-t border-slate-800">
                <div className="flex items-center text-[10px] font-mono text-slate-400">
                    <span className="text-blue-500 mr-2">➜</span>
                    <span className={`${status.includes('❌') ? 'text-red-400' : status.includes('✅') ? 'text-emerald-400' : 'text-blue-300'} animate-pulse`}>
                        {status}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default LoginForm;