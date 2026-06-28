import React, { useState, useEffect } from 'react';
import { fetchCodeforcesData } from './api/codeforces';
import type { CFUserInfo, CFRatingChange, CFSubmission } from './api/codeforces';
import { Dashboard } from './components/Dashboard';
import { Analysis } from './components/Analysis';
import { Predictions } from './components/Predictions';
import { Coach } from './components/Coach';
import { Social } from './components/Social';
import { AICoach } from './components/AICoach';
import { Search, Flame, Terminal, HelpCircle, AlertCircle, RefreshCw, BarChart2, ShieldAlert, Award, Compass, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';

type TabType = 'dashboard' | 'analysis' | 'predictions' | 'coach' | 'social' | 'aicoach';

function App() {
  const [handle, setHandle] = useState(() => localStorage.getItem('cf_handle') || '');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  
  // Codeforces profiles data
  const [userInfo, setUserInfo] = useState<CFUserInfo | null>(null);
  const [ratingHistory, setRatingHistory] = useState<CFRatingChange[]>([]);
  const [submissions, setSubmissions] = useState<CFSubmission[]>([]);
  const [isSimulated, setIsSimulated] = useState(false);

  const loadData = async (targetHandle: string) => {
    if (!targetHandle.trim()) return;
    setLoading(true);
    setError('');
    setIsSimulated(false);
    
    try {
      const data = await fetchCodeforcesData(targetHandle);
      
      // Determine if mock data was returned
      // (Mock profiles have avatar links from dicebear)
      const mockUsed = data.userInfo.avatar?.includes('dicebear.com') || targetHandle.toLowerCase() === 'demo';
      setIsSimulated(mockUsed);

      setUserInfo(data.userInfo);
      setRatingHistory(data.ratingHistory);
      setSubmissions(data.submissions);
      
      localStorage.setItem('cf_handle', targetHandle);
      setHandle(targetHandle);

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
  };

  const navigationTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
    { id: 'analysis', label: 'Contest Analysis', icon: ShieldAlert },
    { id: 'predictions', label: 'Predictions', icon: Compass },
    { id: 'coach', label: 'Practice Coach', icon: Zap },
    { id: 'social', label: 'Social Compare', icon: Flame },
    { id: 'aicoach', label: 'AI Coach', icon: Award },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] text-slate-100 font-sans pb-12 selection:bg-violet-500/30 selection:text-violet-200">
      
      {/* 1. Header Navigation Bar */}
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-900 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={handleLogout}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-900/30">
              <Terminal size={18} className="text-white" />
            </div>
            <div>
              <span className="font-extrabold text-white text-base tracking-tight block">CONTEST COACH</span>
              <span className="text-[10px] text-violet-400 block tracking-wider uppercase font-semibold">Competitive Assistant</span>
            </div>
          </div>

          {/* Quick Search inside Header if already loaded */}
          {userInfo && (
            <form onSubmit={handleSearchSubmit} className="hidden sm:flex items-center gap-2 max-w-xs flex-1">
              <div className="relative w-full">
                <input 
                  type="text" 
                  placeholder="Change handle..." 
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg glass-input text-xs"
                />
                <Search className="absolute left-3 top-2.5 text-slate-500" size={12} />
              </div>
              <button type="submit" className="hidden"></button>
            </form>
          )}

          {userInfo && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-right">
                <span className="text-xs text-slate-400 hidden md:block">Active Handle</span>
                <span className="font-bold text-sm text-violet-400">{userInfo.handle}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="text-xs font-semibold bg-slate-900 hover:bg-slate-800 hover:text-violet-300 text-slate-400 border border-slate-800/80 px-3 py-1.5 rounded-lg transition-all"
              >
                Log Out
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 2. Main Content Frame */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-8 flex-1 flex flex-col justify-start">
        
        {/* State: A. Loading Overlay */}
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center py-24 space-y-4">
            <RefreshCw size={48} className="text-violet-500 animate-spin" />
            <div className="text-center">
              <p className="font-bold text-white">Fetching Codeforces profile...</p>
              <p className="text-xs text-slate-500">Querying user.info, user.rating, and user.status APIs</p>
            </div>
          </div>
        )}

        {/* State: B. Onboarding Page (No handle entered yet) */}
        {!loading && !userInfo && (
          <div className="max-w-xl mx-auto w-full py-12 md:py-20 space-y-8 animate-fade-in text-center">
            <div className="space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-2xl shadow-violet-500/20">
                <Terminal size={32} className="text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-none">
                Master Competitive Programming
              </h1>
              <p className="text-sm md:text-base text-slate-400 max-w-md mx-auto leading-relaxed">
                Connect your Codeforces handle to unlock real-time progress charts, topic weakness detection, weekly roadmaps, and AI coaching.
              </p>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSearchSubmit} className="glass-card p-6 rounded-2xl space-y-4">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Enter Codeforces Handle..." 
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl glass-input text-base"
                />
                <Search className="absolute left-4 top-4.5 text-slate-500" size={18} />
              </div>

              <button 
                type="submit" 
                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2 text-sm"
              >
                Launch Dashboard <RefreshCw size={14} className="animate-spin-slow" />
              </button>

              {error && (
                <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-xs font-semibold">
                  <AlertCircle size={14} />
                  <span>{error}</span>
                </div>
              )}
            </form>

            {/* Quick Demo Options */}
            <div className="space-y-3">
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Or click to load standard accounts</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button 
                  onClick={() => handleQuickLoad('tourist')}
                  className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold px-4 py-2 rounded-xl border border-slate-800 transition-all hover:border-violet-500/20"
                >
                  👑 Tourist
                </button>
                <button 
                  onClick={() => handleQuickLoad('Benq')}
                  className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold px-4 py-2 rounded-xl border border-slate-800 transition-all hover:border-violet-500/20"
                >
                  🚀 Benq
                </button>
                <button 
                  onClick={() => handleQuickLoad('demo')}
                  className="text-xs bg-violet-600/10 hover:bg-violet-600/20 text-violet-400 font-bold px-4 py-2 rounded-xl border border-violet-500/20 transition-all"
                >
                  ✨ Demo Profile
                </button>
              </div>
            </div>
          </div>
        )}

        {/* State: C. Logged In Application Frame */}
        {!loading && userInfo && (
          <div className="space-y-6 flex-1 flex flex-col">
            
            {/* Warning: Simulated data fallback */}
            {isSimulated && (
              <div className="flex items-center justify-between bg-violet-500/10 border border-violet-500/20 text-violet-300 px-4 py-3 rounded-xl text-xs">
                <div className="flex items-center gap-2 font-medium">
                  <HelpCircle size={14} className="text-violet-400" />
                  <span>Showing simulated profile data (Demo Mode / API Fallback). Try search again for live stats.</span>
                </div>
              </div>
            )}

            {/* Navigation Tabs Bar */}
            <div className="border-b border-slate-900/60 flex items-center justify-start overflow-x-auto pb-px pr-4 -mx-4 px-4 scrollbar-none">
              <nav className="flex space-x-1 sm:space-x-2">
                {navigationTabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as TabType)}
                      className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-semibold rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
                        isActive 
                          ? 'border-violet-500 bg-violet-500/5 text-white' 
                          : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                      }`}
                    >
                      <Icon size={16} />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Panel Render */}
            <div className="flex-1 min-h-[400px]">
              {activeTab === 'dashboard' && (
                <Dashboard 
                  userInfo={userInfo} 
                  ratingHistory={ratingHistory} 
                  submissions={submissions} 
                />
              )}
              {activeTab === 'analysis' && (
                <Analysis 
                  userInfo={userInfo} 
                  ratingHistory={ratingHistory} 
                  submissions={submissions} 
                />
              )}
              {activeTab === 'predictions' && (
                <Predictions 
                  userInfo={userInfo} 
                  ratingHistory={ratingHistory} 
                />
              )}
              {activeTab === 'coach' && (
                <Coach 
                  userInfo={userInfo} 
                  submissions={submissions} 
                />
              )}
              {activeTab === 'social' && (
                <Social 
                  primaryUser={userInfo} 
                  primaryRatingHistory={ratingHistory} 
                  primarySubmissions={submissions} 
                />
              )}
              {activeTab === 'aicoach' && (
                <AICoach 
                  userInfo={userInfo} 
                  ratingHistory={ratingHistory} 
                  submissions={submissions} 
                />
              )}
            </div>

          </div>
        )}

      </main>
      
      {/* 3. Footer Branding */}
      <footer className="mt-20 border-t border-slate-900/60 py-6 text-center text-xs text-slate-500 max-w-7xl mx-auto w-full px-4">
        <p>© 2026 Contest Coach Frontend Dashboard. Connect with standard handles. Powered by public Codeforces REST endpoints.</p>
      </footer>
    </div>
  );
}

export default App;
