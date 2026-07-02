import React, { useState, useEffect } from 'react';
import { fetchCodeforcesData } from './api/codeforces';
import type { CFUserInfo, CFRatingChange, CFSubmission } from './api/codeforces';
import { Dashboard } from './components/Dashboard';
import { Analysis } from './components/Analysis';
import { Predictions } from './components/Predictions';
import { Coach } from './components/Coach';
import { Social } from './components/Social';
import { AICoach } from './components/AICoach';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TabSkeleton } from './components/TabSkeleton';
import { Search, Flame, HelpCircle, AlertCircle, RefreshCw, BarChart2, ShieldAlert, Award, Compass, Zap, Trophy, Menu, X } from 'lucide-react';
import confetti from 'canvas-confetti';

type TabType = 'dashboard' | 'analysis' | 'predictions' | 'coach' | 'social' | 'aicoach';

// AI chat message type (shared with AICoach component)
export interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: Date;
}

function App() {
  const [handle, setHandle] = useState(() => localStorage.getItem('cf_handle') || '');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [tabLoading, setTabLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Codeforces profile data
  const [userInfo, setUserInfo] = useState<CFUserInfo | null>(null);
  const [ratingHistory, setRatingHistory] = useState<CFRatingChange[]>([]);
  const [submissions, setSubmissions] = useState<CFSubmission[]>([]);
  const [isSimulated, setIsSimulated] = useState(false);

  // AI chat state lifted here so it persists across tab switches
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const loadData = async (targetHandle: string) => {
    if (!targetHandle.trim()) return;
    setLoading(true);
    setError('');
    setIsSimulated(false);

    try {
      const data = await fetchCodeforcesData(targetHandle);

      // Use the reliable isMockFallback flag from the API layer
      setIsSimulated(data.isMockFallback);

      setUserInfo(data.userInfo);
      setRatingHistory(data.ratingHistory);
      setSubmissions(data.submissions);

      localStorage.setItem('cf_handle', targetHandle);
      setHandle(targetHandle);

      // Reset chat when a new profile is loaded
      setChatMessages([]);

      // Trigger premium celebration confetti!
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      setError(err.message || 'Unable to fetch Codeforces data. Please try another handle.');
    } finally {
      setLoading(false);
    }
  };

  // Run on mount if handle is already saved
  useEffect(() => {
    if (handle) {
      loadData(handle);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      loadData(searchInput.trim());
    }
  };

  const handleQuickLoad = (quickHandle: string) => {
    setSearchInput(quickHandle);
    loadData(quickHandle);
  };

  const handleLogout = () => {
    localStorage.removeItem('cf_handle');
    setHandle('');
    setUserInfo(null);
    setRatingHistory([]);
    setSubmissions([]);
    setSearchInput('');
    setIsSimulated(false);
    setChatMessages([]);
  };

  const handleTabChange = (tab: TabType) => {
    if (tab === activeTab) return;
    setTabLoading(true);
    setActiveTab(tab);
    // Brief skeleton flash for perceived snappiness
    setTimeout(() => setTabLoading(false), 120);
  };

  const navigationTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
    { id: 'coach', label: 'Roadmap', icon: Zap },
    { id: 'aicoach', label: 'Coach', icon: Award },
    { id: 'analysis', label: 'Analysis', icon: ShieldAlert },
    { id: 'predictions', label: 'Predictions', icon: Compass },
    { id: 'social', label: 'Social Compare', icon: Flame },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#030712] text-slate-100 font-sans selection:bg-cyan-500/30 selection:text-cyan-200" style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>

      {/* State: A. Loading Overlay */}
      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center py-24 space-y-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
              <Trophy size={28} className="text-cyan-400 animate-float" />
            </div>
            <div className="absolute inset-0 rounded-2xl border-2 border-cyan-500/40 animate-spin" style={{animationDuration:'3s'}} />
          </div>
          <div className="text-center space-y-2">
            <p className="font-bold text-white text-lg">Fetching Codeforces profile...</p>
            <p className="text-xs text-slate-500">Querying user.info, user.rating, and user.status APIs</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <span className="loading-dot" />
              <span className="loading-dot" />
              <span className="loading-dot" />
            </div>
          </div>
        </div>
      )}

      {/* State: B. Onboarding Page (No handle entered yet) */}
      {!loading && !userInfo && (
        <>
          <header className="sticky top-0 z-40 w-full bg-[#060b13] border-b border-[#121e35] shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 cursor-pointer" onClick={handleLogout}>
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
                  <Trophy size={18} className="text-white" />
                </div>
                <div>
                  <span className="font-extrabold text-white text-base tracking-tight block">CONTEST COACH</span>
                  <span className="text-[10px] text-cyan-400 block tracking-wider uppercase font-semibold">Competitive Assistant</span>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-12 md:mt-20 flex-1 flex flex-col justify-start">
            <div className="max-w-xl mx-auto w-full space-y-8 text-center relative">

              {/* Ambient glow orbs */}
              <div className="hero-glow hero-glow-cyan w-96 h-96 top-[-120px] left-[-80px] opacity-60" />
              <div className="hero-glow hero-glow-blue w-72 h-72 bottom-0 right-[-60px] opacity-50" />

              <div className="space-y-5 relative z-10">
                <div className="animate-fade-in-up stagger-1">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-2xl shadow-cyan-500/30 animate-float">
                    <Trophy size={36} className="text-white" />
                  </div>
                </div>
                <div className="animate-fade-in-up stagger-2">
                  <span className="inline-block text-[10px] text-cyan-400 font-extrabold tracking-widest uppercase border border-cyan-500/20 bg-cyan-500/5 px-3 py-1 rounded-full mb-3">
                    Competitive Programming Intelligence
                  </span>
                  <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-[1.08]">
                    <span className="text-white">Master </span>
                    <span className="shimmer-text">Competitive</span>
                    <br />
                    <span className="text-white">Programming</span>
                  </h1>
                </div>
                <p className="text-sm md:text-base text-slate-400 max-w-md mx-auto leading-relaxed animate-fade-in-up stagger-3">
                  Connect your Codeforces handle to unlock real-time progress charts, topic weakness detection, weekly roadmaps, and AI coaching.
                </p>
              </div>

              {/* Input Form */}
              <div className="animate-fade-in-up stagger-3 relative z-10">
                <form onSubmit={handleSearchSubmit} className="glass-card p-6 rounded-2xl space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Enter Codeforces Handle..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl glass-input text-base"
                    />
                    <Search className="absolute left-4 top-4 text-slate-500" size={18} />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 flex items-center justify-center gap-2.5 text-sm cursor-pointer active:scale-[0.98]"
                  >
                    Launch Dashboard <RefreshCw size={14} className="animate-spin-slow" />
                  </button>

                  {error && (
                    <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-xs font-semibold animate-pop-in">
                      <AlertCircle size={14} />
                      <span>{error}</span>
                    </div>
                  )}
                </form>
              </div>

              {/* Quick Demo Options */}
              <div className="space-y-3 animate-fade-in-up stagger-4 relative z-10">
                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Or click to load standard accounts</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[{handle:'tourist', label:'👑 Tourist'}, {handle:'Benq', label:'🚀 Benq'}, {handle:'demo', label:'✨ Demo Profile', highlight: true}].map(q => (
                    <button
                      key={q.handle}
                      onClick={() => handleQuickLoad(q.handle)}
                      className={`text-xs font-semibold px-4 py-2 rounded-xl border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                        q.highlight
                          ? 'bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-400 font-bold border-cyan-500/20'
                          : 'bg-[#080e1a] hover:bg-[#0b1424] text-slate-300 border-[#121e35] hover:border-cyan-500/20'
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </main>
        </>
      )}

      {/* State: C. Logged In Application Frame (Responsive Sidebar / Drawer Layout) */}
      {!loading && userInfo && (
        <div className="flex flex-col md:flex-row flex-1 min-h-screen relative">

          {/* 1. Mobile Top Header (only visible on mobile/tablet) */}
          <header className="flex md:hidden sticky top-0 z-45 w-full bg-[#060b13]/90 border-b border-[#121e35] h-14 items-center justify-between px-4 backdrop-blur-md">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900 transition-colors"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                <Trophy size={14} className="text-white" />
              </div>
              <span className="font-extrabold text-white text-sm tracking-tight">Contest Coach</span>
            </div>
            {userInfo.avatar ? (
              <img
                src={userInfo.avatar}
                alt={userInfo.handle}
                className="w-7 h-7 rounded-full border border-cyan-500/30 object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-800" />
            )}
          </header>

          {/* 2. Mobile Drawer Menu Overlay */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 md:hidden flex">
              {/* Backdrop */}
              <div
                onClick={() => setMobileMenuOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-xs"
              />
              {/* Drawer Container */}
              <div className="relative w-72 bg-[#060b13] border-r border-[#121e35] h-full flex flex-col p-5 space-y-5 animate-slide-in-left shadow-2xl">
                {/* Close Button */}
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900 transition-colors"
                >
                  <X size={18} />
                </button>

                {/* Logo */}
                <div className="flex items-center gap-3 pb-1">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                    <Trophy size={18} className="text-white" />
                  </div>
                  <div>
                    <span className="font-extrabold text-white text-sm tracking-tight block">Contest Coach</span>
                    <span className="text-[10px] text-cyan-400/70 block tracking-wider font-semibold">Codeforces intelligence</span>
                  </div>
                </div>

                {/* Navigation Menu */}
                <nav className="flex-1 space-y-0.5">
                  {navigationTabs.map((tab, idx) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          handleTabChange(tab.id as TabType);
                          setMobileMenuOpen(false);
                        }}
                        style={{ animationDelay: `${idx * 0.03}s` }}
                        className={`w-full flex items-center gap-3 py-2.5 px-3.5 text-sm font-semibold rounded-xl transition-all duration-200 whitespace-nowrap cursor-pointer group relative ${
                          isActive
                            ? 'bg-[#0f1d36] text-cyan-400 shadow-[inset_3px_0_0_#06b6d4]'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-[#0a1220]'
                        }`}
                      >
                        <Icon size={17} className={`transition-all duration-200 ${ isActive ? 'text-cyan-400' : 'group-hover:text-slate-300' }`} />
                        {tab.label}
                        {isActive && (
                          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </nav>

                {/* Status Box */}
                <div className="border border-emerald-900/40 bg-emerald-950/20 p-3.5 rounded-xl">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-[10px] uppercase font-black tracking-wider text-slate-500">Sync status</span>
                  </div>
                  <span className="text-xs text-emerald-400 font-medium block">
                    PostgreSQL Ingested
                  </span>
                </div>

                {/* User Detail & Logout */}
                <div className="border-t border-[#121e35] pt-4 flex items-center gap-3">
                  {userInfo.avatar && (
                    <img
                      src={userInfo.avatar}
                      alt={userInfo.handle}
                      className="w-8 h-8 rounded-full border-2 border-cyan-500/30 bg-slate-900 object-cover"
                    />
                  )}
                  <div className="truncate flex-1">
                    <span className="text-[9px] text-slate-500 block">Logged in as</span>
                    <span className="text-xs font-bold text-cyan-400 block truncate">{userInfo.handle}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-[10px] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-2.5 py-1.5 rounded-lg transition-all"
                  >
                    Exit
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. Left Sidebar (desktop only, hidden on mobile/tablet) */}
          <aside className="hidden md:flex md:w-64 bg-[#060b13] border-r border-[#121e35] flex-col p-5 space-y-5 animate-slide-in-left">

            {/* Logo */}
            <div className="flex items-center gap-3 pb-1">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                  <Trophy size={20} className="text-white" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#060b13] animate-pulse" />
              </div>
              <div>
                <span className="font-extrabold text-white text-base tracking-tight block">Contest Coach</span>
                <span className="text-[10px] text-cyan-400/70 block tracking-wider font-semibold">Codeforces intelligence</span>
              </div>
            </div>

            {/* Navigation Menu */}
            <nav className="flex-1 space-y-0.5">
              {navigationTabs.map((tab, idx) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id as TabType)}
                    style={{ animationDelay: `${idx * 0.05}s` }}
                    className={`w-full flex items-center gap-3 py-2.5 px-3.5 text-sm font-semibold rounded-xl transition-all duration-200 whitespace-nowrap cursor-pointer animate-slide-in-left group relative overflow-hidden ${
                      isActive
                        ? 'bg-[#0f1d36] text-cyan-400 shadow-[inset_3px_0_0_#06b6d4]'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-[#0a1220]'
                    }`}
                  >
                    <Icon size={17} className={`transition-all duration-200 ${ isActive ? 'text-cyan-400' : 'group-hover:text-slate-300' }`} />
                    {tab.label}
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Stack box */}
            <div className="border border-slate-900/80 bg-[#080e1a] p-3.5 rounded-xl space-y-2">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 block">STACK</span>
              <div className="flex items-center gap-3">
                {/* React Logo */}
                <svg className="w-5 h-5 text-sky-400 opacity-80 hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <ellipse rx="10" ry="4.5" cx="12" cy="12" transform="rotate(0 12 12)" />
                  <ellipse rx="10" ry="4.5" cx="12" cy="12" transform="rotate(60 12 12)" />
                  <ellipse rx="10" ry="4.5" cx="12" cy="12" transform="rotate(120 12 12)" />
                  <circle cx="12" cy="12" r="2" fill="currentColor" />
                </svg>
                {/* TypeScript Logo */}
                <div className="w-5 h-5 rounded bg-[#3178c6] text-white font-bold text-[10px] flex items-center justify-center select-none cursor-default" title="TypeScript">TS</div>
                {/* JavaScript Logo */}
                <div className="w-5 h-5 rounded bg-[#f7df1e] text-black font-extrabold text-[10px] flex items-center justify-center select-none cursor-default" title="JavaScript">JS</div>
                {/* Tailwind Logo */}
                <svg className="w-5 h-5 text-[#38bdf8]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 .587l3.668 3.668c2.148 2.148 2.148 5.632 0 7.78l-3.668 3.668-3.668-3.668c-2.148-2.148-2.148-5.632 0-7.78L12 .587z" opacity="0.5" />
                  <path d="M12 5.587l3.668 3.668c2.148 2.148 2.148 5.632 0 7.78l-3.668 3.668-3.668-3.668c-2.148-2.148-2.148-5.632 0-7.78L12 5.587z" />
                </svg>
              </div>
            </div>

            {/* Sync status box */}
            <div className="border border-emerald-900/40 bg-emerald-950/20 p-3.5 rounded-xl">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] uppercase font-black tracking-wider text-slate-500">Sync status</span>
              </div>
              <span className="text-xs text-emerald-400 font-medium leading-normal block">
                PostgreSQL ingestion ready
              </span>
            </div>

            {/* Log out / active handle with avatar */}
            <div className="border-t border-[#121e35] pt-4 flex items-center gap-3">
              {userInfo.avatar && (
                <div className="relative">
                  <img
                    src={userInfo.avatar}
                    alt={userInfo.handle}
                    className="w-8 h-8 rounded-full border-2 border-cyan-500/30 bg-slate-900 object-cover"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#060b13]" />
                </div>
              )}
              <div className="truncate flex-1">
                <span className="text-[10px] text-slate-500 block">Logged in as</span>
                <span className="text-xs font-bold text-cyan-400 block truncate">{userInfo.handle}</span>
              </div>
              <button
                onClick={handleLogout}
                className="text-[10px] font-bold bg-rose-500/8 hover:bg-rose-500/15 text-rose-400 hover:text-rose-300 border border-rose-500/15 hover:border-rose-500/30 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
              >
                Exit
              </button>
            </div>

          </aside>

          {/* Right Main Content */}
          <main className="flex-1 bg-[#030712] p-4 sm:p-6 lg:p-8 overflow-y-auto flex flex-col space-y-6">

            {/* Warning: Simulated data fallback */}
            {isSimulated && (
              <div className="flex items-center justify-between bg-cyan-950/15 border border-cyan-500/20 text-cyan-200 px-4 py-3 rounded-xl text-xs">
                <div className="flex items-center gap-2 font-medium">
                  <HelpCircle size={14} className="text-cyan-400" />
                  <span>Showing simulated profile data (Demo Mode / API Fallback). Try search again for live stats.</span>
                </div>
              </div>
            )}

            {/* Top Command Center Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-fade-in-up">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[10px] text-cyan-400 font-extrabold tracking-widest uppercase mb-2">
                  <span className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
                  Phase 1 MVP Dashboard
                </span>
                <h1 className="text-3xl font-black text-white tracking-tight leading-none">
                  Contest Coach <span className="shimmer-text">command center</span>
                </h1>
              </div>

              {/* Header Search Bar */}
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-xs">
                <div className="relative w-full">
                  <input
                    type="text"
                    placeholder="Search handle..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="w-full bg-[#080f1e] border border-[#1b2b48] pl-9 pr-3 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 transition-all"
                  />
                  <Search className="absolute left-3 top-2.5 text-slate-500" size={13} />
                </div>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 active:scale-95"
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                  Sync
                </button>
              </form>
            </div>

            {/* Tab Panel Render */}
            <div className="flex-1 min-h-[400px]">
              {tabLoading ? (
                <TabSkeleton />
              ) : (
                <ErrorBoundary key={activeTab}>
                  {activeTab === 'dashboard' && (
                    <div className="animate-fade-in-up">
                      <Dashboard
                        userInfo={userInfo}
                        ratingHistory={ratingHistory}
                        submissions={submissions}
                        onUserInfoUpdate={setUserInfo}
                      />
                    </div>
                  )}
                  {activeTab === 'analysis' && (
                    <div className="animate-fade-in-up">
                      <Analysis
                        userInfo={userInfo}
                        ratingHistory={ratingHistory}
                        submissions={submissions}
                      />
                    </div>
                  )}
                  {activeTab === 'predictions' && (
                    <div className="animate-fade-in-up">
                      <Predictions
                        userInfo={userInfo}
                        ratingHistory={ratingHistory}
                      />
                    </div>
                  )}
                  {activeTab === 'coach' && (
                    <div className="animate-fade-in-up">
                      <Coach
                        userInfo={userInfo}
                        submissions={submissions}
                        onNavigate={(tab) => handleTabChange(tab as TabType)}
                      />
                    </div>
                  )}
                  {activeTab === 'social' && (
                    <div className="animate-fade-in-up">
                      <Social
                        primaryUser={userInfo}
                        primaryRatingHistory={ratingHistory}
                        primarySubmissions={submissions}
                      />
                    </div>
                  )}
                  {activeTab === 'aicoach' && (
                    <div className="animate-fade-in-up">
                      <AICoach
                        userInfo={userInfo}
                        ratingHistory={ratingHistory}
                        submissions={submissions}
                        chatMessages={chatMessages}
                        onMessagesChange={setChatMessages}
                      />
                    </div>
                  )}
                </ErrorBoundary>
              )}
            </div>

          </main>

        </div>
      )}

      {/* Footer (only on onboarding page) */}
      {!userInfo && (
        <footer className="mt-12 border-t border-slate-900/60 py-6 text-center text-xs text-slate-500 max-w-7xl mx-auto w-full px-4">
          <p>© 2026 Contest Coach Frontend Dashboard. Powered by public Codeforces REST endpoints.</p>
        </footer>
      )}
    </div>
  );
}

export default App;
