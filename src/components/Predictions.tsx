import React, { useState } from 'react';
import type { CFUserInfo, CFRatingChange } from '../api/codeforces';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid, Area, AreaChart } from 'recharts';
import { Target, Compass, Award, HelpCircle, TrendingUp, Zap, CheckCircle2, Lock } from 'lucide-react';

interface PredictionsProps {
  userInfo: CFUserInfo;
  ratingHistory: CFRatingChange[];
}

export const Predictions: React.FC<PredictionsProps> = ({ userInfo, ratingHistory }) => {
  const currentRating = userInfo.rating || 1200;
  const [targetRating, setTargetRating] = useState<number>(Math.min(currentRating + 200, 3000));

  // 1. Average of individual contest deltas
  const lastContests = ratingHistory.slice(-5);
  let averageGain = 15;
  if (lastContests.length >= 2) {
    const deltas = lastContests.map(c => c.newRating - c.oldRating);
    averageGain = Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length);
  }
  if (averageGain === 0) averageGain = 5;

  // 2. Build chart data
  const chartData = ratingHistory.map((c, i) => ({
    contestIndex: i + 1,
    name: `R${i + 1}`,
    actual: c.newRating,
    predicted: null as number | null,
    contestName: c.contestName,
  }));

  const lastActualIndex = chartData.length;
  let runningRating = currentRating;
  const predictionData = [...chartData];
  if (predictionData.length > 0) predictionData[predictionData.length - 1].predicted = currentRating;

  for (let i = 1; i <= 6; i++) {
    runningRating += averageGain;
    predictionData.push({
      contestIndex: lastActualIndex + i,
      name: `+${i}`,
      actual: null as any,
      predicted: runningRating,
      contestName: `Simulated Contest #${i}`,
    });
  }

  // 3. Milestones
  const ranksList = [
    { name: 'Newbie',               rating: 0,    color: 'text-slate-400',   glow: '#94a3b8', border: 'border-slate-700' },
    { name: 'Pupil',                rating: 1200, color: 'text-green-400',   glow: '#4ade80', border: 'border-green-500/30' },
    { name: 'Specialist',           rating: 1400, color: 'text-cyan-400',    glow: '#22d3ee', border: 'border-cyan-500/30' },
    { name: 'Expert',               rating: 1600, color: 'text-blue-400',    glow: '#60a5fa', border: 'border-blue-500/30' },
    { name: 'Candidate Master',     rating: 1900, color: 'text-violet-400',  glow: '#a78bfa', border: 'border-violet-500/30' },
    { name: 'Master',               rating: 2100, color: 'text-orange-400',  glow: '#fb923c', border: 'border-orange-500/30' },
    { name: 'Grandmaster',          rating: 2400, color: 'text-red-400',     glow: '#f87171', border: 'border-red-500/30' },
    { name: 'Legendary GM',         rating: 3000, color: 'text-rose-400',    glow: '#fb7185', border: 'border-rose-500/40' },
  ];

  const ratingDiff = targetRating - currentRating;
  const estContestsNeeded = ratingDiff > 0 && averageGain > 0 ? Math.ceil(ratingDiff / averageGain) : 0;
  const estProblemsNeeded = ratingDiff > 0 ? Math.ceil((ratingDiff / 100) * 12) : 0;
  const targetMilestone = ranksList.slice().reverse().find(r => r.rating <= targetRating);
  const nextMilestone = ranksList.find(r => r.rating > currentRating);
  const progressToNext = nextMilestone
    ? Math.min(100, ((currentRating - (ranksList[ranksList.indexOf(nextMilestone) - 1]?.rating || 0)) /
      (nextMilestone.rating - (ranksList[ranksList.indexOf(nextMilestone) - 1]?.rating || 0))) * 100)
    : 100;

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* ── Rank Progress Hero ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0a0f1e] to-[#060b14] border border-[#1b2b48] rounded-2xl p-6">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row gap-6 items-start lg:items-center">
          {/* Current rank info */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center">
                <TrendingUp size={18} className="text-cyan-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-extrabold text-slate-500">Current standing</p>
                <p className="text-sm font-black text-white">{userInfo.rank || 'Unranked'}</p>
              </div>
            </div>
            {/* Progress bar to next rank */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-500">
                <span>{currentRating} pts</span>
                <span className="font-bold text-cyan-400">{nextMilestone ? `→ ${nextMilestone.name} @ ${nextMilestone.rating}` : 'Max rank achieved!'}</span>
              </div>
              <div className="relative h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-cyan-300 transition-all duration-700 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                  style={{ width: `${progressToNext}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-black text-white drop-shadow">{Math.round(progressToNext)}%</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-600">{nextMilestone ? `${nextMilestone.rating - currentRating} points to go` : ''}</p>
            </div>
          </div>

          {/* Stat pills */}
          <div className="flex gap-3 flex-wrap">
            <div className="bg-[#060b13] border border-[#1b2b48] rounded-xl px-4 py-3 text-center min-w-[90px]">
              <p className="text-[10px] text-slate-500 uppercase font-bold">Current</p>
              <p className="text-xl font-black text-white">{currentRating}</p>
            </div>
            <div className="bg-cyan-500/8 border border-cyan-500/20 rounded-xl px-4 py-3 text-center min-w-[90px]">
              <p className="text-[10px] text-cyan-400 uppercase font-bold">Peak</p>
              <p className="text-xl font-black text-cyan-400">{userInfo.maxRating || currentRating}</p>
            </div>
            <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-4 py-3 text-center min-w-[90px]">
              <p className="text-[10px] text-emerald-400 uppercase font-bold">Trend</p>
              <p className={`text-xl font-black ${averageGain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {averageGain >= 0 ? '+' : ''}{averageGain}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Goal Estimator ─────────────────────────────────────────────────── */}
      <div className="bg-[#080e1a] border border-[#121e35] rounded-2xl overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-[#121e35]/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Target size={15} className="text-violet-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Goal Estimator</h3>
              <p className="text-[10px] text-slate-500">Drag to set target · see how long it'll take</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="bg-[#060b13] border border-[#1b2b48] px-3 py-1.5 rounded-lg text-center">
              <span className="text-[9px] text-slate-500 block uppercase font-bold">Now</span>
              <span className="text-sm font-black text-white">{currentRating}</span>
            </div>
            <div className="bg-violet-500/10 border border-violet-500/25 px-3 py-1.5 rounded-lg text-center">
              <span className="text-[9px] text-violet-400 block uppercase font-bold">Target</span>
              <span className="text-sm font-black text-violet-300">{targetRating}</span>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Slider */}
          <div className="space-y-2">
            <input
              type="range"
              min={Math.max(800, currentRating - 200)}
              max={Math.min(3000, currentRating + 800)}
              value={targetRating}
              onChange={(e) => setTargetRating(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-900 rounded-full appearance-none cursor-pointer accent-violet-500"
            />
            <div className="flex justify-between text-[10px] text-slate-600">
              <span>{Math.max(800, currentRating - 200)}</span>
              <span>Current: {currentRating}</span>
              <span>{Math.min(3000, currentRating + 800)}</span>
            </div>
          </div>

          {/* Estimate cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: Compass, color: 'cyan',
                label: 'Contests Needed',
                value: ratingDiff <= 0 ? '✓ Done' : `${estContestsNeeded}`,
                sub: ratingDiff <= 0 ? 'Target already reached!' : `At avg ${averageGain >= 0 ? '+' : ''}${averageGain}/contest`,
              },
              {
                icon: Zap, color: 'emerald',
                label: 'Practice Problems',
                value: ratingDiff <= 0 ? '✓ Done' : `${estProblemsNeeded}`,
                sub: ratingDiff <= 0 ? 'Keep the streak going' : `~12 problems per +100 rating`,
              },
              {
                icon: Award, color: 'amber',
                label: 'Target Milestone',
                value: targetMilestone?.name || 'Legend',
                sub: `Rating threshold: ${targetMilestone?.rating ?? 3000}`,
              },
            ].map(({ icon: Icon, color, label, value, sub }) => (
              <div key={label} className={`relative overflow-hidden bg-${color}-500/5 border border-${color}-500/15 rounded-xl p-4 space-y-2 hover:border-${color}-500/30 transition-all`}>
                <div className={`absolute top-0 right-0 w-20 h-20 bg-${color}-500/5 rounded-full blur-2xl`} />
                <div className="relative">
                  <div className={`w-8 h-8 rounded-lg bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center mb-3`}>
                    <Icon size={15} className={`text-${color}-400`} />
                  </div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{label}</p>
                  <p className={`text-2xl font-black text-${color}-300 mt-1 leading-none`}>{value}</p>
                  <p className="text-[11px] text-slate-500 mt-1">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Predictive Chart ───────────────────────────────────────────────── */}
      <div className="bg-[#080e1a] border border-[#121e35] rounded-2xl overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-[#121e35]/70 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <TrendingUp size={15} className="text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Predictive Rating Curve</h3>
              <p className="text-[10px] text-slate-500">Historical + 6-contest AI projection</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-cyan-400 rounded" /><span>Historical</span></div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-emerald-400 rounded border-dashed" style={{borderTop:'2px dashed #34d399',height:0}} /><span>Projected</span></div>
          </div>
        </div>

        <div className="px-4 py-4">
          {ratingHistory.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={predictionData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                  <XAxis dataKey="name" stroke="#334155" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                  <YAxis domain={['dataMin - 100', 'dataMax + 200']} stroke="#334155" fontSize={11} tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#080e1a', border: '1px solid rgba(6,182,212,0.2)', borderRadius: '10px', padding: '8px 12px' }}
                    formatter={(value, name) => [value, name === 'actual' ? '📊 Historical' : '🔮 Projected']}
                  />
                  <ReferenceLine y={currentRating} stroke="rgba(6,182,212,0.3)" strokeDasharray="4 4" />
                  <ReferenceLine y={targetRating} stroke="rgba(167,139,250,0.4)" strokeDasharray="4 4" label={{ value: 'Target', fill: '#a78bfa', fontSize: 10, position: 'insideTopRight' }} />
                  <Line type="monotone" dataKey="actual" stroke="#22d3ee" strokeWidth={2.5} dot={{ r: 3, fill: '#22d3ee', strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls />
                  <Line type="monotone" dataKey="predicted" stroke="#34d399" strokeWidth={2} strokeDasharray="5 4" dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center gap-3 text-slate-500">
              <HelpCircle size={36} className="opacity-30" />
              <p className="text-sm">Participate in at least 1 rated contest to see your forecast.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── CF Milestones Grid ─────────────────────────────────────────────── */}
      <div className="bg-[#080e1a] border border-[#121e35] rounded-2xl overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-[#121e35]/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Award size={15} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">CF Rank Milestones</h3>
              <p className="text-[10px] text-slate-500">Your journey through the Codeforces ranking system</p>
            </div>
          </div>
        </div>

        <div className="p-5 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
          {ranksList.filter(r => r.rating > 0).map((rank, idx) => {
            const isEarned = currentRating >= rank.rating;
            const isNext = !isEarned && ranksList.filter(r => r.rating > 0)[idx - 1] && currentRating >= ranksList.filter(r => r.rating > 0)[idx - 1].rating;
            const dist = rank.rating - currentRating;

            return (
              <div
                key={idx}
                className={`relative overflow-hidden rounded-xl border p-4 transition-all ${
                  isEarned
                    ? `${rank.border} bg-gradient-to-br from-slate-900/80 to-[#060b13]`
                    : isNext
                    ? `${rank.border} bg-gradient-to-br from-slate-900/60 to-[#060b13] ring-1 ring-inset ring-white/5`
                    : 'border-slate-800/60 bg-[#060b13] opacity-60'
                }`}
              >
                {isEarned && (
                  <div className="absolute top-2 right-2">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                  </div>
                )}
                {!isEarned && !isNext && (
                  <div className="absolute top-2 right-2">
                    <Lock size={12} className="text-slate-700" />
                  </div>
                )}
                {isNext && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
                )}
                <div className="space-y-2">
                  <p className={`text-xs font-extrabold uppercase tracking-wide ${isEarned ? rank.color : isNext ? rank.color : 'text-slate-600'}`}>
                    {rank.name}
                  </p>
                  <p className="text-lg font-black text-white">{rank.rating}</p>
                  {isEarned ? (
                    <p className="text-[10px] text-emerald-400 font-bold">✓ Earned</p>
                  ) : (
                    <p className="text-[10px] text-slate-600">+{dist} pts</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
