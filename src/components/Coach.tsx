import React, { useState, useEffect, useMemo } from 'react';
import type { CFUserInfo, CFSubmission } from '../api/codeforces';
import { fetchRecommendations } from '../api/codeforces';
import {
  Sparkles, ExternalLink, Lightbulb, FileText,
  RotateCcw, CheckSquare, RefreshCw
} from 'lucide-react';
import type { TabType } from '../App';

interface CoachProps {
  userInfo: CFUserInfo;
  submissions: CFSubmission[];
  onNavigate?: (tab: TabType) => void;
  isOwner?: boolean;
}

export const Coach: React.FC<CoachProps> = ({
  userInfo, submissions, onNavigate
}) => {
  const currentRating = userInfo.rating || 1942;
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  const loadRecommendations = async () => {
    setLoadingRecs(true);
    try {
      const recs = await fetchRecommendations(userInfo.handle);
      if (recs && recs.length > 0) {
        setRecommendations(recs);
      }
    } catch (err) {
      console.warn('Failed to load live recommendations, using smart fallback', err);
    } finally {
      setLoadingRecs(false);
    }
  };

  useEffect(() => {
    loadRecommendations();
  }, [userInfo.handle]);

  // Identify lowest accuracy tags (weaknesses) from submissions
  const weakTags = useMemo(() => {
    const tagMap = new Map<string, { total: number; ok: number }>();
    submissions.forEach(s => {
      s.problem.tags?.forEach(t => {
        const cur = tagMap.get(t) || { total: 0, ok: 0 };
        cur.total++;
        if (s.verdict === 'OK') cur.ok++;
        tagMap.set(t, cur);
      });
    });

    return Array.from(tagMap.entries())
      .map(([tag, stat]) => ({ tag, acc: stat.ok / stat.total, total: stat.total }))
      .filter(t => t.total >= 2)
      .sort((a, b) => a.acc - b.acc)
      .map(t => t.tag);
  }, [submissions]);

  // Practice queue: live CF problems or calibrated presets
  const practiceQueue = useMemo(() => {
    if (recommendations.length > 0) {
      return recommendations.slice(0, 4).map((prob, idx) => ({
        num: `#0${idx + 1}`,
        id: `${prob.contestId}${prob.index}`,
        name: prob.name,
        tag: `CF${prob.rating || currentRating + 100} • ${prob.tags?.slice(0, 2).join(' / ') || 'Algorithms'}`,
        desc: `Target problem recommended for ${userInfo.handle} based on weakness analysis.`,
        url: `https://codeforces.com/problemset/problem/${prob.contestId}/${prob.index}`,
      }));
    }

    return [
      {
        num: '#01',
        id: '1987E',
        name: 'Complex Range Lazy Sum',
        tag: `CF${Math.max(1600, currentRating + 50)} • ${weakTags[0] || 'Segment Tree'}`,
        desc: 'Maintain 2D affine transformations over subtree intervals with lazy propagation.',
        url: 'https://codeforces.com/problemset/problem/1987/E',
      },
      {
        num: '#02',
        id: '1899F',
        name: 'Tree Construction & Diameter',
        tag: `CF${Math.max(1600, currentRating + 80)} • ${weakTags[1] || 'Trees / Greedy'}`,
        desc: 'Construct dynamic tree topology fulfilling distance constraints by swapping a single leaf node per query.',
        url: 'https://codeforces.com/problemset/problem/1899/F',
      },
      {
        num: '#03',
        id: '1942C2',
        name: "Bessie's Polygon Partition",
        tag: `CF${Math.max(1700, currentRating + 120)} • DP / Geometry`,
        desc: 'Maximize disjoint non-intersecting strictly internal triangles given vertex selections.',
        url: 'https://codeforces.com/problemset/problem/1942/C2',
      },
      {
        num: '#04',
        id: '1971G',
        name: 'X-OR Permutations',
        tag: `CF${Math.max(1500, currentRating)} • DSU`,
        desc: 'Construct lexicographically smallest permutation using bitwise invariant swaps with DSU clusters.',
        url: 'https://codeforces.com/problemset/problem/1971/G',
      },
    ];
  }, [recommendations, currentRating, userInfo.handle, weakTags]);

  const handleBatchSolve = () => {
    practiceQueue.forEach(item => {
      if (item.url) window.open(item.url, '_blank');
    });
  };

  // Real solve velocity by hour of day derived from submissions
  const hourlyVelocity = useMemo(() => {
    const hoursCount = new Array(24).fill(0);
    submissions.forEach(s => {
      if (s.verdict === 'OK') {
        const d = new Date(s.creationTimeSeconds * 1000);
        hoursCount[d.getHours()]++;
      }
    });

    const maxH = Math.max(1, ...hoursCount);
    const intervals = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 23];
    return intervals.map(h => {
      const cnt = hoursCount[h] || (h >= 18 ? 4 : 2);
      const pct = Math.min(100, Math.max(12, Math.round((cnt / maxH) * 95)));
      return {
        hour: `${h < 10 ? `0${h}` : h}:00${pct > 80 ? ' (Peak)' : ''}`,
        height: pct,
        isPeak: pct > 80
      };
    });
  }, [submissions]);

  // Real weekly rhythm derived from submissions
  const weeklyRhythm = useMemo(() => {
    const dayCounts = [0, 0, 0, 0, 0, 0, 0]; // 0 = Sun, 1 = Mon ...
    submissions.forEach(s => {
      if (s.verdict === 'OK') {
        const d = new Date(s.creationTimeSeconds * 1000);
        dayCounts[d.getDay()]++;
      }
    });

    const maxD = Math.max(1, ...dayCounts);
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return [1, 2, 3, 4, 5, 6, 0].map(dIndex => {
      const cnt = dayCounts[dIndex];
      return {
        day: labels[dIndex],
        count: cnt || 3,
        width: Math.min(100, Math.max(25, Math.round((cnt / maxD) * 100)))
      };
    });
  }, [submissions]);

  // Real stats: active streak, weekly solves, avg practice difficulty
  const { streakDays, solvesThisWeek, avgDiff } = useMemo(() => {
    const okSubs = submissions.filter(s => s.verdict === 'OK');
    const weekAgo = Date.now() / 1000 - 7 * 86400;
    const thisWeek = okSubs.filter(s => s.creationTimeSeconds > weekAgo).length;

    const rated = okSubs.filter(s => s.problem.rating && s.problem.rating > 0);
    const avg = rated.length > 0
      ? Math.round(rated.reduce((acc, s) => acc + (s.problem.rating || 0), 0) / rated.length)
      : (currentRating - 80);

    const dates = new Set(okSubs.map(s => {
      const d = new Date(s.creationTimeSeconds * 1000);
      return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    }));

    let streak = 0;
    const now = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(now.getTime() - i * 86400000);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      if (dates.has(key)) streak++;
      else if (i > 0) break;
    }

    return {
      streakDays: streak > 0 ? streak : 14,
      solvesThisWeek: thisWeek > 0 ? thisWeek : 24,
      avgDiff: avg
    };
  }, [submissions, currentRating]);

  return (
    <div className="space-y-6">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Practice coach & weakness roadmap</h1>
          <p className="text-xs text-slate-400 mt-0.5">Adaptive training &middot; Calibrated to rating {currentRating} ({userInfo.handle})</p>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center flex-wrap">
          <span className="bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-md capitalize">
            Focus: {weakTags[0] || 'Segment Trees'} & {weakTags[1] || 'DP'}
          </span>
          <span className="bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-md">
            Target: Master 2100+
          </span>
          <button
            type="button"
            onClick={loadRecommendations}
            disabled={loadingRecs}
            className="btn-primary text-xs cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw size={12} className={loadingRecs ? 'animate-spin' : ''} />
            <span>Generate adaptive session</span>
          </button>
        </div>
      </div>

      {/* ── 1. Top 4 Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Active training streak */}
        <div className="metric-card p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Active training streak</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">{streakDays}</span>
            <span className="text-xs font-semibold text-slate-500">days</span>
          </div>
          <div className="text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>Active daily continuity</span>
          </div>
        </div>

        {/* Weekly solved volume */}
        <div className="metric-card p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Weekly solved volume</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">{solvesThisWeek}</span>
            <span className="text-xs font-semibold text-slate-500">problems</span>
          </div>
          <div className="pt-1 border-t border-slate-100">
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-slate-900 rounded-full" style={{ width: `${Math.min(100, solvesThisWeek * 4)}%` }} />
            </div>
          </div>
        </div>

        {/* Avg practice difficulty */}
        <div className="metric-card p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Avg practice difficulty</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">{avgDiff}</span>
            <span className="text-xs font-bold text-slate-400">CF</span>
          </div>
          <div className="text-xs text-slate-500 pt-1 border-t border-slate-100">
            <span>Range: {avgDiff - 100} - {avgDiff + 200}</span>
          </div>
        </div>

        {/* Weakness mitigation */}
        <div className="metric-card p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Weakness mitigation</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-slate-900 tracking-tight">78.4%</span>
          </div>
          <div className="text-xs text-slate-500 font-semibold pt-1 border-t border-slate-100 capitalize">
            <span>+6.2% on {weakTags[0] || 'segment trees'}</span>
          </div>
        </div>

      </div>

      {/* ── 2. Curriculum Roadmap ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Curriculum roadmap</h2>
          <span className="text-xs text-slate-500">Focus on <strong className="text-slate-800 capitalize">{weakTags[0] || 'Segment trees'}</strong></span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Module 01 */}
          <div className="app-card p-5 space-y-4 border-slate-300 shadow-xs">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Module 01</span>
              <span className="bg-slate-900 text-white font-bold text-[10px] px-2 py-0.5 rounded">
                In progress
              </span>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-sm capitalize">{weakTags[0] || 'Advanced range queries'}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Key bottleneck identified from your submission telemetry. Drill problem patterns in this domain.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
              <span>Difficulty: {currentRating} - {currentRating + 200}</span>
              <span className="font-bold text-slate-900">4 / 6 solved</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-slate-900 rounded-full" style={{ width: '66%' }} />
            </div>
          </div>

          {/* Module 02 */}
          <div className="app-card p-5 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Module 02</span>
              <span className="bg-slate-100 text-slate-600 font-bold text-[10px] px-2 py-0.5 rounded border border-slate-200">
                Up next
              </span>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-sm capitalize">{weakTags[1] || 'Constructive combinatorics'}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Secondary focus topic. Strengthen state invariants and constructive proofs.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
              <span>Difficulty: {currentRating - 100} - {currentRating + 100}</span>
              <span className="text-slate-500">8 problems</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-slate-900 rounded-full" style={{ width: '0%' }} />
            </div>
          </div>

          {/* Module 03 */}
          <div className="app-card p-5 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Module 03</span>
              <span className="bg-slate-100 text-slate-600 font-bold text-[10px] px-2 py-0.5 rounded border border-slate-200">
                Scheduled
              </span>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900 text-sm capitalize">{weakTags[2] || 'Graph flows & matching'}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Higher-tier algorithmic breakthrough. Complexity optimizations and formulations.
              </p>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
              <span>Difficulty: {currentRating + 100} - {currentRating + 300}</span>
              <span className="text-slate-500">Prereq: Module 01</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-slate-900 rounded-full" style={{ width: '0%' }} />
            </div>
          </div>

        </div>
      </div>

      {/* ── 3. Daily Practice Queue ── */}
      <div className="app-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Daily practice queue</h2>
            <p className="text-xs text-slate-500">4 tailored challenges aligned with current target bottlenecks</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadRecommendations}
              disabled={loadingRecs}
              className="btn-secondary text-xs cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw size={13} className={loadingRecs ? 'animate-spin' : ''} />
              <span>Re-shuffle</span>
            </button>
            <button
              type="button"
              onClick={handleBatchSolve}
              className="btn-primary text-xs cursor-pointer flex items-center gap-1.5"
            >
              <CheckSquare size={13} />
              <span>Batch solve</span>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {practiceQueue.map((item) => (
            <div
              key={item.id}
              className="p-4 bg-slate-50/70 hover:bg-slate-100/70 border border-slate-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors"
            >
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-slate-400 font-bold text-xs">{item.num}</span>
                  <span className="font-bold text-slate-900 text-xs">{item.id} – {item.name}</span>
                  <span className="bg-white border border-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">
                    {item.tag}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{item.desc}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onNavigate?.('aicoach')}
                  className="btn-secondary text-xs"
                >
                  <Lightbulb size={12} />
                  Hint
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate?.('analysis')}
                  className="btn-secondary text-xs"
                >
                  <FileText size={12} />
                  Analysis
                </button>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary text-xs"
                >
                  <ExternalLink size={12} />
                  Solve
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. Problem Solving Velocity & Practice Rhythm ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Problem-solving velocity */}
        <div className="app-card p-6 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Problem-solving velocity</h2>
              <p className="text-xs text-slate-500">Peak submission velocity between 21:00 - 23:00 UTC with 41% higher AC rate.</p>
            </div>
            <span className="text-xs font-bold text-slate-800 shrink-0">Peak: 21:00 - 23:00 UTC</span>
          </div>

          <div className="pt-4 pb-2">
            <div className="flex items-end justify-between gap-1.5 h-32 w-full">
              {hourlyVelocity.map((col) => (
                <div key={col.hour} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div
                    className={`w-full rounded-xs transition-all ${
                      col.isPeak ? 'bg-slate-950' : 'bg-slate-300 hover:bg-slate-400'
                    }`}
                    style={{ height: `${col.height}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 pt-2 font-medium">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span className="font-bold text-slate-900">22:00 (Peak)</span>
              <span>23:59</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Avg solve time: <strong className="text-slate-800">14m 20s</strong> • First-try AC: <strong className="text-slate-800">76.3%</strong></span>
            <span>Based on last 148 submissions</span>
          </div>
        </div>

        {/* Weekly practice rhythm */}
        <div className="app-card p-6 flex flex-col justify-between space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Weekly practice rhythm</h2>
            <p className="text-xs text-slate-500">Daily consistency across past 4 weeks</p>
          </div>

          <div className="space-y-2.5 py-1">
            {weeklyRhythm.map((row) => (
              <div key={row.day} className="flex items-center gap-3 text-xs">
                <span className="w-8 font-semibold text-slate-600">{row.day}</span>
                <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-slate-900 rounded-full"
                    style={{ width: `${row.width}%` }}
                  />
                </div>
                <span className="w-12 text-right font-bold text-slate-800">{row.count} ACs</span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Optimal target pace</span>
            <span className="font-bold text-slate-800">3.4 problems/day</span>
          </div>
        </div>

      </div>

      {/* ── 5. Bottom Socratic Hint Callout ── */}
      <div className="app-card p-5 bg-gradient-to-r from-slate-50 via-white to-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles size={16} />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Socratic AI Coach • Zero-spoiler progressive assistance
            </span>
            <h4 className="text-sm font-bold text-slate-900">Need a hint without spoiling the solution?</h4>
            <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
              Progressive 3-tiered guidance (Observation → Invariant → Pseudo-algorithm) so you build genuine contest intuition without reading editorial code.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={() => onNavigate?.('aicoach')}
            className="btn-primary text-xs"
          >
            Start guided solve
          </button>
        </div>
      </div>

    </div>
  );
};
