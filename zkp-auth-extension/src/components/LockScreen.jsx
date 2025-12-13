import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { decryptPrivateKey } from '../utils/cryptoUtils.js'; // ✅ Fixed Import

const LockScreen = ({ onUnlock }) => {
    const [pin, setPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showChangePin, setShowChangePin] = useState(false);
    const [loginCount, setLoginCount] = useState(0);

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
            setError('Enter 6-digit PIN');
            return;
        }

        setLoading(true);
        setError('');

        const data = await chrome.storage.local.get(['encryptedX', 'iv', 'salt']);
        if (!data.encryptedX) {
            setError('No account found. Set up first.');
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
            setError('Wrong PIN');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="text-center">
                <Lock className="mx-auto h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold">Locked</h2>
                <p className="text-gray-600 dark:text-gray-400">Enter your PIN to unlock</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-2">PIN</label>
                    <div className="relative">
                        <input
                            type={showPin ? 'text' : 'password'}
                            value={pin}
                            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800"
                            placeholder="123456"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPin(!showPin)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                            {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="text-red-500 text-sm text-center">{error}</div>
                )}

                <button
                    type="submit"
                    disabled={loading || pin.length !== 6}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md transition-colors"
                >
                    {loading ? 'Unlocking...' : 'Unlock'}
                </button>
            </form>
        </div>
    );
};

export default LockScreen;