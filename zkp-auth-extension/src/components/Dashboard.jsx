import React, { useEffect, useState } from 'react';
import { LogOut, ShieldCheck, Clock, FileKey, Activity, Wifi, Fingerprint } from 'lucide-react';

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
            className="h-full bg-slate-900 text-slate-100 flex flex-col relative overflow-hidden font-sans"
            onClick={updateActivity}
        >
            {/* Background Grid Decoration */}
            <div className="absolute inset-0 opacity-5 pointer-events-none"
                 style={{backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
            </div>

            {/* Header Area */}
            <div className="p-6 pb-4 border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm z-10">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-1">Authenticated Subject</p>
                        <h2 className="text-xl font-black text-blue-400 tracking-wide flex items-center">
                            {username} <span className="ml-2 w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]"></span>
                        </h2>
                    </div>
                    <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700 shadow-inner">
                        <ShieldCheck className="w-6 h-6 text-emerald-500" />
                    </div>
                </div>

                {/* Live Connection Status */}
                <div className="mt-4 flex items-center justify-between bg-slate-800/50 p-3 rounded-lg border border-slate-700">

                    {/* The LIVE Graph */}
                    <div className="flex items-center space-x-3">
                        <div className="flex items-end h-4 space-x-[2px]">
                            {/* 5 Dynamic Bars with different delays */}
                            <div className="w-1 bg-blue-500 rounded-sm animate-wave" style={{animationDelay: '0ms'}}></div>
                            <div className="w-1 bg-blue-400 rounded-sm animate-wave" style={{animationDelay: '200ms'}}></div>
                            <div className="w-1 bg-blue-300 rounded-sm animate-wave" style={{animationDelay: '100ms'}}></div>
                            <div className="w-1 bg-blue-400 rounded-sm animate-wave" style={{animationDelay: '300ms'}}></div>
                            <div className="w-1 bg-blue-500 rounded-sm animate-wave" style={{animationDelay: '150ms'}}></div>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest leading-none">Net_Link</p>
                            <p className="text-[9px] text-emerald-400 font-mono leading-none mt-1">ACTIVE • 42ms</p>
                        </div>
                    </div>

                    {/* Encryption Badge */}
                    <div className="flex items-center space-x-2 bg-slate-900 px-2 py-1 rounded border border-slate-700">
                        <Wifi className="w-3 h-3 text-slate-500" />
                        <span className="text-[9px] font-mono text-slate-400">TLS 1.3</span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-6 space-y-4 overflow-y-auto z-10 custom-scrollbar">

                {/* ZK Proof Badge */}
                <div className="bg-gradient-to-r from-blue-900/40 to-slate-900 border border-blue-500/30 p-4 rounded-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                        <Fingerprint size={80} />
                    </div>
                    <h3 className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-2 flex items-center">
                        <Fingerprint className="w-3 h-3 mr-2" /> Proof Verified
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono leading-relaxed">
                        Identity confirmed via Zero-Knowledge Protocol (Fiat–Shamir).
                        Secret key <span className="text-emerald-500">($x$)</span> was never transmitted.
                    </p>
                </div>

                {/* Secure File Mockup */}
                <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-lg hover:border-slate-600 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                            <div className="bg-slate-700 p-2 rounded">
                                <FileKey className="w-5 h-5 text-orange-400" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-200">Classified Data</h3>
                                <p className="text-[10px] text-slate-500 font-mono">ID: {sessionStart}</p>
                            </div>
                        </div>
                        <span className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-1 rounded border border-orange-500/30 font-bold uppercase">
                            Top Secret
                        </span>
                    </div>
                    <div className="h-1 w-full bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-500 w-2/3 animate-pulse"></div>
                    </div>
                </div>

                {/* Session Countdown */}
                <div className="bg-slate-800/30 border border-slate-700 p-4 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Clock className="w-5 h-5 text-slate-400" />
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase">Auto-Purge</p>
                            <p className="text-[10px] text-slate-600">Session expires in</p>
                        </div>
                    </div>
                    <div className={`text-2xl font-mono font-bold tracking-widest ${timeLeft < 30 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>
                        {formatTime(timeLeft)}
                    </div>
                </div>
            </div>

            {/* Footer / Logout */}
            <div className="p-6 bg-slate-950/80 border-t border-slate-800 z-10">
                <button
                    onClick={onLogout}
                    className="w-full group bg-red-900/20 hover:bg-red-900/40 border border-red-900/50 hover:border-red-500 text-red-400 py-3 rounded-lg flex items-center justify-center space-x-2 transition-all duration-300 shadow-[0_0_10px_transparent] hover:shadow-[0_0_15px_rgba(220,38,38,0.2)]"
                >
                    <LogOut className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                    <span className="font-bold text-xs uppercase tracking-widest">Terminate Session</span>
                </button>
            </div>
        </div>
    );
};

export default Dashboard;