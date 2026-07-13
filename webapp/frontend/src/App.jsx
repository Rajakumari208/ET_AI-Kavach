import React, { useState, useEffect } from 'react';
import { Shield, Eye, Map, ShieldAlert, Award, LogOut } from 'lucide-react';
import GuardianTab from './components/GuardianTab';
import LensTab from './components/LensTab';
import MapTab from './components/MapTab';
import Login from './components/Login';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('kavach_token'));
  const [userEmail, setUserEmail] = useState(localStorage.getItem('kavach_user_email'));
  const [activeTab, setActiveTab] = useState('guardian');

  const handleLoginSuccess = (newToken, email) => {
    localStorage.setItem('kavach_token', newToken);
    localStorage.setItem('kavach_user_email', email);
    setToken(newToken);
    setUserEmail(email);
  };

  const handleLogout = () => {
    localStorage.removeItem('kavach_token');
    localStorage.removeItem('kavach_user_email');
    setToken(null);
    setUserEmail(null);
  };

  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-slate-900">
      {/* Header Banner */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-teal-600 to-teal-400 rounded-xl shadow-lg shadow-teal-500/20">
              <ShieldAlert className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-slate-200 to-amber-400 font-mono">
                  KAVACH
                </span>
                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                  PROTOTYPE
                </span>
              </div>
              <p className="text-slate-500 text-xs font-semibold tracking-wide">
                DIGITAL PUBLIC SAFETY INTELLIGENCE PLATFORM
              </p>
            </div>
          </div>

          {/* Navigation & User Profile */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <nav className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800/80">
              <button
                onClick={() => setActiveTab('guardian')}
                className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  activeTab === 'guardian'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <Shield className="w-4 h-4" />
                Guardian
              </button>
              <button
                onClick={() => setActiveTab('lens')}
                className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  activeTab === 'lens'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <Eye className="w-4 h-4" />
                Lens
              </button>
              <button
                onClick={() => setActiveTab('map')}
                className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                  activeTab === 'map'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                <Map className="w-4 h-4" />
                Incident Map
              </button>
            </nav>

            {/* Logout & Profile section */}
            <div className="flex items-center gap-3 pl-0 sm:pl-4 border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex flex-col items-start sm:items-end">
                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wide">Security Officer</span>
                <span className="text-[10px] text-slate-500 font-mono">{userEmail}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 bg-slate-950 hover:bg-red-950/20 hover:border-red-900/40 text-slate-400 hover:text-red-400 border border-slate-800 rounded-xl transition"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="transition-all duration-300">
          {activeTab === 'guardian' && <GuardianTab />}
          {activeTab === 'lens' && <LensTab />}
          {activeTab === 'map' && <MapTab />}
        </div>
      </main>

      {/* Footer Banner */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 mt-12 text-slate-600 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Kavach — Hackathon Smart Public Safety System Submission</span>
          </div>
          <div className="flex gap-6 font-semibold">
            <span className="hover:text-slate-400 transition">Guardian Classifier (NLP)</span>
            <span className="hover:text-slate-400 transition">Lens Heuristics (CV)</span>
            <span className="hover:text-slate-400 transition">Hotspot Incident Mapping (GIS)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
