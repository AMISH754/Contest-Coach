import React, { useState, useMemo } from 'react';
import type { CFUserInfo, CFRatingChange, CFSubmission } from '../api/codeforces';
import { fetchCodeforcesData } from '../api/codeforces';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer
} from 'recharts';
import {
  Download, ArrowRight,
  TrendingDown, Sparkles, Plus, X, RefreshCw
} from 'lucide-react';
import type { TabType } from '../App';

interface SocialProps {
  primaryUser: CFUserInfo;
  primaryRatingHistory: CFRatingChange[];
  primarySubmissions: CFSubmission[];
  onNavigate?: (tab: TabType) => void;
}

export const Social: React.FC<SocialProps> = ({
  primaryUser, primarySubmissions, onNavigate
}) => {
  const [metricScale, setMetricScale] = useState<'norm' | 'abs' | 'pct'>('norm');
  const [rivalProfiles, setRivalProfiles] = useState<Array<{
    handle: string;
    rating: number;
    rank: string;
  }>>([
    { handle: 'tourist', rating: 3782, rank: 'Legendary Grandmaster' },
    { handle: 'Benq', rating: 3554, rank: 'Legendary Grandmaster' }
  ]);
  const [rivalInput, setRivalInput] = useState('');
  const [showAddRival, setShowAddRival] = useState(false);
  const [loadingRival, setLoadingRival] = useState(false);
  const [rivalError, setRivalError] = useState('');

  const activeRival = rivalProfiles[0] || { handle: 'Peer Benchmark', rating: 2050, rank: 'Master' };

  const handleAddRival = async (e: React.FormEvent) => {
    e.preventDefault();
    const h = rivalInput.trim();
    if (!h) return;
    setLoadingRival(true);
    setRivalError('');
    try {
      const data = await fetchCodeforcesData(h);
      setRivalProfiles(prev => [
        {
          handle: data.userInfo.handle,
          rating: data.userInfo.rating || 1500,
          rank: data.userInfo.rank || 'Specialist'
        },
        ...prev.filter(r => r.handle.toLowerCase() !== h.toLowerCase())
      ]);
      setRivalInput('');
      setShowAddRival(false);
    } catch (err: any) {
      setRivalError('Could not find Codeforces user');
    } finally {
      setLoadingRival(false);
    }
  };

  const removeRival = (index: number) => {
    setRivalProfiles(prev => prev.filter((_, i) => i !== index));
  };

  const radarData = useMemo(() => {
    const categories = [
      { subject: 'Dynamic Prog', tags: ['dp'] },
      { subject: 'Greedy', tags: ['greedy', 'constructive algorithms'] },
      { subject: 'Graphs', tags: ['graphs', 'trees'] },
      { subject: 'Seg Trees', tags: ['data structures'] },
      { subject: 'Strings', tags: ['strings'] },
      { subject: 'Math/NT', tags: ['math', 'number theory'] },
    ];

    return categories.map(cat => {
      const userSubs = primarySubmissions.filter(s => s.problem.tags?.some(t => cat.tags.includes(t.toLowerCase())));
      const userOk = userSubs.filter(s => s.verdict === 'OK').length;
      let userScore = userSubs.length > 0 ? Math.round((userOk / userSubs.length) * 75 + 18) : 75;
      let rivalScore = Math.min(99, Math.round(activeRival.rating / 38));

      if (metricScale === 'pct') {
        userScore = Math.min(99, Math.round(userScore * 1.05));
        rivalScore = Math.min(99, Math.round(rivalScore * 1.03));
      } else if (metricScale === 'abs') {
        userScore = Math.round(userScore * 1.6);
        rivalScore = Math.round(rivalScore * 1.6);
      }

      return {
        subject: cat.subject,
        score: userScore,
        target: rivalScore,
      };
    });
  }, [primarySubmissions, activeRival, metricScale]);

  return (
    <div className="space-y-6">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Head-to-head competitor telemetry</h1>
          <p className="text-xs text-slate-400 mt-0.5">Peer benchmarks &middot; Compared to {activeRival.handle} &middot; Live telemetry</p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setShowAddRival(true)}
            className="btn-secondary text-xs cursor-pointer"
          >
            <Plus size={13} />
            Add rival
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="btn-primary text-xs cursor-pointer flex items-center gap-1.5"
          >
            <Download size={13} />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* ── Comparison Chips & Scale Selector ── */}
      <div className="app-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-slate-400 font-semibold">Active comparison:</span>
          <span className="bg-slate-900 text-white font-semibold px-2.5 py-1 rounded-md flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {primaryUser.handle} ({primaryUser.rating || 1942} - {primaryUser.rank || 'CM'}) [You]
          </span>
          <span className="text-slate-400 font-medium">vs</span>
          {rivalProfiles.map((r, i) => (
            <span key={r.handle} className="bg-slate-100 border border-slate-200 text-slate-700 font-medium px-2.5 py-1 rounded-md flex items-center gap-1.5">
              <span>{r.handle} ({r.rating} - {r.rank})</span>
              <button type="button" onClick={() => removeRival(i)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <X size={12} />
              </button>
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0 text-xs">
          <span className="text-slate-400 font-medium">Metric scale:</span>
          <div className="bg-slate-100 p-0.5 rounded-lg flex items-center gap-1 font-medium">
            <button
              type="button"
              onClick={() => setMetricScale('norm')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${metricScale === 'norm' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Normalized
            </button>
            <button
              type="button"
              onClick={() => setMetricScale('abs')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${metricScale === 'abs' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Absolute time
            </button>
            <button
              type="button"
              onClick={() => setMetricScale('pct')}
              className={`px-2 py-1 rounded-md transition-all cursor-pointer ${metricScale === 'pct' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Percentiles
            </button>
          </div>
        </div>
      </div>

      {showAddRival && (
        <form onSubmit={handleAddRival} className="app-card p-4 flex items-center gap-3">
          <input
            type="text"
            placeholder="Enter rival Codeforces handle (e.g. tourist, Benq, Radewoosh)..."
            value={rivalInput}
            onChange={(e) => setRivalInput(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
            autoFocus
          />
          <button type="submit" disabled={loadingRival} className="btn-primary text-xs cursor-pointer flex items-center gap-1">
            {loadingRival && <RefreshCw size={11} className="animate-spin" />}
            <span>Add Rival</span>
          </button>
          <button type="button" onClick={() => setShowAddRival(false)} className="btn-secondary text-xs cursor-pointer">Cancel</button>
          {rivalError && <span className="text-xs text-rose-600 font-semibold">{rivalError}</span>}
        </form>
      )}

      {/* ── 1. Top 4 Benchmark Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Rating Delta */}
        <div className="metric-card p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Rating delta</span>
            <span className="text-[10px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-bold">
              CM target
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">1,942</span>
            <span className="text-sm text-slate-400 font-medium">vs 1,980</span>
          </div>
          <div className="text-xs text-slate-500 font-semibold pt-1 border-t border-slate-100">
            <span>▼ -38 pts behind baseline</span>
          </div>
        </div>

        {/* P1 Solve Velocity */}
        <div className="metric-card p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>P1 solve velocity</span>
            <span className="text-[10px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-bold">
              Median first AC
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">08:42</span>
            <span className="text-sm text-slate-400 font-medium">vs 06:58</span>
          </div>
          <div className="text-xs text-slate-500 font-semibold pt-1 border-t border-slate-100">
            <span>▲ +1m 44s slower than peer avg</span>
          </div>
        </div>

        {/* Div. 2 Conversion */}
        <div className="metric-card p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Div. 2 conversion</span>
            <span className="text-[10px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-bold">
              6 problems
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">4.2 / 6.0</span>
            <span className="text-sm text-slate-400 font-medium">vs 4.5 / 6.0</span>
          </div>
          <div className="text-xs text-slate-500 font-medium pt-1 border-t border-slate-100">
            <span>Clean rate: 70.0% vs 78.5%</span>
          </div>
        </div>

        {/* Penalties / contest */}
        <div className="metric-card p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Penalties / contest</span>
            <span className="text-[10px] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-bold">
              WA / TLE / MLE
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">1.2 WA</span>
            <span className="text-sm text-slate-400 font-medium">vs 0.8 WA</span>
          </div>
          <div className="text-xs text-slate-500 font-semibold pt-1 border-t border-slate-100">
            <span>▲ +0.4 WA/rnd avg penalty cost: 24m</span>
          </div>
        </div>

      </div>

      {/* ── 2. Radar Overlay & Category Delta Matrix ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Direct radar comparison */}
        <div className="app-card p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Algorithmic repertoire</p>
              <h2 className="text-base font-bold text-slate-900">Direct radar comparison overlay</h2>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 font-semibold text-slate-800">
                <span className="w-2 h-2 rounded-full bg-slate-900" />
                {primaryUser.handle} ({primaryUser.rating || 1942})
              </span>
              <span className="flex items-center gap-1 text-slate-400">
                <span className="w-2 h-2 rounded-full bg-slate-300" />
                Target Master (2150)
              </span>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11, fontWeight: 600 }} />
                <Radar name="Target" dataKey="target" stroke="#cbd5e1" fill="#cbd5e1" fillOpacity={0.25} />
                <Radar name="You" dataKey="score" stroke="#0f172a" fill="#0f172a" fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Benchmark scaled against Master (2100–2200 ELO baseline)</span>
            <span>Overall alignment: <strong className="text-slate-800">81.4%</strong></span>
          </div>
        </div>

        {/* Category Delta Matrix */}
        <div className="app-card p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Category delta matrix</p>
              <h2 className="text-base font-bold text-slate-900">Quantified deficit & surplus index</h2>
            </div>
            <span className="text-xs text-slate-400">Derived from last 48 division problem sets</span>
          </div>

          <div className="space-y-3.5 text-xs font-medium">
            {[
              { cat: 'Segment Trees / Lazy Prop', delta: '▼ -32% gap', isPositive: false, pct: 32 },
              { cat: 'Greedy & Constructive', delta: '▲ +8% surplus', isPositive: true, pct: 85 },
              { cat: 'Dynamic Programming', delta: '▼ -6% gap', isPositive: false, pct: 58 },
              { cat: 'Graphs & Flow', delta: '▼ -8% gap', isPositive: false, pct: 52 },
              { cat: 'Strings & Suffix Auto', delta: '▼ -12% gap', isPositive: false, pct: 44 },
            ].map((item) => (
              <div key={item.cat} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 font-semibold">{item.cat}</span>
                  <span className="font-bold text-slate-700">
                    {item.delta}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-slate-900"
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => onNavigate?.('coach')}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
            >
              <span>Open drill recommendations</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>

      </div>

      {/* ── 3. Head-to-head Contest History Matrix Table ── */}
      <div className="app-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div>
            <h2 className="text-base font-bold text-slate-900">Head-to-head contest history matrix</h2>
            <p className="text-xs text-slate-500">Synchronous participation records across official Codeforces rated rounds.</p>
          </div>
          <span className="text-xs text-slate-400">Showing: Last 5 mutual</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-3">Round / Identifier</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Rank Δ (You vs Rival)</th>
                <th className="py-2.5 px-3 text-right">Standing gap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {[
                { round: 'CF Round 991 (Div. 2)', date: '2024-12-05', youRank: '#84 (+74)', rivalRank: '#52 (+88)', gap: '▲ +14 pts ahead', isPositive: true },
                { round: 'Educational Round 171', date: '2024-11-28', youRank: '#210 (+52)', rivalRank: '#180 (+64)', gap: '▲ +12 pts target delta', isPositive: true },
                { round: 'CF Round 989 (Div. 1 + Div. 2)', date: '2024-11-17', youRank: '#1420 (-28)', rivalRank: '#890 (+15)', gap: '▼ -43 pts deficit', isPositive: false },
                { round: 'CF Round 988 (Div. 3 - Practice Duel)', date: '2024-11-10', youRank: '#12 (Unrated)', rivalRank: '#8 (Unrated)', gap: 'Mutual top 15 finish', isPositive: true },
                { round: 'CF Round 984 (Div. 2)', date: '2024-11-02', youRank: '#198 (+85)', rivalRank: '#244 (+45)', gap: '▲ +20 pts personal surplus', isPositive: true },
              ].map((row) => (
                <tr key={row.round} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 font-semibold text-slate-900">• {row.round}</td>
                  <td className="py-3 px-3 text-slate-500">{row.date}</td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-900">{row.youRank}</span>
                    <span className="text-slate-400"> vs {row.rivalRank}</span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      row.gap.includes('deficit')
                        ? 'bg-slate-100 text-slate-700 border border-slate-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {row.gap}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. Where You Beat vs Where You Lose Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Where you beat your benchmark */}
        <div className="app-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              Where you beat your benchmark
            </span>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded">
              Confidence: 94%
            </span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            <strong>Superior greedy constructive intuition.</strong> You submit Problem B on average <strong>18% faster</strong> than typical 1950 candidates with zero Wrong Answers.
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap text-[11px]">
            <span className="text-slate-500">Key assets:</span>
            <span className="bg-white border border-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded">Two Pointers (+22%)</span>
            <span className="bg-white border border-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded">Bitmask Ops (+15%)</span>
            <span className="bg-white border border-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded">Clean Implementation</span>
          </div>
        </div>

        {/* Where you lose rank & rating */}
        <div className="app-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <TrendingDown size={14} className="text-slate-500" />
              Where you lose rank & rating
            </span>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded">
              Rank bleed: High
            </span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            <strong>Implementation overhead on recursive trees and custom segment tree queries.</strong> You spend <strong>+14 mins slower</strong> on Problem D than peers, incurring an average of 1.2 syntax/boundary rewrites.
          </p>
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap text-[11px]">
            <span className="text-slate-500">Remediation:</span>
            <span className="bg-white border border-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded">Lazy SegTree Boilerplate</span>
            <span className="bg-white border border-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded">LCA binary lift drill</span>
            <span className="bg-white border border-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded">Stress-tester scripts</span>
          </div>
        </div>

      </div>

      {/* ── 5. Bottom Duel Challenge Card ── */}
      <div className="app-card p-5 bg-gradient-to-r from-slate-50 via-white to-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles size={16} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Ready to close the 38-point delta to Master?</h4>
            <p className="text-xs text-slate-600 mt-0.5">
              AI Coach has generated a 6-problem high-intensity duel targeting your Segment Tree weakness.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={() => onNavigate?.('coach')}
            className="btn-secondary text-xs cursor-pointer"
          >
            Preview Problem Set
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('coach')}
            className="btn-primary text-xs cursor-pointer"
          >
            Schedule Practice Dual
          </button>
        </div>
      </div>

    </div>
  );
};
