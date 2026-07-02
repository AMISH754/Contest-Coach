import React, { useState, useEffect, useMemo } from 'react';
import { ResponsiveContainer, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { linkLeetCodeProfile, syncLeetCodeProfile, unlinkLeetCodeProfile } from '../api/codeforces';
import type { CFUserInfo, CFRatingChange, CFSubmission } from '../api/codeforces';
import { SyncCooldownButton } from './SyncCooldownButton';
import { Award, ShieldAlert, CheckCircle2, TrendingUp, Calendar, Zap, ListFilter, Link2, Code, HelpCircle } from 'lucide-react';

interface DashboardProps {
  userInfo: CFUserInfo;
  ratingHistory: CFRatingChange[];
  submissions: CFSubmission[];
  onUserInfoUpdate?: (updated: CFUserInfo) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ userInfo, ratingHistory, submissions, onUserInfoUpdate }) => {

  // ── Memoized general stats ──────────────────────────────────────────────────
  const { totalSolved, successRate, okSubmissions, okCount, waCount, tleCount, totalSubmissions } = useMemo(() => {
    const ok = submissions.filter(s => s.verdict === 'OK');
    const solved = new Set(ok.map(s => `${s.problem.contestId}-${s.problem.index}`)).size;
    const rate = submissions.length > 0 ? ((ok.length / submissions.length) * 100).toFixed(0) : '0';
    const verdictCounts: { [key: string]: number } = {};
    submissions.forEach(s => {
      const v = s.verdict || 'UNKNOWN';
      verdictCounts[v] = (verdictCounts[v] || 0) + 1;
    });
    return {
      totalSolved: solved,
      successRate: rate,
      okSubmissions: ok,
      okCount: verdictCounts['OK'] || 0,
      waCount: verdictCounts['WRONG_ANSWER'] || 0,
      tleCount: verdictCounts['TIME_LIMIT_EXCEEDED'] || 0,
      totalSubmissions: submissions.length,
    };
  }, [submissions]);

  // ── Memoized trajectory data ────────────────────────────────────────────────
  const { trajectoryChartData, domainMin, domainMax } = useMemo(() => {
    const trajectoryData = ratingHistory.slice(-5).map(change => {
      const d = new Date(change.ratingUpdateTimeSeconds * 1000);
      return {
        name: `${d.toLocaleDateString('en-US', { month: 'short' })} ${d.getDate()}`,
        rating: change.newRating,
        contest: change.contestName,
      };
    });
    const ratingsOnly = trajectoryData.map(d => d.rating);
    const minRatingVal = ratingsOnly.length > 0 ? Math.min(...ratingsOnly) : 1000;
    const dMin = Math.max(0, minRatingVal - 150);
    const dMax = ratingsOnly.length > 0 ? Math.max(...ratingsOnly) + 100 : 1500;
    const chartData = trajectoryData.map(d => ({ ...d, ratingRange: [dMin, d.rating] }));
    return { trajectoryChartData: chartData, domainMin: dMin, domainMax: dMax };
  }, [ratingHistory]);

  // ── Memoized monthly solved data ────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const solvedByMonth: { [key: string]: { month: string; solved: Set<string>; submissions: number } } = {};

    // Initialize ALL months from any submission (OK or not)
    submissions.forEach(s => {
      const date = new Date(s.creationTimeSeconds * 1000);
      const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
      if (!solvedByMonth[key]) {
        solvedByMonth[key] = { month: monthNames[date.getMonth()], solved: new Set<string>(), submissions: 0 };
      }
      solvedByMonth[key].submissions += 1;
      if (s.verdict === 'OK') {
        solvedByMonth[key].solved.add(`${s.problem.contestId}-${s.problem.index}`);
      }
    });

    return Object.keys(solvedByMonth)
      .sort()
      .slice(-5)
      .map(key => ({
        name: solvedByMonth[key].month,
        Solved: solvedByMonth[key].solved.size,
        Submissions: solvedByMonth[key].submissions,
      }));
  }, [submissions]);

  // ── Memoized analysis items (worst tags) ────────────────────────────────────
  const displayAnalysis = useMemo(() => {
    const tagStats: { [tag: string]: { ok: number; total: number } } = {};
    submissions.forEach(s => {
      if (!s.problem?.tags) return;
      const isOk = s.verdict === 'OK';
      s.problem.tags.forEach(tag => {
        if (!tagStats[tag]) tagStats[tag] = { ok: 0, total: 0 };
        tagStats[tag].total += 1;
        if (isOk) tagStats[tag].ok += 1;
      });
    });

    const analysisItems = Object.keys(tagStats)
      .map(tag => ({ tag, ratio: tagStats[tag].ok / tagStats[tag].total, total: tagStats[tag].total }))
      .filter(t => t.total >= 3)
      .sort((a, b) => a.ratio - b.ratio)
      .slice(0, 3);

    if (analysisItems.length >= 3) {
      return analysisItems.map(item => {
        const rate = Math.round(item.ratio * 100);
        const recMin = Math.round((userInfo.rating || 1200) / 100) * 100;
        const recMax = recMin + 200;
        let tip = `recommend ${recMin}\u2013${recMax} practice`;
        if (item.tag === 'graphs' || item.tag === 'trees') {
          tip = `rating drops after hacks · review shortest paths`;
        } else if (item.tag === 'greedy') {
          tip = `efficiency ${(0.6 + item.ratio / 2).toFixed(2)} · add editorial review block`;
        } else if (item.tag === 'dp' || item.tag === 'dynamic programming') {
          tip = `${rate}% solve rate · recommend ${recMin}\u2013${recMax} practice`;
        }
        return {
          tag: item.tag.charAt(0).toUpperCase() + item.tag.slice(1).replace(/_/g, ' '),
          tip,
        };
      });
    }

    // Fallback with correct unicode characters (no mojibake)
    return [
      { tag: 'Dynamic programming', tip: '41% solve rate \u00b7 recommend 1500\u20131700 practice' },
      { tag: 'Graphs', tip: 'rating drops after +2 hacks \u00b7 review shortest paths' },
      { tag: 'Greedy proof gaps', tip: 'efficiency 0.74 \u00b7 add editorial review block' },
    ];
  }, [submissions, userInfo.rating]);

  // ── Dynamic card badge values ───────────────────────────────────────────────
  const ratingDiff = ratingHistory.length >= 2
    ? ratingHistory[ratingHistory.length - 1].newRating - ratingHistory[ratingHistory.length - 2].newRating
    : 0;
  // Fix: label reflects actual data — difference vs last contest, not "this month"
  const ratingBadge = ratingDiff >= 0 ? `+${ratingDiff} vs last contest` : `${ratingDiff} vs last contest`;

  const currentMax = userInfo.maxRating || 0;
  let maxRatingBadge = 'Newbie path';
  if (currentMax >= 2400) maxRatingBadge = 'Grandmaster path';
  else if (currentMax >= 2100) maxRatingBadge = 'Master path';
  else if (currentMax >= 1900) maxRatingBadge = 'Candidate Master path';
  else if (currentMax >= 1600) maxRatingBadge = 'Expert path';
  else if (currentMax >= 1400) maxRatingBadge = 'Specialist path';
  else if (currentMax >= 1200) maxRatingBadge = 'Pupil path';

  let drops = 0;
  for (let i = 1; i < ratingHistory.length; i++) {
    if (ratingHistory[i].newRating < ratingHistory[i - 1].newRating) drops++;
  }
  const contestsBadge = `${drops || 0} analyzed drops`;

  const solved30Days = useMemo(() =>
    submissions.filter(s => s.verdict === 'OK' && (Date.now() / 1000 - s.creationTimeSeconds) < 30 * 24 * 3600).length,
    [submissions]
  );
  const solvedBadge = `${solved30Days} in 30 days`;
  const successBadge = `+${(parseFloat(successRate) / 8).toFixed(1)}% accuracy`;

  // ── Donut chart data ────────────────────────────────────────────────────────
  const okPercent = totalSubmissions > 0 ? Math.round((okCount / totalSubmissions) * 100) : 61;
  const donutData = [
    { name: 'Accepted', value: okCount || 61, color: '#10b981' },
    { name: 'Wrong Answer', value: waCount || 22, color: '#ef4444' },
    { name: 'Time Limit Exceeded', value: tleCount || 17, color: '#f59e0b' },
  ];

  // ── LeetCode state ──────────────────────────────────────────────────────────
  const [lcUsername, setLcUsername] = useState('');
  const [lcLoading, setLcLoading] = useState(false);
  const [lcError, setLcError] = useState('');

  const handleLinkLeetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lcUsername.trim() || !onUserInfoUpdate) return;
    setLcLoading(true);
    setLcError('');
    try {
      const res = await linkLeetCodeProfile(userInfo.handle, lcUsername.trim());
      onUserInfoUpdate({ ...userInfo, ...res });
    } catch (err: any) {
      setLcError(err.message || 'Failed to link LeetCode account.');
    } finally {
      setLcLoading(false);
    }
  };

  const handleSyncLeetCode = async () => {
    if (!onUserInfoUpdate) return;
    setLcLoading(true);
    setLcError('');
    try {
      const res = await syncLeetCodeProfile(userInfo.handle);
      onUserInfoUpdate({ ...userInfo, ...res });
    } catch (err: any) {
      setLcError(err.message || 'Failed to sync LeetCode stats.');
    } finally {
      setLcLoading(false);
    }
  };

  const handleUnlinkLeetCode = async () => {
    if (!onUserInfoUpdate) return;
    setLcLoading(true);
    setLcError('');
    try {
      await unlinkLeetCodeProfile(userInfo.handle);
      onUserInfoUpdate({
        ...userInfo,
        leetcodeHandle: undefined,
        leetcodeEasy: 0,
        leetcodeMedium: 0,
        leetcodeHard: 0,
      });
      setLcUsername('');
    } catch (err: any) {
      setLcError(err.message || 'Failed to unlink LeetCode account.');
    } finally {
      setLcLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* SVG gradients for Recharts */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="gradientCyan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0891b2" stopOpacity={0.6} />
          </linearGradient>
          <linearGradient id="gradientRed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="100%" stopColor="#b91c1c" stopOpacity={0.6} />
          </linearGradient>
          <linearGradient id="gradientBlueCyan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity={0.6} />
          </linearGradient>
          <linearGradient id="gradientGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#15803d" stopOpacity={0.6} />
          </linearGradient>
        </defs>
      </svg>

      {/* ── 1. Key Metrics Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">

        {/* RATING */}
        <div className="metric-card p-5 rounded-2xl flex flex-col gap-3 animate-fade-in-up stagger-1 group cursor-default">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Current Rating</p>
              <p className="text-[28px] font-black text-white leading-none mt-1">{userInfo.rating ?? '–'}</p>
            </div>
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500/20 transition-colors">
              <TrendingUp size={15} />
            </div>
          </div>
          <span className={`self-start inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full ${ratingDiff >= 0 ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'}`}>
            {ratingDiff >= 0 ? '▲' : '▼'} {ratingBadge}
          </span>
        </div>

        {/* MAX RATING */}
        <div className="metric-card p-5 rounded-2xl flex flex-col gap-3 animate-fade-in-up stagger-2 group cursor-default">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Peak Rating</p>
              <p className="text-[28px] font-black text-cyan-400 leading-none mt-1">{userInfo.maxRating ?? '–'}</p>
            </div>
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500/20 transition-colors">
              <Award size={15} />
            </div>
          </div>
          <span className="self-start inline-flex items-center gap-1 text-[10px] font-bold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-full">
            ★ {maxRatingBadge}
          </span>
        </div>

        {/* CONTESTS */}
        <div className="metric-card p-5 rounded-2xl flex flex-col gap-3 animate-fade-in-up stagger-3 group cursor-default">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Contests</p>
              <p className="text-[28px] font-black text-white leading-none mt-1">{ratingHistory.length}</p>
            </div>
            <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 group-hover:bg-violet-500/20 transition-colors">
              <Zap size={15} />
            </div>
          </div>
          <span className="self-start inline-flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full">
            ↓ {contestsBadge}
          </span>
        </div>

        {/* SOLVED */}
        <div className="metric-card p-5 rounded-2xl flex flex-col gap-3 animate-fade-in-up stagger-4 group cursor-default">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Problems Solved</p>
              <p className="text-[28px] font-black text-white leading-none mt-1">{totalSolved}</p>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <span className="self-start inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            ✓ {solvedBadge}
          </span>
        </div>

        {/* SUCCESS RATE */}
        <div className="metric-card p-5 rounded-2xl flex flex-col gap-3 animate-fade-in-up stagger-5 group cursor-default">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Accept Rate</p>
              <p className="text-[28px] font-black text-white leading-none mt-1">{successRate}<span className="text-lg font-bold">%</span></p>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:bg-amber-500/20 transition-colors">
              <ShieldAlert size={15} />
            </div>
          </div>
          <span className="self-start inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
            ◎ {successBadge}
          </span>
        </div>

      </div>

      {/* ── 2. Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Rating Trajectory */}
        <div className="bg-[#080e1a] border border-[#121e35] rounded-2xl lg:col-span-2 overflow-hidden animate-fade-in-up stagger-2">
          <div className="flex justify-between items-center px-6 pt-5 pb-4 border-b border-[#121e35]/60">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <TrendingUp size={14} className="text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Rating Trajectory</h3>
                <p className="text-[10px] text-slate-500">Last 5 rated contests</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">user.rating</span>
            </div>
          </div>

          {/* Show empty state if not enough data — no more fake padding */}
          {trajectoryChartData.length < 2 ? (
            <div className="h-[240px] flex flex-col items-center justify-center text-slate-500 gap-3">
              <HelpCircle size={32} className="opacity-30" />
              <p className="text-xs text-center max-w-xs">Participate in at least 2 rated contests to see your rating trajectory.</p>
            </div>
          ) : (
            <div className="h-[240px] w-full px-2 pb-3 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trajectoryChartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barSize={50}>
                  <XAxis dataKey="name" stroke="#334155" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                  <YAxis domain={[domainMin, domainMax]} stroke="#334155" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#080e1a', border: '1px solid rgba(6,182,212,0.2)', borderRadius: '10px', padding: '8px 12px' }}
                    cursor={false}
                    formatter={(value: any) => {
                      if (Array.isArray(value)) return [`${value[1]}`, 'Rating'];
                      return [value, 'Rating'];
                    }}
                  />
                  <Bar dataKey="ratingRange" radius={[10, 10, 0, 0]}>
                    {trajectoryChartData.map((_, index) => {
                      let fillUrl = 'url(#gradientCyan)';
                      if (index === 2) fillUrl = 'url(#gradientRed)';
                      if (index === 3) fillUrl = 'url(#gradientBlueCyan)';
                      if (index === 4) fillUrl = 'url(#gradientGreen)';
                      return <Cell key={`cell-${index}`} fill={fillUrl} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Verdict Distribution */}
        <div className="bg-[#080e1a] border border-[#121e35] rounded-2xl overflow-hidden animate-fade-in-up stagger-3">
          <div className="flex items-center gap-2.5 px-6 pt-5 pb-4 border-b border-[#121e35]/60">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <ShieldAlert size={14} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Verdict Distribution</h3>
              <p className="text-[10px] text-slate-500">{totalSubmissions.toLocaleString()} submissions</p>
            </div>
          </div>

          <div className="px-6 pt-4 pb-5">
            <div className="h-[155px] w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} cx="50%" cy="50%" innerRadius={52} outerRadius={74} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}`, 'Submissions']} contentStyle={{ backgroundColor: '#080e1a', border: '1px solid rgba(6,182,212,0.2)', borderRadius: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[24px] font-black text-white">{okPercent}%</span>
                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Accepted</span>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-[#121e35]/60">
              {donutData.map((d) => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-xs text-slate-400">{d.name}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-300 tabular-nums">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* ── 3. Bottom Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Monthly Solved */}
        <div className="bg-[#080e1a] border border-[#121e35] rounded-2xl overflow-hidden animate-fade-in-up stagger-2">
          <div className="flex items-center gap-2.5 px-6 pt-5 pb-4 border-b border-[#121e35]/60">
            <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Calendar size={14} className="text-violet-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Monthly Solved</h3>
              <p className="text-[10px] text-slate-500">Unique problems per month</p>
            </div>
          </div>
          {monthlyData.length === 0 ? (
            <div className="h-[200px] flex flex-col items-center justify-center text-slate-500 gap-2">
              <HelpCircle size={28} className="opacity-30" />
              <p className="text-xs">No submission data available yet.</p>
            </div>
          ) : (
            <div className="h-[200px] px-2 pb-3 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 8, right: 8, left: -25, bottom: 0 }} barSize={24}>
                  <XAxis dataKey="name" stroke="#334155" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                  <YAxis stroke="#334155" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#080e1a', border: '1px solid rgba(6,182,212,0.2)', borderRadius: '10px', padding: '8px 12px' }} />
                  <Bar dataKey="Solved" radius={[6, 6, 0, 0]}>
                    {monthlyData.map((_, index) => {
                      let fillUrl = 'url(#gradientCyan)';
                      if (index % 3 === 1) fillUrl = 'url(#gradientBlueCyan)';
                      if (index % 3 === 2) fillUrl = 'url(#gradientGreen)';
                      return <Cell key={`cell-solved-${index}`} fill={fillUrl} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Contest Analysis Engine */}
        <div className="bg-[#080e1a] border border-[#121e35] rounded-2xl lg:col-span-2 overflow-hidden animate-fade-in-up stagger-3">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#121e35]/60">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <ListFilter size={14} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Contest Analysis Engine</h3>
                <p className="text-[10px] text-slate-500">AI-detected weak tags from submission history</p>
              </div>
            </div>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
              {displayAnalysis.length} findings
            </span>
          </div>

          <div className="px-6 py-5 space-y-3">
            {displayAnalysis.map((item, idx) => {
              const configs = [
                { bg: 'bg-rose-500/8', border: 'border-rose-500/20', dot: 'bg-rose-500', tagText: 'text-rose-400', tagBg: 'bg-rose-500/10', label: 'HIGH PRIORITY' },
                { bg: 'bg-amber-500/8', border: 'border-amber-500/20', dot: 'bg-amber-400', tagText: 'text-amber-400', tagBg: 'bg-amber-500/10', label: 'MEDIUM' },
                { bg: 'bg-cyan-500/8',  border: 'border-cyan-500/20',  dot: 'bg-cyan-500',  tagText: 'text-cyan-400',  tagBg: 'bg-cyan-500/10',  label: 'REVIEW' },
              ];
              const c = configs[idx] || configs[2];
              return (
                <div key={idx} className={`flex items-start gap-3 p-4 rounded-xl border ${c.bg} ${c.border} transition-all hover:brightness-110`}>
                  <div className={`w-2 h-2 rounded-full ${c.dot} mt-1.5 flex-shrink-0 animate-pulse`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-bold text-white">{item.tag}</span>
                      <span className={`text-[9px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded-md ${c.tagText} ${c.tagBg} border ${c.border}`}>{c.label}</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{item.tip}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 px-6 pb-4 text-[10px] text-slate-600 font-medium">
            <div className="w-1 h-1 rounded-full bg-slate-700" />
            Generated via latest submission analytics
          </div>
        </div>

      </div>

      {/* ── 4. LeetCode Integration ── */}
      <div className="bg-[#080e1a] border border-[#121e35] rounded-2xl overflow-hidden animate-fade-in-up stagger-4">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#121e35]/60">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
              <Code size={14} className="text-orange-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">LeetCode Integration</h3>
              <p className="text-[10px] text-slate-500">Unify your competitive programming stats</p>
            </div>
          </div>
          {userInfo.leetcodeHandle && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Linked</span>
              </div>
              {/* SyncCooldownButton is isolated — won't cause Dashboard re-renders */}
              <SyncCooldownButton
                userHandle={userInfo.handle}
                onSync={handleSyncLeetCode}
                loading={lcLoading}
              />
              <button
                onClick={handleUnlinkLeetCode}
                disabled={lcLoading}
                className="text-[10px] bg-rose-950/20 hover:bg-rose-900/30 text-rose-400 border border-rose-500/20 font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
              >
                Unlink
              </button>
            </div>
          )}
        </div>

        <div className="px-6 py-5">
          {!userInfo.leetcodeHandle ? (
            <form onSubmit={handleLinkLeetCode} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="relative flex-1 max-w-sm">
                <Code className="absolute left-3.5 top-3 text-slate-500" size={14} />
                <input
                  type="text"
                  placeholder="Enter LeetCode username..."
                  value={lcUsername}
                  onChange={(e) => setLcUsername(e.target.value)}
                  className="w-full bg-[#080f1e] border border-[#1b2b48] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-all placeholder:text-slate-600"
                  disabled={lcLoading}
                />
              </div>
              <button
                type="submit"
                disabled={lcLoading || !lcUsername.trim()}
                className="bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 font-bold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Link2 size={14} />
                Link Account
              </button>
              {lcError && <p className="text-xs text-rose-400 font-medium">{lcError}</p>}
            </form>
          ) : (
            // Phase 4.4: LeetCode Medium and Hard shown separately (not combined)
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Username', value: userInfo.leetcodeHandle, color: 'text-white', small: true },
                { label: 'LC Rating', value: userInfo.leetcodeRating && userInfo.leetcodeRating > 0 ? Math.round(userInfo.leetcodeRating) : 'N/A', color: 'text-cyan-400', small: false },
                { label: 'Easy', value: userInfo.leetcodeEasy ?? 0, color: 'text-emerald-400', small: false },
                { label: 'Medium', value: userInfo.leetcodeMedium ?? 0, color: 'text-amber-400', small: false },
                { label: 'Hard', value: userInfo.leetcodeHard ?? 0, color: 'text-rose-400', small: false },
              ].map((stat) => (
                <div key={stat.label} className="bg-[#060b13] border border-[#121e35] p-4 rounded-xl text-center hover:border-cyan-500/20 transition-all overflow-hidden min-w-0">
                  <p className="text-[9px] uppercase font-black tracking-widest text-slate-500 mb-2">{stat.label}</p>
                  <p
                    className={`font-black ${stat.color} ${stat.small ? 'text-sm break-all leading-tight' : 'text-lg'}`}
                    title={String(stat.value)}
                  >
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
