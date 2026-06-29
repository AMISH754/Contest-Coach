import React, { useState } from 'react';
import { fetchCodeforcesData } from '../api/codeforces';
import type { CFUserInfo, CFSubmission, CFRatingChange } from '../api/codeforces';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Users, Search } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SocialProps {
  primaryUser: CFUserInfo;
  primaryRatingHistory: CFRatingChange[];
  primarySubmissions: CFSubmission[];
}

export const Social: React.FC<SocialProps> = ({ primaryUser, primaryRatingHistory, primarySubmissions }) => {
  const [compareHandle, setCompareHandle] = useState('');
  const [compareUser, setCompareUser] = useState<CFUserInfo | null>(null);
  const [compareRatingHistory, setCompareRatingHistory] = useState<CFRatingChange[]>([]);
  const [compareSubmissions, setCompareSubmissions] = useState<CFSubmission[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearchCompare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compareHandle.trim()) return;

    setLoading(true);
    setError('');
    try {
      const data = await fetchCodeforcesData(compareHandle.trim());
      setCompareUser(data.userInfo);
      setCompareRatingHistory(data.ratingHistory);
      setCompareSubmissions(data.submissions);
      
      // Fire confetti for successful comparison
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 }
      });
    } catch (err: any) {
      console.warn('Compare search error:', err);
      setError('Could not fetch user details. Verify handle is correct.');
    } finally {
      setLoading(false);
    }
  };

  // 1. Calculations for Comparison metrics
  const getStats = (user: CFUserInfo, subs: CFSubmission[]) => {
    const totalSub = subs.length;
    const okSub = subs.filter(s => s.verdict === 'OK');
    const totalSolved = new Set(okSub.map(s => `${s.problem.contestId}-${s.problem.index}`)).size;
    const successRate = totalSub > 0 ? (okSub.length / totalSub) * 100 : 0;
    
    return {
      rating: user.rating || 0,
      maxRating: user.maxRating || 0,
      solved: totalSolved,
      successRate,
      activeSubs: totalSub,
    };
  };

  const primaryStats = getStats(primaryUser, primarySubmissions);
  const compareStats = compareUser ? getStats(compareUser, compareSubmissions) : null;

  // 2. Prepare Overlapping Chart Data
  // Combine both rating histories aligned by contest dates
  // Or simpler: map by month/year so they align neatly
  const getTimelineData = () => {
    const timelineMap: { [dateStr: string]: { dateVal: number; primary?: number; compare?: number } } = {};
    
    primaryRatingHistory.forEach(c => {
      const dateStr = new Date(c.ratingUpdateTimeSeconds * 1000).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      timelineMap[dateStr] = {
        dateVal: c.ratingUpdateTimeSeconds,
        primary: c.newRating,
      };
    });

    if (compareUser) {
      compareRatingHistory.forEach(c => {
        const dateStr = new Date(c.ratingUpdateTimeSeconds * 1000).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        if (timelineMap[dateStr]) {
          timelineMap[dateStr].compare = c.newRating;
        } else {
          timelineMap[dateStr] = {
            dateVal: c.ratingUpdateTimeSeconds,
            compare: c.newRating,
          };
        }
      });
    }

    return Object.keys(timelineMap)
      .sort((a, b) => timelineMap[a].dateVal - timelineMap[b].dateVal)
      .map(key => ({
        name: key,
        [primaryUser.handle]: timelineMap[key].primary,
        [compareUser?.handle || 'Compare']: timelineMap[key].compare,
      }));
  };

  const chartData = getTimelineData();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. Comparison Handle Search */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Users size={20} className="text-cyan-400" />
          Compare Handles Side-by-Side
        </h3>
        <p className="text-xs text-slate-400">Search another Codeforces user handle to overlay stats, rating history, and performance comparison.</p>

        <form onSubmit={handleSearchCompare} className="flex gap-2 max-w-md">
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Enter CF handle (e.g. tourist)" 
              value={compareHandle}
              onChange={(e) => setCompareHandle(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
              disabled={loading}
            />
            <Search className="absolute left-3.5 top-3.5 text-slate-500" size={16} />
          </div>
          <button 
            type="submit" 
            className="bg-[#06b6d4] hover:bg-cyan-400 disabled:bg-cyan-800 text-slate-950 font-bold px-5 py-2.5 rounded-xl transition-all text-sm flex items-center gap-2 cursor-pointer"
            disabled={loading}
          >
            {loading ? 'Fetching...' : 'Compare'}
          </button>
        </form>

        {error && (
          <p className="text-xs text-rose-400 font-semibold">{error}</p>
        )}
      </div>

      {/* 2. Side-by-Side Cards */}
      {compareUser && compareStats && (
        <div className="grid grid-cols-1 md:grid-cols-7 items-center gap-6">
          {/* Primary User Card */}
          <div className="glass-card p-6 rounded-2xl md:col-span-3 text-center space-y-4 border-cyan-500/20">
            <img 
              src={primaryUser.avatar} 
              alt={primaryUser.handle} 
              className="w-16 h-16 rounded-full border-2 border-cyan-500 mx-auto bg-slate-900"
            />
            <div>
              <h4 className="font-black text-white text-lg">{primaryUser.handle}</h4>
              <span className="text-xs text-cyan-400 uppercase font-semibold">{primaryUser.rank}</span>
            </div>
            
            <div className="space-y-2 pt-2 border-t border-slate-900 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Rating</span>
                <span className="font-bold text-white">{primaryStats.rating}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Max Rating</span>
                <span className="font-bold text-emerald-400">{primaryStats.maxRating}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Problems Solved</span>
                <span className="font-bold text-white">{primaryStats.solved}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Success Rate</span>
                <span className="font-bold text-white">{primaryStats.successRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* VS Divider */}
          <div className="flex justify-center md:col-span-1">
            <div className="w-12 h-12 rounded-full bg-[#06b6d4] text-slate-950 flex items-center justify-center font-black shadow-lg shadow-cyan-500/10">
              VS
            </div>
          </div>

          {/* Compare User Card */}
          <div className="glass-card p-6 rounded-2xl md:col-span-3 text-center space-y-4 border-emerald-500/25 bg-emerald-500/5">
            <img 
              src={compareUser.avatar} 
              alt={compareUser.handle} 
              className="w-16 h-16 rounded-full border-2 border-emerald-500 mx-auto bg-slate-900"
            />
            <div>
              <h4 className="font-black text-white text-lg">{compareUser.handle}</h4>
              <span className="text-xs text-emerald-400 uppercase font-semibold">{compareUser.rank}</span>
            </div>
            
            <div className="space-y-2 pt-2 border-t border-slate-900 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Rating</span>
                <span className="font-bold text-white">{compareStats.rating}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Max Rating</span>
                <span className="font-bold text-emerald-400">{compareStats.maxRating}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Problems Solved</span>
                <span className="font-bold text-white">{compareStats.solved}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Success Rate</span>
                <span className="font-bold text-white">{compareStats.successRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Overlapping Rating History Chart */}
      {compareUser && (
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <h3 className="text-lg font-bold text-white">📈 Rating History Overlay</h3>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#080e1a', border: '1px solid #121e35', borderRadius: '8px' }} />
                <Legend />
                <Line type="monotone" dataKey={primaryUser.handle} stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 2 }} connectNulls />
                <Line type="monotone" dataKey={compareUser.handle} stroke="#10b981" strokeWidth={2.5} dot={{ r: 2 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 4. Compare Wins Table */}
      {compareUser && compareStats && (
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            🏆 Metric Highlights
          </h3>
          <div className="space-y-3">
            {/* Rating Comparison */}
            <div className="glass-panel p-4 rounded-xl flex justify-between items-center text-sm">
              <span className="text-slate-400 font-semibold">Active Rating</span>
              <div className="flex gap-4 font-bold">
                <span className={primaryStats.rating >= compareStats.rating ? 'text-cyan-400' : 'text-slate-600'}>
                  {primaryUser.handle} ({primaryStats.rating})
                </span>
                <span className="text-slate-500">vs</span>
                <span className={compareStats.rating >= primaryStats.rating ? 'text-emerald-400' : 'text-slate-600'}>
                  {compareUser.handle} ({compareStats.rating})
                </span>
              </div>
            </div>

            {/* Solved Comparison */}
            <div className="glass-panel p-4 rounded-xl flex justify-between items-center text-sm">
              <span className="text-slate-400 font-semibold">Problems Solved</span>
              <div className="flex gap-4 font-bold">
                <span className={primaryStats.solved >= compareStats.solved ? 'text-cyan-400' : 'text-slate-600'}>
                  {primaryUser.handle} ({primaryStats.solved})
                </span>
                <span className="text-slate-500">vs</span>
                <span className={compareStats.solved >= primaryStats.solved ? 'text-emerald-400' : 'text-slate-600'}>
                  {compareUser.handle} ({compareStats.solved})
                </span>
              </div>
            </div>

            {/* Accuracy Comparison */}
            <div className="glass-panel p-4 rounded-xl flex justify-between items-center text-sm">
              <span className="text-slate-400 font-semibold">Accuracy / Success Rate</span>
              <div className="flex gap-4 font-bold">
                <span className={primaryStats.successRate >= compareStats.successRate ? 'text-cyan-400' : 'text-slate-600'}>
                  {primaryUser.handle} ({primaryStats.successRate.toFixed(1)}%)
                </span>
                <span className="text-slate-500">vs</span>
                <span className={compareStats.successRate >= primaryStats.successRate ? 'text-emerald-400' : 'text-slate-600'}>
                  {compareUser.handle} ({compareStats.successRate.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Default view when not comparing */}
      {!compareUser && (
        <div className="glass-panel p-8 rounded-2xl text-center space-y-3 flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-2">
            <Users size={32} />
          </div>
          <h4 className="font-bold text-white text-lg">Compare handle statistics</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Ready to measure your skills? Input another developer's handle to unlock overlay analytics, side-by-side stats, and accuracy scores.
          </p>
        </div>
      )}
    </div>
  );
};
