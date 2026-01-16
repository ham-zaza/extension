import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, KeyRound } from 'lucide-react';
import { decryptPrivateKey } from '../utils/cryptoUtils.js';

const LockScreen = ({ onUnlock }) => {
    const [pin, setPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showChangePin, setShowChangePin] = useState(false);
    const [loginCount, setLoginCount] = useState(0);

    /* =========================================
       LOGIC (Unchanged)
    ========================================= */
    useEffect(() => {
        const checkLoginCount = async () => {
            const data = await chrome.storage.local.get(['loginCount']);
            const count = data.loginCount || 0;
            setLoginCount(count);
            if (count > 0 && count % 3 === 0) {
                setShowChangePin(true);
            }
        };
        checkLoginCount();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
            setError('PIN must be 6 digits');
            return;
        }

        setLoading(true);
        setError('');

        const data = await chrome.storage.local.get(['encryptedX', 'iv', 'salt']);
        if (!data.encryptedX) {
            setError('Vault empty. Please reset.');
            setLoading(false);
            return;
        }

        try {
            const xStr = await decryptPrivateKey({
                encrypted: data.encryptedX,
                iv: data.iv,
                salt: data.salt
            }, pin);
            const x = BigInt(xStr);
            setPin('');
            const newCount = loginCount + 1;
            await chrome.storage.local.set({ loginCount: newCount });
            setLoginCount(newCount);
            onUnlock(x);
        } catch (err) {
            setError('INCORRECT PIN');
        } finally {
            setLoading(false);
        }
    };

    /* =========================================
       RENDER: DARK TERMINAL UI
    ========================================= */
    return (
        <div className="h-full flex flex-col items-center justify-center p-6 text-slate-100 relative overflow-hidden">

            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>

            {/* Header Section */}
            <div className="text-center mb-8 relative z-10">
                <div className="bg-slate-800 p-4 rounded-full inline-block mb-4 border border-slate-700 shadow-[0_0_20px_rgba(59,130,246,0.15)] animate-pulse-slow">
                    <Lock className="h-10 w-10 text-blue-500" />
                </div>
                <h2 className="text-2xl font-black tracking-widest uppercase text-blue-100 mb-1">
                    VAULT LOCKED
                </h2>
                <p className="text-[10px] text-blue-400 font-mono tracking-wider uppercase">
                    Session Timeout • Re-Authentication Required
                </p>
            </div>

            {/* Form Section */}
            <form onSubmit={handleSubmit} className="w-full space-y-6 z-10">
                <div className="relative group">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block pl-1">
                        Security PIN
                    </label>

                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <KeyRound className="h-4 w-4 text-slate-500" />
                        </div>

                        <input
                            type={showPin ? 'text' : 'password'}
                            value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="w-full pl-10 pr-10 py-4 bg-slate-900 border-2 border-slate-800 rounded-lg
                                     text-center text-2xl font-mono tracking-[0.5em] text-blue-100
                                     focus:border-blue-500 focus:outline-none focus:shadow-[0_0_15px_rgba(59,130,246,0.2)]
                                     transition-all placeholder-slate-700"
                            placeholder="••••••"
                            required
                            autoFocus
                        />

                        <button
                            type="button"
                            onClick={() => setShowPin(!showPin)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-blue-400 transition-colors p-1"
                        >
                            {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                {/* Error Message */}
                <div className="h-6 text-center">
                    {error && (
                        <p className="text-xs font-bold text-red-400 bg-red-900/20 py-1 px-3 rounded inline-block border border-red-500/30 animate-bounce">
                            ⚠ {error}
                        </p>
                    )}
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading || pin.length !== 6}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600
                             disabled:opacity-50 disabled:cursor-not-allowed
                             text-white py-4 rounded-lg font-bold text-sm uppercase tracking-widest shadow-lg
                             transform transition-all active:scale-95 border-b-4 border-blue-900 flex justify-center items-center"
                >
                    {loading ? (
                        <>
                            <ShieldCheck className="animate-spin h-4 w-4 mr-2" />
                            DECRYPTING KEYS...
                        </>
                    ) : (
                        'UNLOCK TERMINAL'
                    )}
                </button>
            </form>

            {/* Footer Info */}
            <div className="mt-auto pt-6 text-center">
                <p className="text-[10px] text-slate-600 font-mono">
                    ID: {loginCount > 0 ? `SESSION-${loginCount.toString().padStart(4, '0')}` : 'INIT-SEQUENCE'}
                </p>
                {showChangePin && (
                    <p className="text-[9px] text-orange-400 mt-2 animate-pulse">
                        * Recommendation: Rotate PIN soon
                    </p>
                )}
            </div>
        </div>
    );
};

export default LockScreen;