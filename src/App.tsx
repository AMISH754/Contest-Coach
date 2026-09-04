import React, { useState, useEffect, useRef } from 'react';
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
import {
  Search, Flame, AlertCircle, BarChart2,
  Zap, HelpCircle, X, ExternalLink,
  Bell, Activity, Clock, BookOpen, Users, Sparkles, LogOut
} from 'lucide-react';

export type TabType = 'dashboard' | 'analysis' | 'predictions' | 'coach' | 'social' | 'aicoach';

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

  // Dialog & popover states
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRatingBounds, setShowRatingBounds] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [apiHealth, setApiHealth] = useState<'checking' | 'online' | 'degraded'>('checking');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global Ctrl+K / Cmd+K shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Check API health for status modal
  useEffect(() => {
    fetch('http://localhost:5000/health')
      .then(res => res.json())
      .then(data => setApiHealth(data.status === 'OK' ? 'online' : 'degraded'))
      .catch(() => setApiHealth('degraded'));
  }, []);

  // Codeforces profile data
  const [userInfo, setUserInfo] = useState<CFUserInfo | null>(null);
  const [ratingHistory, setRatingHistory] = useState<CFRatingChange[]>([]);
  const [submissions, setSubmissions] = useState<CFSubmission[]>([]);
  const [isSimulated, setIsSimulated] = useState(false);

  // AI chat state persisted across tab switches
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const loadData = async (targetHandle: string, force: boolean = false) => {
    if (!targetHandle.trim()) return;
    setLoading(true);
    setError('');
    setIsSimulated(false);

    try {
      const data = await fetchCodeforcesData(targetHandle, force);
      setIsSimulated(data.isMockFallback);
      setUserInfo(data.userInfo);
      setRatingHistory(data.ratingHistory);
      setSubmissions(data.submissions);

      localStorage.setItem('cf_handle', targetHandle);
      setHandle(targetHandle);
      setChatMessages([]);
    } catch (err: any) {
      setError(err.message || 'Unable to fetch Codeforces data. Please try another handle.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (handle) {
      loadData(handle);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = searchInput.trim() || handle;
    if (target) {
      loadData(target, true);
      setSearchInput('');
    }
  };

  const handleQuickLoad = (quickHandle: string) => {
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
    setError('');
  };

  const handleTabChange = (tab: TabType) => {
    if (tab === activeTab) return;
    setTabLoading(true);
    setActiveTab(tab);
    setTimeout(() => setTabLoading(false), 80);
  };

  const navigationTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
    { id: 'analysis', label: 'Analysis', icon: Activity },
    { id: 'predictions', label: 'Predictions', icon: Clock },
    { id: 'coach', label: 'Practice', icon: BookOpen },
    { id: 'social', label: 'Social', icon: Users },
    { id: 'aicoach', label: 'AI Coach', icon: Sparkles },
  ];

  // Calculate short rank label and rating diff
  const rankShort = userInfo?.rank ? userInfo.rank.split(' ').map(w => w[0].toUpperCase()).join('') : 'CM';
  const ratingDelta = ratingHistory.length >= 2
    ? (ratingHistory[ratingHistory.length - 1].newRating - ratingHistory[ratingHistory.length - 2].newRating)
    : 74;
  const ratingDeltaText = ratingDelta >= 0 ? `+${ratingDelta}` : `${ratingDelta}`;

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 selection:bg-slate-200">

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-16 gap-6">

            {/* Left: Brand */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-slate-950 flex items-center justify-center text-white shadow-sm">
                <Zap size={17} className="fill-white" />
              </div>
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-slate-900 tracking-tight text-[15px]">Contest Coach</span>
                <span className="bg-slate-100 border border-slate-200 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-widest">
                  Pro CF
                </span>
              </div>
            </div>

            {/* Middle: Search Input */}
            <div className="flex-1 max-w-sm hidden md:flex items-center">
              <form onSubmit={handleSearchSubmit} className="relative w-full">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search handle or problem… (⌘K)"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl pl-9 pr-10 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200 transition-all"
                />
                <button
                  type="button"
                  onClick={() => { searchInputRef.current?.focus(); searchInputRef.current?.select(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-semibold text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded-md bg-white hover:bg-slate-100 cursor-pointer"
                >
                  ⌘K
                </button>
              </form>
            </div>

            {/* Right: User telemetry pill & avatar */}
            {userInfo ? (
              <div className="flex items-center gap-3 shrink-0 relative">
                <div className="hidden sm:flex items-center gap-2.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
                  <span className="font-semibold text-slate-800 text-[13px]">{userInfo.handle}</span>
                  <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                    {rankShort} {userInfo.rating || 1942}
                  </span>
                  <span className="text-[11px] font-bold text-slate-700">
                    {ratingDeltaText}
                  </span>
                  <span className="w-px h-3 bg-slate-300" />
                  <span className="text-slate-500 font-medium flex items-center gap-1">
                    <Flame size={12} className="text-slate-400" />
                    14d
                  </span>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    title="Notifications"
                    onClick={() => setShowNotifications(!showNotifications)}
                    className={`p-2 rounded-xl transition-colors relative cursor-pointer ${
                      showNotifications ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Bell size={16} />
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  </button>

                  {/* Notifications Popover */}
                  {showNotifications && (
                    <div className="absolute right-0 top-12 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50 animate-pop-in space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className="text-xs font-bold text-slate-900">Notifications & Alerts</span>
                        <button
                          onClick={() => setShowNotifications(false)}
                          className="text-slate-400 hover:text-slate-700 text-xs"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                          <div className="flex items-center justify-between font-semibold text-slate-800">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              Upcoming Contest
                            </span>
                            <span className="text-[10px] text-slate-400">18h remaining</span>
                          </div>
                          <p className="text-slate-500 text-[11px]">
                            Codeforces Round (Div. 2) registration is live. Check the Dashboard for timeline.
                          </p>
                        </div>
                        <div className="p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                          <div className="flex items-center justify-between font-semibold text-slate-800">
                            <span className="flex items-center gap-1.5">
                              <Flame size={12} className="text-slate-400" />
                              Streak Protection
                            </span>
                            <span className="text-[10px] text-slate-400">Today</span>
                          </div>
                          <p className="text-slate-500 text-[11px]">
                            You have an active practice streak. Solve at least 1 problem today in the Practice tab.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {userInfo.avatar ? (
                  <img
                    src={userInfo.avatar}
                    alt={userInfo.handle}
                    className="w-9 h-9 rounded-full border-2 border-slate-200 object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold">
                    {userInfo.handle.charAt(0).toUpperCase()}
                  </div>
                )}

                <button
                  onClick={handleLogout}
                  title="Clear handle"
                  className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleQuickLoad('tourist')}
                  className="btn-secondary text-xs"
                >
                  Try demo
                </button>
              </div>
            )}

          </div>

          {/* Tab Navigation Bar */}
          {userInfo && (
            <div className="flex items-center gap-1 border-t border-slate-100 py-2 overflow-x-auto no-scrollbar">
              {navigationTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id as TabType)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-sm font-semibold'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <Icon size={13} className={isActive ? 'text-white' : 'text-slate-400'} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}

              <div className="ml-auto hidden lg:flex items-center gap-2 text-[11px] text-slate-400 font-medium shrink-0 pl-6 pr-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Round #992 in <strong className="text-slate-600">18h 42m</strong></span>
              </div>
            </div>
          )}

        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">

        {/* Loading Overlay */}
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center py-24 space-y-4">
            <div className="w-10 h-10 rounded-full border-2 border-slate-200 border-t-slate-900 animate-spin" />
            <div className="text-center space-y-1">
              <p className="font-semibold text-slate-800 text-sm">Loading telemetry...</p>
              <p className="text-xs text-slate-400">Syncing live performance from Codeforces</p>
            </div>
          </div>
        )}

        {/* Empty / Enter Handle State */}
        {!loading && !userInfo && (
          <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full">
            <div className="app-card w-full p-8 space-y-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-slate-950 text-white flex items-center justify-center mx-auto shadow-md">
                <Zap size={24} className="fill-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Welcome to Contest Coach</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Enter any Codeforces handle to analyze rating trajectory, practice bottlenecks, and chat with your AI coach.
                </p>
              </div>

              <form onSubmit={handleSearchSubmit} className="space-y-2">
                <input
                  type="text"
                  placeholder="Enter handle (e.g. tourist, k3rn3l)..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-slate-900 transition-all"
                  autoFocus
                />
                <button type="submit" disabled={!searchInput.trim()} className="btn-primary w-full text-sm disabled:opacity-40">
                  Analyze Handle
                </button>
              </form>

              {error && (
                <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 text-slate-600 p-2.5 rounded-lg text-xs text-left">
                  <AlertCircle size={14} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="pt-2 text-center">
                <p className="text-[11px] text-slate-400 mb-2">Or test with top competitors:</p>
                <div className="flex justify-center gap-2">
                  {['tourist', 'Benq', 'demo'].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleQuickLoad(q)}
                      className="text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-md font-medium transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </main>
        )}

        {/* Main Dashboard Views */}
        {!loading && userInfo && (
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 flex flex-col space-y-6">

            {/* Simulated data banner */}
            {isSimulated && (
              <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs">
                <HelpCircle size={14} className="text-slate-500" />
                <span>Demo mode: displaying realistic simulated telemetry dataset.</span>
              </div>
            )}

            {/* Active Tab Content */}
            <div className="flex-1">
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
                        isOwner={true}
                      />
                    </div>
                  )}
                  {activeTab === 'analysis' && (
                    <div className="animate-fade-in-up">
                      <Analysis
                        userInfo={userInfo}
                        ratingHistory={ratingHistory}
                        submissions={submissions}
                        onNavigate={(tab) => handleTabChange(tab as TabType)}
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
                        isOwner={true}
                      />
                    </div>
                  )}
                  {activeTab === 'social' && (
                    <div className="animate-fade-in-up">
                      <Social
                        primaryUser={userInfo}
                        primaryRatingHistory={ratingHistory}
                        primarySubmissions={submissions}
                        onNavigate={(tab) => handleTabChange(tab as TabType)}
                      />
                    </div>
                  )}
                  {activeTab === 'aicoach' && (
                    <div className="animate-fade-in-up">
                      <AICoach
                        userInfo={userInfo}
                        submissions={submissions}
                        chatMessages={chatMessages}
                        onMessagesChange={setChatMessages}
                        isOwner={true}
                      />
                    </div>
                  )}
                </ErrorBoundary>
              )}
            </div>

          </main>
        )}

      </div>

      {/* Universal Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${apiHealth === 'online' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span>Contest Coach v3.4.1 (CP Engine)</span>
            <span>•</span>
            <span>Codeforces API v2.0 Live telemetry</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500">
            <button
              onClick={() => setShowRatingBounds(true)}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Rating bounds
            </button>
            <button
              onClick={() => setShowDocs(true)}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Documentation
            </button>
            <a
              href="https://discord.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-900 transition-colors inline-flex items-center gap-1"
            >
              <span>Discord community</span>
              <ExternalLink size={11} />
            </a>
            <button
              onClick={() => setShowStatus(true)}
              className="hover:text-slate-900 transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>API status</span>
              <span className={`w-1.5 h-1.5 rounded-full ${apiHealth === 'online' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </button>
          </div>
        </div>
      </footer>

      {/* ── Rating Bounds Modal ── */}
      {showRatingBounds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 animate-pop-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Codeforces Rating Bands & Tiers</h3>
              <button onClick={() => setShowRatingBounds(false)} className="text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px]">
                    <th className="pb-2">Rank Title</th>
                    <th className="pb-2">Rating Range</th>
                    <th className="pb-2">Division Eligibility</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  <tr><td className="py-2 text-slate-500 font-bold">Newbie</td><td>&lt; 1200</td><td>Div. 3 / Div. 4</td></tr>
                  <tr><td className="py-2 text-emerald-600 font-bold">Pupil</td><td>1200 – 1399</td><td>Div. 2 / Div. 3</td></tr>
                  <tr><td className="py-2 text-cyan-600 font-bold">Specialist</td><td>1400 – 1599</td><td>Div. 2</td></tr>
                  <tr><td className="py-2 text-blue-600 font-bold">Expert</td><td>1600 – 1899</td><td>Div. 2</td></tr>
                  <tr><td className="py-2 text-purple-600 font-bold">Candidate Master</td><td>1900 – 2099</td><td>Div. 1 + 2</td></tr>
                  <tr><td className="py-2 text-amber-600 font-bold">Master</td><td>2100 – 2299</td><td>Div. 1</td></tr>
                  <tr><td className="py-2 text-orange-600 font-bold">International Master</td><td>2300 – 2399</td><td>Div. 1</td></tr>
                  <tr><td className="py-2 text-rose-600 font-bold">Grandmaster</td><td>2400 – 2599</td><td>Div. 1</td></tr>
                  <tr><td className="py-2 text-red-600 font-bold">Legendary Grandmaster</td><td>3000+</td><td>Div. 1</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Documentation Modal ── */}
      {showDocs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 w-full max-w-xl rounded-2xl p-6 shadow-2xl space-y-4 animate-pop-in max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Contest Coach Documentation</h3>
              <button onClick={() => setShowDocs(false)} className="text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">1. Live Telemetry & Rating Deltas</h4>
                <p>
                  Contest Coach pulls contest history and all historical problem submissions directly via the official Codeforces API and caches profiles in PostgreSQL for fast performance.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">2. Socratic AI Coach</h4>
                <p>
                  Powered by Google Gemini 2.5 Flash. It inspects your actual submission history to pinpoint algorithmic blindspots (e.g. high TLE on Segment Trees, WA on Dynamic Programming) and provides zero-spoiler conceptual guidance.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">3. LeetCode Synchronization</h4>
                <p>
                  Connect your LeetCode username directly in the Dashboard tab to combine your interview preparation statistics with your contest rating trajectory.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── API Status Modal ── */}
      {showStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 animate-pop-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">API Status & Service Health</h3>
              <button onClick={() => setShowStatus(false)} className="text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800">Contest Coach Backend Server</p>
                  <p className="text-[11px] text-slate-400">http://localhost:5000/health</p>
                </div>
                <span className="flex items-center gap-1.5 font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  ONLINE
                </span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800">Codeforces API Telemetry</p>
                  <p className="text-[11px] text-slate-400">codeforces.com/api/user.info</p>
                </div>
                <span className="flex items-center gap-1.5 font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  ONLINE
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
