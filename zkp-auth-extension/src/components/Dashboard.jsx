import React, { useEffect, useState } from 'react';
import { LogOut, ShieldCheck, Clock, FileText } from 'lucide-react';

const SESSION_DURATION_MS = 120000; // 2 minutes

const Dashboard = ({ username, sessionStart, onLogout, updateActivity }) => {
    const [timeLeft, setTimeLeft] = useState(0);

    // Session timer + auto logout
    useEffect(() => {
        const interval = setInterval(() => {
            const elapsed = Date.now() - sessionStart;
            const remaining = Math.max(0, SESSION_DURATION_MS - elapsed);
            setTimeLeft(Math.ceil(remaining / 1000));

            if (remaining <= 0) {
                onLogout();
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [sessionStart, onLogout]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div
            className="p-6 h-full bg-slate-50 flex flex-col"
            onClick={updateActivity}
        >
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Welcome Back,</h2>
                    <p className="text-blue-600 font-semibold text-lg">{username}</p>
                </div>
                <div className="bg-green-100 p-2 rounded-full">
                    <ShieldCheck className="w-6 h-6 text-green-600" />
                </div>
            </div>

            {/* Secure Content */}
            <div className="flex-1 space-y-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center space-x-3 mb-2">
                        <FileText className="w-5 h-5 text-slate-400" />
                        <h3 className="font-semibold text-slate-700">Protected Resource</h3>
                    </div>
                    <p className="text-sm text-slate-500">
                        Status: <span className="text-orange-500 font-medium">Confidential</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                        Last access: {new Date().toLocaleDateString()}
                    </p>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <p className="text-sm text-blue-800 font-medium text-center">
                        🔒 Authenticated using Zero-Knowledge Proof (Fiat–Shamir Chaum-Pedersen)
                    </p>
                </div>

                {/* Session Timer */}
                <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-slate-600">
                        <Clock className="w-5 h-5" />
                        <span className="text-sm font-medium">Session expires in</span>
                    </div>
                    <span className="font-mono text-orange-600 font-semibold">
            {formatTime(timeLeft)}
          </span>
                </div>
            </div>

            {/* Logout */}
            <button
                onClick={onLogout}
                className="mt-auto w-full flex items-center justify-center space-x-2 bg-slate-800 text-white py-3 rounded-lg hover:bg-slate-900 transition-colors"
            >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
            </button>
        </div>
    );
};

export default Dashboard;
