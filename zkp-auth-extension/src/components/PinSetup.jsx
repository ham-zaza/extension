import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { deriveKeyFromPIN, encryptPrivateKey } from '../utils/cryptoUtils.js';
import modExp from '../utils/modExp.js'; // ✅ Fixed Import
import { ZKP_PARAMS } from '../config/zkpParams.js'; // ✅ Fixed Import

const PinSetup = ({ onPinSet }) => {
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [showPin, setShowPin] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
            setError('PIN must be exactly 6 digits');
            return;
        }
        if (pin !== confirmPin) {
            setError('PINs do not match');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Generate random secret x
            const array = new Uint8Array(32);
            crypto.getRandomValues(array);
            const x = BigInt('0x' + Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')) % ZKP_PARAMS.q;

            // Derive key and encrypt
            const { aesKey, salt } = await deriveKeyFromPIN(pin);
            const encryptedData = await encryptPrivateKey(x.toString(), aesKey, salt);

            await chrome.storage.local.set({
                encryptedX: encryptedData.encrypted,
                iv: encryptedData.iv,
                salt: encryptedData.salt,
                pinSet: true
            });

            onPinSet(x);
        } catch (err) {
            console.error(err);
            setError('Failed to set up PIN. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="text-center">
                <Lock className="mx-auto h-12 w-12 text-blue-500 mb-4" />
                <h2 className="text-2xl font-bold">Set Up Your PIN</h2>
                <p className="text-gray-600 dark:text-gray-400">Create a 6-digit PIN to secure your account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-2">Enter PIN</label>
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

                <div>
                    <label className="block text-sm font-medium mb-2">Confirm PIN</label>
                    <div className="relative">
                        <input
                            type={showConfirm ? 'text' : 'password'}
                            value={confirmPin}
                            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800"
                            placeholder="123456"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirm(!showConfirm)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                            {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="text-red-500 text-sm text-center">{error}</div>
                )}

                <button
                    type="submit"
                    disabled={loading || pin.length !== 6 || confirmPin.length !== 6}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md transition-colors"
                >
                    {loading ? 'Setting up...' : 'Set PIN'}
                </button>
            </form>
        </div>
    );
};

export default PinSetup;