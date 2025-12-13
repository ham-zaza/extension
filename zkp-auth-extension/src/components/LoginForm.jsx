import React, { useState } from 'react';
import { User, Smartphone, QrCode } from 'lucide-react';
import modExp from '../utils/modExp.js'; // ✅ Fixed Import
import { ZKP_PARAMS } from '../config/zkpParams.js'; // ✅ Fixed Import

const LoginForm = ({ secretX, onLogin, updateActivity }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState(''); // Kept for UI consistency, though not used in ZKP
    const [authMethod, setAuthMethod] = useState('zkp');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    const handleRegister = async () => {
        if (!username.trim() || !secretX) {
            setStatus('Enter username and unlock first');
            return;
        }

        setLoading(true);
        updateActivity();

        // 1. Calculate Public Key (Y = g^x, Z = h^x)
        const y = modExp(ZKP_PARAMS.g, secretX, ZKP_PARAMS.p);
        const z = modExp(ZKP_PARAMS.h, secretX, ZKP_PARAMS.p);

        try {
            const res = await fetch('http://localhost:3000/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    publicKeyY: y.toString(),
                    publicKeyZ: z.toString()
                })
            });

            if (res.ok) {
                setStatus('✅ Registered!');
            } else {
                const err = await res.json();
                setStatus(`❌ ${err.message || 'Registration failed'}`);
            }
        } catch (e) {
            setStatus(`❌ Failed to fetch: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        if (!username.trim() || !secretX) {
            setStatus('Enter username and unlock first');
            return;
        }

        setLoading(true);
        updateActivity();
        setStatus('🔄 Attempting login...');

        if (authMethod === 'mobile') {
            setTimeout(() => {
                onLogin(username);
                setLoading(false);
            }, 2000);
            return;
        }

        // ZKP Login
        let successCount = 0;
        const totalAttempts = 5; // Reduced attempts for speed

        for (let attempt = 1; attempt <= totalAttempts; attempt++) {
            try {
                const y = modExp(ZKP_PARAMS.g, secretX, ZKP_PARAMS.p);
                const z = modExp(ZKP_PARAMS.h, secretX, ZKP_PARAMS.p);

                // 1. Random k
                const array = new Uint8Array(32);
                crypto.getRandomValues(array);
                const k = BigInt('0x' + Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')) % ZKP_PARAMS.q;

                // 2. Commitments (a=g^k, b=h^k)
                const a = modExp(ZKP_PARAMS.g, k, ZKP_PARAMS.p);
                const b = modExp(ZKP_PARAMS.h, k, ZKP_PARAMS.p);

                // 3. Fiat-Shamir Challenge
                // IMPORTANT: Must match Backend verifier order EXACTLY
                const domain = chrome.runtime.getURL('');
                const timestamp = Math.floor(Date.now() / 1000);

                const encoder = new TextEncoder();
                const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(
                    ZKP_PARAMS.g.toString() +
                    ZKP_PARAMS.h.toString() +
                    y.toString() +
                    z.toString() +
                    a.toString() +
                    b.toString() +
                    domain +
                    timestamp.toString()
                ));
                const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
                const c = BigInt('0x' + hashHex) % ZKP_PARAMS.q;

                // 4. Response s = k + c * x
                const s = (k + c * secretX) % ZKP_PARAMS.q;

                const res = await fetch('http://localhost:3000/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username,
                        a: a.toString(),
                        b: b.toString(),
                        s: s.toString(),
                        domain,
                        timestamp
                    })
                });

                if (res.ok) {
                    successCount++;
                    setStatus('✅ Login successful!');
                    onLogin(username);
                    setLoading(false);
                    return; // Exit on success
                } else {
                    const err = await res.json();
                    console.log(`❌ Login failed: ${err.error}`);
                }
            } catch (e) {
                console.log(`💥 Error: ${e.message}`);
            }
        }

        setStatus('❌ Login failed');
        setLoading(false);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="text-center">
                <User className="mx-auto h-12 w-12 text-blue-500 mb-4" />
                <h2 className="text-2xl font-bold">Login</h2>
                <p className="text-gray-600 dark:text-gray-400">Enter your credentials</p>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-2">Username</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800"
                        placeholder="Enter username"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Password (Optional)</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800"
                        placeholder="Not sent to server"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Auth Method</label>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => setAuthMethod('zkp')}
                            className={`flex-1 py-2 rounded ${authMethod === 'zkp' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-black'}`}
                        >
                            ZKP (Instant)
                        </button>
                        <button
                            onClick={() => setAuthMethod('mobile')}
                            className={`flex-1 py-2 rounded ${authMethod === 'mobile' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-black'}`}
                        >
                            Mobile (Biometric)
                        </button>
                    </div>
                </div>

                {authMethod === 'mobile' && (
                    <div className="text-center">
                        <QrCode className="mx-auto h-24 w-24 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">Scan QR with Mobile App</p>
                    </div>
                )}

                {status && (
                    <div className={`text-sm text-center font-bold ${status.includes('✅') ? 'text-green-500' : 'text-red-500'}`}>
                        {status}
                    </div>
                )}

                <div className="flex space-x-2">
                    <button
                        onClick={handleRegister}
                        disabled={loading}
                        className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white py-2 px-4 rounded-md"
                    >
                        Register
                    </button>
                    <button
                        onClick={handleLogin}
                        disabled={loading}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-2 px-4 rounded-md"
                    >
                        {loading ? 'Processing...' : 'Login'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginForm;