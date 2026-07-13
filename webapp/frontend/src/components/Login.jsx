import React, { useState } from 'react';
import { ShieldAlert, User, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('officer@kavach.gov.in');
  const [password, setPassword] = useState('kavach2026');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Authentication failed. Please check credentials.");
      }

      const data = await response.json();
      onLoginSuccess(data.token, data.user.email);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      <div className="max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3.5 bg-gradient-to-tr from-teal-600 to-teal-400 rounded-2xl shadow-xl shadow-teal-500/10 mb-4 animate-pulse">
            <ShieldAlert className="w-8 h-8 text-slate-950" />
          </div>
          <h1 className="text-2xl font-bold tracking-wider text-slate-100 uppercase font-mono">
            KAVACH LOGIN
          </h1>
          <p className="text-slate-500 text-xs mt-1 uppercase tracking-widest font-semibold">
            Security Officers Portal
          </p>
        </div>

        {/* Info Box */}
        <div className="mb-6 p-3.5 bg-slate-950/50 border border-slate-800/80 rounded-2xl text-[11px] text-slate-400 leading-relaxed">
          <span className="text-amber-500 font-bold font-mono">DEMO PROTOCOL ACTIVE:</span><br />
          Use credentials: <code className="text-teal-400 font-mono">officer@kavach.gov.in</code> / <code className="text-teal-400 font-mono">kavach2026</code>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username/Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase font-mono tracking-wider">
              Credentials ID / Email
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500 transition text-sm font-sans"
                placeholder="officer@kavach.gov.in"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase font-mono tracking-wider">
              Security Key / Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pl-10 pr-12 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500 transition text-sm font-sans tracking-wide"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-950/20 border border-red-900/50 text-red-400 rounded-xl text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
              <AlertCircle className="w-4.5 h-4.5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 disabled:from-teal-800 disabled:to-teal-900 text-white font-medium py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-teal-900/20 text-sm mt-8"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              "Access Platform"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
