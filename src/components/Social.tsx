import React, { useState } from 'react';
import { fetchCodeforcesData } from '../api/codeforces';
import type { CFUserInfo, CFSubmission, CFRatingChange } from '../api/codeforces';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Users, Search, Trophy, TrendingUp, CheckCircle2, XCircle, Minus, Loader2, AlertCircle } from 'lucide-react';
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
      confetti({ particleCount: 60, spread: 65, origin: { y: 0.75 } });
    } catch (err: any) {
      setError('Could not fetch user. Verify the handle is correct.');
    } finally {
      setLoading(false);
    }
  };

  const getStats = (user: CFUserInfo, subs: CFSubmission[]) => {
    const ok = subs.filter(s => s.verdict === 'OK');
    const solved = new Set(ok.map(s => `${s.problem.contestId}-${s.problem.index}`)).size;
    const rate = subs.length > 0 ? (ok.length / subs.length) * 100 : 0;
    return { rating: user.rating || 0, maxRating: user.maxRating || 0, solved, rate, contests: 0 };
  };

  const primaryStats = getStats(primaryUser, primarySubmissions);
  const compareStats = compareUser ? getStats(compareUser, compareSubmissions) : null;

  // Build overlapping timeline
  const getTimelineData = () => {
    const map: { [key: string]: { dateVal: number; primary?: number; compare?: number } } = {};
    primaryRatingHistory.forEach(c => {
      const k = new Date(c.ratingUpdateTimeSeconds * 1000).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      map[k] = { dateVal: c.ratingUpdateTimeSeconds, primary: c.newRating };
    });
    if (compareUser) {
      compareRatingHistory.forEach(c => {
        const k = new Date(c.ratingUpdateTimeSeconds * 1000).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        if (map[k]) map[k].compare = c.newRating;
        else map[k] = { dateVal: c.ratingUpdateTimeSeconds, compare: c.newRating };
      });
    }
    return Object.keys(map)
      .sort((a, b) => map[a].dateVal - map[b].dateVal)
      .map(k => ({
        name: k,
        [primaryUser.handle]: map[k].primary,
        [compareUser?.handle || 'Compare']: map[k].compare,
      }));
  };

  const chartData = getTimelineData();

  // Head-to-head metrics
  const metrics = compareStats ? [
    {
      label: 'Active Rating',
      primary: primaryStats.rating,
      compare: compareStats.rating,
      format: (v: number) => String(v),
    },
    {
      label: 'Peak Rating',
      primary: primaryStats.maxRating,
      compare: compareStats.maxRating,
      format: (v: number) => String(v),
    },
    {
      label: 'Problems Solved',
      primary: primaryStats.solved,
      compare: compareStats.solved,
      format: (v: number) => String(v),
    },
    {
      label: 'Accept Rate',
      primary: primaryStats.rate,
      compare: compareStats.rate,
      format: (v: number) => `${v.toFixed(1)}%`,
    },
  ] : [];

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* ── Search Bar ────────────────────────────────────────────────────── */}
      <div className="bg-[#080e1a] border border-[#121e35] rounded-2xl overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-[#121e35]/70 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
            <Users size={15} className="text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Handle Compare</h3>
            <p className="text-[10px] text-slate-500">Search any Codeforces user to compete head-to-head</p>
          </div>
        </div>

        <div className="px-6 py-5">
          <form onSubmit={handleSearchCompare} className="flex gap-3 max-w-lg">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 text-slate-500" size={15} />
              <input
                type="text"
                placeholder="Enter Codeforces handle (e.g. tourist)"
                value={compareHandle}
                onChange={(e) => setCompareHandle(e.target.value)}
                disabled={loading}
                className="w-full bg-[#060b13] border border-[#1b2b48] pl-10 pr-4 py-2.5 rounded-xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !compareHandle.trim()}
              className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/25 font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              {loading ? 'Fetching...' : 'Compare'}
            </button>
          </form>
          {error && (
            <div className="mt-3 flex items-center gap-2 text-rose-400 text-xs font-semibold bg-rose-500/8 border border-rose-500/20 px-3 py-2 rounded-lg max-w-lg">
              <AlertCircle size={13} />
              {error}
            </div>
          )}
        </div>
      </div>

      {/* ── Empty State ───────────────────────────────────────────────────── */}
      {!compareUser && !loading && (
        <div className="flex flex-col items-center justify-center py-20 space-y-5 text-center">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-[#080e1a] border border-[#1b2b48] flex items-center justify-center">
              <Users size={36} className="text-slate-600" />
            </div>
            <div className="absolute -top-2 -right-2 w-7 h-7 bg-cyan-500/10 border border-cyan-500/20 rounded-full flex items-center justify-center">
              <Search size={13} className="text-cyan-400" />
            </div>
          </div>
          <div className="space-y-1.5">
            <h4 className="font-bold text-white text-lg">No comparison yet</h4>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              Enter any Codeforces handle above to unlock side-by-side stats, overlapping rating history, and a head-to-head win breakdown.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            {['tourist', 'Benq', 'Um_nik', 'jiangly'].map(h => (
              <button
                key={h}
                onClick={() => { setCompareHandle(h); }}
                className="text-xs font-semibold text-slate-400 hover:text-cyan-400 bg-[#060b13] hover:bg-cyan-500/10 border border-slate-800 hover:border-cyan-500/20 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
              >
                {h}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Side-by-Side Profile Cards ─────────────────────────────────────── */}
      {compareUser && compareStats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-7 items-stretch gap-4">
            {/* Primary user */}
            <div className="md:col-span-3 bg-gradient-to-br from-cyan-950/40 to-[#080e1a] border border-cyan-500/20 rounded-2xl p-6 flex flex-col items-center text-center space-y-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
              <div className="relative">
                <img src={primaryUser.avatar} alt={primaryUser.handle} className="w-20 h-20 rounded-2xl border-2 border-cyan-500/50 bg-slate-900 object-cover" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                  <span className="text-[9px] font-black text-slate-950">YOU</span>
                </div>
              </div>
              <div>
                <h4 className="font-black text-white text-xl">{primaryUser.handle}</h4>
                <span className="text-xs text-cyan-400 font-bold uppercase">{primaryUser.rank}</span>
              </div>
              <div className="w-full space-y-2 pt-3 border-t border-cyan-500/10 text-sm">
                {[
                  { label: 'Rating', val: primaryStats.rating, color: 'text-white' },
                  { label: 'Peak', val: primaryStats.maxRating, color: 'text-cyan-400' },
                  { label: 'Solved', val: primaryStats.solved, color: 'text-white' },
                  { label: 'Accept Rate', val: `${primaryStats.rate.toFixed(1)}%`, color: 'text-emerald-400' },
                ].map(s => (
                  <div key={s.label} className="flex justify-between">
                    <span className="text-slate-400">{s.label}</span>
                    <span className={`font-bold ${s.color}`}>{s.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* VS Divider */}
            <div className="md:col-span-1 flex items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-500 text-white flex items-center justify-center font-black text-sm shadow-2xl shadow-cyan-500/20">
                VS
              </div>
            </div>

            {/* Compare user */}
            <div className="md:col-span-3 bg-gradient-to-br from-emerald-950/40 to-[#080e1a] border border-emerald-500/20 rounded-2xl p-6 flex flex-col items-center text-center space-y-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
              <div className="relative">
                <img src={compareUser.avatar} alt={compareUser.handle} className="w-20 h-20 rounded-2xl border-2 border-emerald-500/50 bg-slate-900 object-cover" />
              </div>
              <div>
                <h4 className="font-black text-white text-xl">{compareUser.handle}</h4>
                <span className="text-xs text-emerald-400 font-bold uppercase">{compareUser.rank}</span>
              </div>
              <div className="w-full space-y-2 pt-3 border-t border-emerald-500/10 text-sm">
                {[
                  { label: 'Rating', val: compareStats.rating, color: 'text-white' },
                  { label: 'Peak', val: compareStats.maxRating, color: 'text-emerald-400' },
                  { label: 'Solved', val: compareStats.solved, color: 'text-white' },
                  { label: 'Accept Rate', val: `${compareStats.rate.toFixed(1)}%`, color: 'text-emerald-400' },
                ].map(s => (
                  <div key={s.label} className="flex justify-between">
                    <span className="text-slate-400">{s.label}</span>
                    <span className={`font-bold ${s.color}`}>{s.val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Head-to-Head Metrics ──────────────────────────────────────── */}
          <div className="bg-[#080e1a] border border-[#121e35] rounded-2xl overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-[#121e35]/70 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Trophy size={15} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Head-to-Head</h3>
                <p className="text-[10px] text-slate-500">Metric by metric breakdown</p>
              </div>
            </div>

            <div className="divide-y divide-[#121e35]/60">
              {metrics.map(({ label, primary, compare, format }) => {
                const youWin = primary > compare;
                const tie = primary === compare;
                return (
                  <div key={label} className="px-6 py-4 grid grid-cols-3 items-center gap-4">
                    {/* Primary */}
                    <div className={`text-right font-black text-lg ${youWin ? 'text-cyan-400' : tie ? 'text-slate-400' : 'text-slate-600'}`}>
                      {format(primary)}
                    </div>
                    {/* Label + Icon */}
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider text-center">{label}</span>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${youWin ? 'bg-cyan-500/15' : tie ? 'bg-slate-800' : 'bg-emerald-500/15'}`}>
                        {tie
                          ? <Minus size={12} className="text-slate-500" />
                          : youWin
                          ? <CheckCircle2 size={12} className="text-cyan-400" />
                          : <XCircle size={12} className="text-emerald-400" />
                        }
                      </div>
                    </div>
                    {/* Compare */}
                    <div className={`text-left font-black text-lg ${!youWin && !tie ? 'text-emerald-400' : tie ? 'text-slate-400' : 'text-slate-600'}`}>
                      {format(compare)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Overlapping Rating Chart ──────────────────────────────────── */}
          <div className="bg-[#080e1a] border border-[#121e35] rounded-2xl overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-[#121e35]/70 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                  <TrendingUp size={15} className="text-violet-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Rating History Overlay</h3>
                  <p className="text-[10px] text-slate-500">Both rating journeys on one timeline</p>
                </div>
              </div>
              <div className="flex gap-4 text-[11px]">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-cyan-400" /><span className="text-slate-400">{primaryUser.handle}</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-400" /><span className="text-slate-400">{compareUser.handle}</span></div>
              </div>
            </div>

            <div className="px-4 py-4 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="name" stroke="#334155" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                  <YAxis stroke="#334155" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#080e1a', border: '1px solid rgba(6,182,212,0.2)', borderRadius: '10px', padding: '8px 12px' }}
                  />
                  <Line type="monotone" dataKey={primaryUser.handle} stroke="#22d3ee" strokeWidth={2.5} dot={{ r: 2, fill: '#22d3ee', strokeWidth: 0 }} connectNulls />
                  <Line type="monotone" dataKey={compareUser.handle} stroke="#34d399" strokeWidth={2.5} dot={{ r: 2, fill: '#34d399', strokeWidth: 0 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

    </div>
  );
};
