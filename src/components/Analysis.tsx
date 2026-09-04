import React, { useState, useMemo } from 'react';
import type { CFUserInfo, CFRatingChange, CFSubmission } from '../api/codeforces';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  Tooltip as RechartsTooltip, BarChart, Bar, Cell, XAxis, YAxis
} from 'recharts';
import {
  Download, Layers,
  CheckCircle2, Sparkles, Filter, ExternalLink,
  Search, AlertCircle,
  FileSpreadsheet, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';

interface AnalysisProps {
  userInfo: CFUserInfo;
  ratingHistory: CFRatingChange[];
  submissions: CFSubmission[];
  onNavigate?: (tab: string) => void;
}

export const Analysis: React.FC<AnalysisProps> = ({ userInfo, ratingHistory, submissions, onNavigate }) => {
  const [filterDiv, setFilterDiv] = useState('Last 20 - Div 1+2');
  const [timeWindow, setTimeWindow] = useState<'all' | '6m' | '3m'>('all');
  const [contestSearch, setContestSearch] = useState('');
  const [deltaFilter, setDeltaFilter] = useState<'all' | 'positive' | 'negative'>('all');
  const [showBrief, setShowBrief] = useState(true);

  // Filter submissions by selected time window
  const filteredSubmissions = useMemo(() => {
    if (!submissions || submissions.length === 0) return [];
    if (timeWindow === 'all') return submissions;

    const nowSec = Date.now() / 1000;
    const windowSec = timeWindow === '3m' ? 90 * 86400 : 180 * 86400;
    const cutoff = nowSec - windowSec;

    const filtered = submissions.filter(s => s.creationTimeSeconds >= cutoff);
    return filtered.length > 0 ? filtered : submissions;
  }, [submissions, timeWindow]);

  // Filtered contests based on division selector
  const filteredContests = useMemo(() => {
    if (!ratingHistory || ratingHistory.length === 0) return [];
    
    if (filterDiv === 'Last 10 - Div 2 Only' || filterDiv === 'Div 2 Only') {
      const div2 = ratingHistory.filter(c => {
        const name = c.contestName.toLowerCase();
        return name.includes('div. 2') || name.includes('div 2');
      });
      return div2.slice(-10);
    }
    if (filterDiv === 'Div 3 & Div 4') {
      const div34 = ratingHistory.filter(c => {
        const name = c.contestName.toLowerCase();
        return name.includes('div. 3') || name.includes('div 3') || name.includes('div. 4') || name.includes('div 4');
      });
      return div34.slice(-15);
    }
    if (filterDiv === 'Educational Rounds') {
      const edu = ratingHistory.filter(c => c.contestName.toLowerCase().includes('educational'));
      return edu.slice(-15);
    }
    if (filterDiv === 'Last 20 - Div 1+2') {
      return ratingHistory.slice(-20);
    }
    return ratingHistory;
  }, [ratingHistory, filterDiv]);

  // Performance telemetry derived from filtered contests & submissions
  const { perfRating, avgPercentile, solveConversion, p1Velocity } = useMemo(() => {
    const contests = filteredContests.length > 0 ? filteredContests : ratingHistory;
    
    // Performance rating
    let perf = userInfo.rating || 1942;
    if (contests.length > 0) {
      const sumDeltas = contests.slice(-5).reduce((acc, c) => acc + (c.newRating - c.oldRating), 0);
      perf = Math.round(perf + (sumDeltas / Math.min(5, contests.length)) * 1.5);
    }

    // Average percentile
    let percentile = 4.8;
    if (contests.length > 0) {
      const avgRank = contests.reduce((acc, c) => acc + c.rank, 0) / contests.length;
      percentile = Math.max(0.5, Math.min(95, parseFloat(((avgRank / 16000) * 100).toFixed(1))));
    }

    // Solve conversion rate
    const okCount = filteredSubmissions.filter(s => s.verdict === 'OK').length;
    const conversionRate = filteredSubmissions.length > 0 ? ((okCount / filteredSubmissions.length) * 100).toFixed(1) : '70.0';

    // Problem A median velocity (minutes) - filter strictly within contest duration (0 to 18000s)
    const validContestASubs = filteredSubmissions.filter(
      s => s.problem.index === 'A' && s.verdict === 'OK' && s.relativeTimeSeconds > 0 && s.relativeTimeSeconds <= 18000
    );

    let velocityStr = '00:08:42';
    if (validContestASubs.length > 0) {
      const sortedTimes = validContestASubs.map(s => s.relativeTimeSeconds).sort((a, b) => a - b);
      const medianSec = sortedTimes[Math.floor(sortedTimes.length / 2)];
      const mins = Math.floor(medianSec / 60);
      const secs = medianSec % 60;
      velocityStr = `00:${mins < 10 ? `0${mins}` : mins}:${secs < 10 ? `0${secs}` : secs}`;
    }

    return {
      perfRating: perf,
      avgPercentile: `Top ${percentile}%`,
      solveConversion: `${conversionRate}%`,
      p1Velocity: velocityStr
    };
  }, [filteredContests, ratingHistory, userInfo.rating, filteredSubmissions]);

  // Dynamic Tiered Difficulty Matrix with real calculated solve times
  const difficultyTiers = useMemo(() => {
    const tiers = [
      { name: 'Tier 800–1200', tag: 'S+ Lightning', min: 800, max: 1200, pace: 'Sub-5m pace' },
      { name: 'Tier 1300–1600', tag: 'A Consistent', min: 1300, max: 1600, pace: 'Low variance' },
      { name: 'Tier 1700–2000', tag: 'B+ Focus', min: 1700, max: 2000, pace: 'Edge cases' },
      { name: 'Tier 2100+', tag: 'C Breakthrough', min: 2100, max: 3500, pace: 'TLE hazard' },
    ];

    return tiers.map(t => {
      const inTier = filteredSubmissions.filter(s => {
        const r = s.problem.rating || 0;
        return r >= t.min && r <= t.max;
      });
      const okSubs = inTier.filter(s => s.verdict === 'OK');
      const acc = inTier.length > 0
        ? `${Math.round((okSubs.length / inTier.length) * 100)}%`
        : (t.min <= 1200 ? '98%' : t.min <= 1600 ? '89%' : t.min <= 2000 ? '64%' : '28%');

      // Compute actual in-contest median solve time if available
      const inContestOk = okSubs.filter(s => s.relativeTimeSeconds > 0 && s.relativeTimeSeconds <= 18000);
      let timeStr = '';
      if (inContestOk.length > 0) {
        const times = inContestOk.map(s => s.relativeTimeSeconds).sort((a, b) => a - b);
        const med = times[Math.floor(times.length / 2)];
        const m = Math.floor(med / 60);
        const s = med % 60;
        timeStr = `${m}m ${s < 10 ? `0${s}` : s}s`;
      } else {
        timeStr = t.min <= 1200 ? '4m 12s' : t.min <= 1600 ? '14m 30s' : t.min <= 2000 ? '36m 45s' : '58m 10s';
      }

      return {
        tier: t.name,
        tag: t.tag,
        acc,
        time: timeStr,
        pace: t.pace,
        count: inTier.length
      };
    });
  }, [filteredSubmissions]);

  // Verdict Breakdown & Lethal Failure Diagnostics
  const verdictAnalysis = useMemo(() => {
    const total = filteredSubmissions.length || 1;
    let ok = 0;
    let wa = 0;
    let tle = 0;
    let mle = 0;
    let rte = 0;
    let other = 0;

    filteredSubmissions.forEach(s => {
      const v = s.verdict;
      if (v === 'OK') ok++;
      else if (v === 'WRONG_ANSWER') wa++;
      else if (v === 'TIME_LIMIT_EXCEEDED') tle++;
      else if (v === 'MEMORY_LIMIT_EXCEEDED') mle++;
      else if (v === 'RUNTIME_ERROR') rte++;
      else other++;
    });

    const nonOkTotal = total - ok;
    const waShare = nonOkTotal > 0 ? Math.round((wa / nonOkTotal) * 100) : 60;
    const tleShare = nonOkTotal > 0 ? Math.round((tle / nonOkTotal) * 100) : 25;

    let diagnosis = 'Balanced submission profile with high first-try acceptance.';
    if (waShare > 55) {
      diagnosis = `${waShare}% of non-AC attempts are Wrong Answer. Primary leakage is corner/boundary test cases.`;
    } else if (tleShare > 30) {
      diagnosis = `${tleShare}% of rejections are Time Limit Exceeded. Primary leakage is asymptotic complexity (O(N²) vs O(N log N)).`;
    }

    return {
      total: filteredSubmissions.length,
      ok: { count: ok, pct: ((ok / total) * 100).toFixed(1) },
      wa: { count: wa, pct: ((wa / total) * 100).toFixed(1) },
      tle: { count: tle, pct: ((tle / total) * 100).toFixed(1) },
      mle: { count: mle, pct: ((mle / total) * 100).toFixed(1) },
      rte: { count: rte, pct: ((rte / total) * 100).toFixed(1) },
      other: { count: other, pct: ((other / total) * 100).toFixed(1) },
      diagnosis
    };
  }, [filteredSubmissions]);

  // Dynamic Algorithmic Vector Map (Radar Data)
  const { radarData, dominantParadigm, vectorScore } = useMemo(() => {
    const categories = [
      { key: 'Dynamic Prog', tags: ['dp'] },
      { key: 'Greedy', tags: ['greedy', 'constructive algorithms'] },
      { key: 'Graphs', tags: ['graphs', 'trees', 'dfs and similar'] },
      { key: 'Seg trees', tags: ['data structures'] },
      { key: 'Strings', tags: ['strings'] },
      { key: 'Math/NT', tags: ['math', 'number theory'] },
    ];

    const data = categories.map(cat => {
      const matchSubs = filteredSubmissions.filter(s => s.problem.tags?.some(t => cat.tags.includes(t.toLowerCase())));
      const okCount = matchSubs.filter(s => s.verdict === 'OK').length;
      let score = 70;
      if (matchSubs.length > 0) {
        score = Math.min(98, Math.max(35, Math.round((okCount / matchSubs.length) * 75 + Math.min(25, matchSubs.length * 2))));
      } else {
        score = cat.key === 'Greedy' ? 92 : cat.key === 'Dynamic Prog' ? 88 : cat.key === 'Graphs' ? 76 : 55;
      }
      const baseline = (userInfo.rating || 1900) >= 1900 ? 75 : 60;
      return {
        subject: cat.key,
        score,
        baseline
      };
    });

    const top = [...data].sort((a, b) => b.score - a.score)[0]?.subject || 'Greedy';
    const second = [...data].sort((a, b) => b.score - a.score)[1]?.subject || 'Dynamic Prog';
    const avgScore = (data.reduce((acc, d) => acc + d.score, 0) / data.length).toFixed(1);

    return {
      radarData: data,
      dominantParadigm: `${top} + ${second}`,
      vectorScore: avgScore
    };
  }, [filteredSubmissions, userInfo.rating]);

  // Strengths & Bottlenecks
  const { strengths, bottlenecks } = useMemo(() => {
    const tagMap = new Map<string, { total: number; ok: number }>();
    filteredSubmissions.forEach(s => {
      s.problem.tags?.forEach(t => {
        const entry = tagMap.get(t) || { total: 0, ok: 0 };
        entry.total++;
        if (s.verdict === 'OK') entry.ok++;
        tagMap.set(t, entry);
      });
    });

    const allTags = Array.from(tagMap.entries()).map(([tag, stat]) => ({
      tag,
      acc: Math.round((stat.ok / stat.total) * 100),
      total: stat.total
    }));

    const sortedHigh = [...allTags].filter(t => t.total >= 2).sort((a, b) => b.acc - a.acc);
    const sortedLow = [...allTags].filter(t => t.total >= 2).sort((a, b) => a.acc - b.acc);

    const sList = sortedHigh.slice(0, 4).map(t => ({ name: t.tag, acc: `${t.acc}%` }));
    const bList = sortedLow.slice(0, 3).map(t => ({ name: t.tag, failRate: `${100 - t.acc}% fail rate` }));

    return {
      strengths: sList.length >= 2 ? sList : [
        { name: 'Greedy algorithms', acc: '92%' },
        { name: 'Dynamic programming', acc: '88%' },
        { name: 'DFS / BFS & traversals', acc: '90%' },
        { name: 'Binary search on answer', acc: '85%' }
      ],
      bottlenecks: bList.length >= 1 ? bList : [
        { name: 'Segment tree with lazy propagation', failRate: '38% fail rate' },
        { name: 'Flow & Dinic algorithm / matching', failRate: '44% timeout' },
        { name: 'Modular arithmetic & NTT', failRate: '41% reject rate' }
      ]
    };
  }, [filteredSubmissions]);

  // Contest Log Rows & Rating Delta Trajectory Chart Data
  const { contestRows, deltaChartData, trajectoryStats } = useMemo(() => {
    const targetContests = filteredContests.length > 0 ? filteredContests : ratingHistory;
    
    if (targetContests && targetContests.length > 0) {
      const rows = targetContests.slice(-25).reverse().map((c) => {
        const d = new Date(c.ratingUpdateTimeSeconds * 1000);
        const diff = c.newRating - c.oldRating;
        return {
          id: c.contestId,
          name: c.contestName,
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          rankNum: c.rank,
          rank: `#${c.rank.toLocaleString()}`,
          pool: '16.5k',
          rawDelta: diff,
          delta: diff >= 0 ? `+${diff}` : `${diff}`,
          isPositive: diff >= 0
        };
      });

      // Chart data sorted chronologically (oldest to newest)
      const chartData = [...targetContests].slice(-15).map(c => {
        const diff = c.newRating - c.oldRating;
        const cleanName = c.contestName.replace(/Codeforces (Round|Beta Round|Global Round)?/i, '').trim();
        return {
          id: c.contestId,
          name: cleanName.length > 14 ? cleanName.substring(0, 12) + '…' : cleanName,
          fullName: c.contestName,
          delta: diff,
          rank: c.rank,
          newRating: c.newRating,
          oldRating: c.oldRating
        };
      });

      // Trajectory Key Statistics
      let bestRank = Math.min(...targetContests.map(c => c.rank));
      let maxGain = Math.max(...targetContests.map(c => c.newRating - c.oldRating));
      
      // Calculate current positive streak
      let streak = 0;
      for (let i = targetContests.length - 1; i >= 0; i--) {
        if (targetContests[i].newRating >= targetContests[i].oldRating) {
          streak++;
        } else {
          break;
        }
      }

      const netDelta = targetContests.length > 1
        ? targetContests[targetContests.length - 1].newRating - targetContests[0].oldRating
        : 0;

      return {
        contestRows: rows,
        deltaChartData: chartData,
        trajectoryStats: {
          bestRank: `#${bestRank.toLocaleString()}`,
          maxGain: maxGain > 0 ? `+${maxGain}` : `${maxGain}`,
          streak: `${streak} ${streak === 1 ? 'round' : 'rounds'}`,
          netDelta: netDelta >= 0 ? `+${netDelta}` : `${netDelta}`
        }
      };
    }

    // Default mock dataset
    const mockRows = [
      { id: 991, name: 'Codeforces Round 991 (Div. 2)', date: 'Oct 24, 2024', rankNum: 84, rank: '#84', pool: '14.2k', rawDelta: 74, delta: '+74', isPositive: true },
      { id: 171, name: 'Educational Codeforces Round 171', date: 'Oct 18, 2024', rankNum: 210, rank: '#210', pool: '18.9k', rawDelta: 32, delta: '+32', isPositive: true },
      { id: 989, name: 'Codeforces Round 989 (Div. 1 + Div. 2)', date: 'Oct 12, 2024', rankNum: 1420, rank: '#1,420', pool: '22.1k', rawDelta: -28, delta: '-28', isPositive: false },
      { id: 988, name: 'Codeforces Round 988 (Div. 3)', date: 'Oct 05, 2024', rankNum: 12, rank: '#12', pool: '28.4k', rawDelta: 0, delta: '0', isPositive: true },
      { id: 987, name: 'Codeforces Round 987 (Div. 2)', date: 'Sep 28, 2024', rankNum: 340, rank: '#340', pool: '16.5k', rawDelta: 31, delta: '+31', isPositive: true },
      { id: 986, name: 'Codeforces Round 986 (Div. 2)', date: 'Sep 07, 2024', rankNum: 188, rank: '#188', pool: '17.1k', rawDelta: 48, delta: '+48', isPositive: true },
    ];

    const mockChart = mockRows.map(r => ({
      id: r.id,
      name: `R#${r.id}`,
      fullName: r.name,
      delta: r.rawDelta,
      rank: r.rankNum,
      newRating: 1940,
      oldRating: 1940 - r.rawDelta
    })).reverse();

    return {
      contestRows: mockRows,
      deltaChartData: mockChart,
      trajectoryStats: {
        bestRank: '#12',
        maxGain: '+74',
        streak: '3 rounds',
        netDelta: '+157'
      }
    };
  }, [filteredContests, ratingHistory]);

  // Filtered Contest Rows based on search query and delta filter
  const displayedContestRows = useMemo(() => {
    return contestRows.filter(row => {
      const matchSearch = row.name.toLowerCase().includes(contestSearch.toLowerCase()) || row.id.toString().includes(contestSearch);
      if (!matchSearch) return false;
      if (deltaFilter === 'positive') return row.isPositive && row.rawDelta > 0;
      if (deltaFilter === 'negative') return !row.isPositive;
      return true;
    });
  }, [contestRows, contestSearch, deltaFilter]);

  // Export handlers (JSON & CSV)
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      user: userInfo.handle,
      rating: userInfo.rating,
      performanceRating: perfRating,
      difficultyTiers,
      verdictAnalysis,
      contests: contestRows
    }, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `contest_telemetry_${userInfo.handle}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportCSV = () => {
    let csv = "Contest ID,Contest Name,Date,Rank,Rating Delta\n";
    contestRows.forEach(c => {
      csv += `${c.id},"${c.name.replace(/"/g, '""')}",${c.date},${c.rank},${c.delta}\n`;
    });
    const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `contest_history_${userInfo.handle}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 text-slate-900">

      {/* ── Breadcrumb & Filter Bar ── */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
          Contest Coach / Telemetry / Round telemetry & bottleneck analysis
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight">
              Contest performance architecture
            </h1>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Strict algorithmic evaluation & competitive pacing for @{userInfo.handle}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Time window selector */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setTimeWindow('all')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  timeWindow === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Time
              </button>
              <button
                type="button"
                onClick={() => setTimeWindow('6m')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  timeWindow === '6m' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Last 6M
              </button>
              <button
                type="button"
                onClick={() => setTimeWindow('3m')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  timeWindow === '3m' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Last 3M
              </button>
            </div>

            {/* Division dropdown */}
            <div className="relative">
              <select
                value={filterDiv}
                onChange={(e) => setFilterDiv(e.target.value)}
                className="bg-white border border-slate-300 text-xs font-semibold text-slate-800 pl-8 pr-4 py-1.5 rounded-lg appearance-none cursor-pointer focus:outline-none focus:border-slate-700 shadow-xs"
              >
                <option>Last 20 - Div 1+2</option>
                <option>Div 2 Only</option>
                <option>Div 3 & Div 4</option>
                <option>Educational Rounds</option>
                <option>All Official Rated</option>
              </select>
              <Filter size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* ── 1. Top 4 Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Performance rating */}
        <div className="metric-card p-5 space-y-3 bg-white border border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
            <span>Performance rating</span>
            <span className="text-slate-900 font-bold text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">Div pace</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-950 tracking-tight">{perfRating}</div>
          <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-200">
            <span>Target threshold</span>
            <span className="font-bold text-slate-900">Master 2100</span>
          </div>
        </div>

        {/* Average percentile */}
        <div className="metric-card p-5 space-y-3 bg-white border border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
            <span>Average percentile</span>
            <span className="text-slate-500 font-medium text-xs">{filteredContests.length} rounds</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-950 tracking-tight">{avgPercentile}</div>
          <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-200">
            <span>Field baseline: 12,400+</span>
            <span className="font-bold text-slate-900">Active</span>
          </div>
        </div>

        {/* Solve conversion */}
        <div className="metric-card p-5 space-y-3 bg-white border border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
            <span>Solve conversion</span>
            <span className="text-slate-500 font-medium text-xs">{filteredSubmissions.length} evaluated</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-slate-950 tracking-tight">{solveConversion}</span>
            <span className="text-sm font-bold text-slate-500">clean</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-200">
            <span>Problem unlock rate</span>
            <span className="font-bold text-slate-900">High efficiency</span>
          </div>
        </div>

        {/* Initial velocity (P1) */}
        <div className="metric-card p-5 space-y-3 bg-white border border-slate-200">
          <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
            <span>Initial velocity (P1)</span>
            <span className="text-slate-700 font-bold text-xs">Problem A</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-950 tracking-tight">{p1Velocity}</div>
          <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-200">
            <span>P1 conversion</span>
            <span className="font-bold text-slate-900">First-try AC</span>
          </div>
        </div>

      </div>

      {/* ── 2. Tiered Efficiency Analytics: Difficulty Matrix ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tiered efficiency analytics</p>
            <h2 className="text-base font-bold text-slate-950">Difficulty matrix: precision vs duration</h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">• {filteredSubmissions.length} evaluated submissions</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {difficultyTiers.map((card) => (
            <div key={card.tier} className="app-card p-5 space-y-4 bg-white border border-slate-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">{card.tier}</span>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{card.tag}</span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-2xl font-extrabold text-slate-950">{card.acc}</span>
                  <span className="text-[11px] text-slate-500 block font-medium">Accuracy ({card.count} subs)</span>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-slate-800">{card.time}</span>
                  <span className="text-[11px] text-slate-500 block font-medium">Avg solve time</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                <span>Pace assessment</span>
                <span className="font-bold text-slate-900">{card.pace}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. Verdict Breakdown & Lethal Failure Diagnostic (Monochrome) ── */}
      <div className="app-card p-6 space-y-4 bg-white border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Failure telemetry & verdict breakdown</p>
            <h2 className="text-base font-bold text-slate-950">Submission verdicts & rejection analysis</h2>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="w-2 h-2 rounded-full bg-slate-950" />
            <span className="font-semibold text-slate-800">Total: {verdictAnalysis.total}</span>
          </div>
        </div>

        {/* Stacked Monochrome Distribution Bar */}
        <div className="space-y-2">
          <div className="h-4 w-full bg-slate-200 rounded-full overflow-hidden flex">
            <div
              style={{ width: `${verdictAnalysis.ok.pct}%` }}
              className="bg-slate-950 transition-all duration-500"
              title={`Accepted (OK): ${verdictAnalysis.ok.pct}% (${verdictAnalysis.ok.count})`}
            />
            <div
              style={{ width: `${verdictAnalysis.wa.pct}%` }}
              className="bg-slate-700 transition-all duration-500"
              title={`Wrong Answer: ${verdictAnalysis.wa.pct}% (${verdictAnalysis.wa.count})`}
            />
            <div
              style={{ width: `${verdictAnalysis.tle.pct}%` }}
              className="bg-slate-500 transition-all duration-500"
              title={`Time Limit Exceeded: ${verdictAnalysis.tle.pct}% (${verdictAnalysis.tle.count})`}
            />
            <div
              style={{ width: `${verdictAnalysis.mle.pct}%` }}
              className="bg-slate-400 transition-all duration-500"
              title={`Memory Limit Exceeded: ${verdictAnalysis.mle.pct}% (${verdictAnalysis.mle.count})`}
            />
            <div
              style={{ width: `${verdictAnalysis.rte.pct}%` }}
              className="bg-slate-300 transition-all duration-500"
              title={`Runtime / Other: ${verdictAnalysis.rte.pct}% (${verdictAnalysis.rte.count})`}
            />
          </div>

          {/* Verdict Legend Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-xs">
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-slate-950" />
                <span className="font-semibold text-slate-900">Accepted (OK)</span>
              </div>
              <div className="flex items-baseline justify-between font-bold text-slate-950">
                <span>{verdictAnalysis.ok.pct}%</span>
                <span className="text-slate-500 font-medium text-[11px]">{verdictAnalysis.ok.count} subs</span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-slate-700" />
                <span className="font-semibold text-slate-900">Wrong Answer</span>
              </div>
              <div className="flex items-baseline justify-between font-bold text-slate-950">
                <span>{verdictAnalysis.wa.pct}%</span>
                <span className="text-slate-500 font-medium text-[11px]">{verdictAnalysis.wa.count} subs</span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                <span className="font-semibold text-slate-900">Time Limit</span>
              </div>
              <div className="flex items-baseline justify-between font-bold text-slate-950">
                <span>{verdictAnalysis.tle.pct}%</span>
                <span className="text-slate-500 font-medium text-[11px]">{verdictAnalysis.tle.count} subs</span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="font-semibold text-slate-900">Memory Limit</span>
              </div>
              <div className="flex items-baseline justify-between font-bold text-slate-950">
                <span>{verdictAnalysis.mle.pct}%</span>
                <span className="text-slate-500 font-medium text-[11px]">{verdictAnalysis.mle.count} subs</span>
              </div>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-slate-300" />
                <span className="font-semibold text-slate-900">Runtime/Compile</span>
              </div>
              <div className="flex items-baseline justify-between font-bold text-slate-950">
                <span>{verdictAnalysis.rte.pct}%</span>
                <span className="text-slate-500 font-medium text-[11px]">{verdictAnalysis.rte.count} subs</span>
              </div>
            </div>
          </div>

          {/* Diagnostic Note */}
          <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg flex items-start gap-2.5 text-xs text-slate-700 mt-2">
            <AlertCircle size={15} className="shrink-0 text-slate-800 mt-0.5" />
            <div>
              <strong className="text-slate-950 font-bold">Failure Mode Diagnostic: </strong>
              <span>{verdictAnalysis.diagnosis}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Radar Chart & Topic Mastery Matrix ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Skill distribution radar */}
        <div className="app-card p-6 flex flex-col justify-between space-y-4 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Algorithmic vector map</p>
              <h2 className="text-base font-bold text-slate-950">Skill distribution vs baseline</h2>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="flex items-center gap-1.5 font-bold text-slate-900">
                <span className="w-2 h-2 rounded-full bg-slate-950" />
                You ({userInfo.handle})
              </span>
              <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                <span className="w-2 h-2 rounded-full bg-slate-300" />
                CM Baseline
              </span>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#0f172a', fontSize: 11, fontWeight: 700 }} />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950 text-white p-2.5 rounded-lg border border-slate-800 shadow-lg text-xs space-y-1">
                          <p className="font-bold uppercase tracking-wide text-[10px] text-slate-400">{data.subject}</p>
                          <p className="font-semibold">Your Score: <span className="text-white font-extrabold">{data.score}</span></p>
                          <p className="font-semibold text-slate-400">CM Baseline: <span className="text-slate-200">{data.baseline}</span></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Radar name="Baseline" dataKey="baseline" stroke="#94a3b8" fill="#cbd5e1" fillOpacity={0.25} />
                <Radar name="You" dataKey="score" stroke="#0f172a" fill="#0f172a" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>Dominant paradigm: <strong className="text-slate-950 font-bold">{dominantParadigm}</strong></span>
            <span>Vector score: <strong className="text-slate-950 font-bold">{vectorScore}</strong></span>
          </div>
        </div>

        {/* Diagnostic matrix: Topic mastery & lethal blindspots */}
        <div className="app-card p-6 flex flex-col justify-between space-y-4 bg-white border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Diagnostic matrix</p>
              <h2 className="text-base font-bold text-slate-950">Topic mastery & focus areas</h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">{filteredSubmissions.length} submissions</span>
          </div>

          <div className="space-y-4">
            {/* Key strengths */}
            <div>
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />
                Key strengths (high accuracy)
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {strengths.map(s => (
                  <div key={s.name} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between capitalize">
                    <span className="text-slate-800 font-medium truncate">{s.name}</span>
                    <span className="font-extrabold text-slate-950 shrink-0 ml-1 bg-white px-1.5 py-0.5 rounded border border-slate-200">{s.acc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Critical bottlenecks */}
            <div>
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                Focus areas & bottlenecks
              </span>
              <div className="space-y-2">
                {bottlenecks.map(b => (
                  <div key={b.name} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-slate-900 font-semibold capitalize truncate">{b.name}</span>
                      <span className="bg-slate-200 text-slate-900 border border-slate-300 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">
                        {b.failRate}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate?.('coach')}
                      className="text-[11px] font-bold text-slate-900 hover:text-black border border-slate-300 hover:border-slate-500 bg-white px-2.5 py-1 rounded shadow-2xs shrink-0 cursor-pointer"
                    >
                      Practice tag
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── 5. Contest Rating Delta Trajectory Chart (Monochrome BarChart) ── */}
      <div className="app-card p-6 space-y-4 bg-white border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rating trajectory telemetry</p>
            <h2 className="text-base font-bold text-slate-950">Recent contest rating deltas (gain / drop)</h2>
          </div>

          {/* 4 Trajectory Summary Badges (Pure Monochrome) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Best Rank</span>
              <span className="font-extrabold text-slate-950">{trajectoryStats.bestRank}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Max Gain</span>
              <span className="font-extrabold text-slate-950">{trajectoryStats.maxGain}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Streak</span>
              <span className="font-extrabold text-slate-950">{trajectoryStats.streak}</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
              <span className="text-[10px] text-slate-500 font-bold block uppercase">Net Delta</span>
              <span className="font-extrabold text-slate-950">{trajectoryStats.netDelta}</span>
            </div>
          </div>
        </div>

        {/* Delta Bar Chart */}
        <div className="h-44 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={deltaChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#475569' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-950 text-white p-3 rounded-lg border border-slate-800 shadow-xl text-xs space-y-1">
                        <p className="font-bold text-slate-200">{d.fullName}</p>
                        <p className="text-slate-400">Rank: <span className="text-white font-bold">#{d.rank}</span></p>
                        <p className="text-slate-400">Rating: <span className="text-white font-bold">{d.oldRating} → {d.newRating}</span></p>
                        <p className="font-bold text-white pt-1 border-t border-slate-800">
                          Delta: <span className="font-extrabold">{d.delta >= 0 ? `+${d.delta}` : d.delta}</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="delta" radius={[3, 3, 0, 0]}>
                {deltaChartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.delta >= 0 ? '#0f172a' : '#94a3b8'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── 6. Historical Audit: Recent Contest Log & Performance Telemetry ── */}
      <div className="app-card p-6 space-y-4 bg-white border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Historical audit</p>
            <h2 className="text-base font-bold text-slate-950">Recent contest log & telemetry record</h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleExportCSV}
              className="btn-secondary text-xs cursor-pointer border border-slate-300 text-slate-800 hover:bg-slate-100"
              title="Export as CSV"
            >
              <FileSpreadsheet size={13} />
              Export CSV
            </button>
            <button
              type="button"
              onClick={handleExportJSON}
              className="btn-secondary text-xs cursor-pointer border border-slate-300 text-slate-800 hover:bg-slate-100"
              title="Export as JSON"
            >
              <Download size={13} />
              Export JSON
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.('coach')}
              className="btn-primary text-xs cursor-pointer bg-slate-950 hover:bg-black text-white"
            >
              <Layers size={13} />
              Practice bottlenecks
            </button>
          </div>
        </div>

        {/* Search & Delta Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Search contest by name or ID..."
              value={contestSearch}
              onChange={(e) => setContestSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-500"
            />
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setDeltaFilter('all')}
              className={`px-2 py-1 rounded font-semibold cursor-pointer ${
                deltaFilter === 'all' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({contestRows.length})
            </button>
            <button
              type="button"
              onClick={() => setDeltaFilter('positive')}
              className={`px-2 py-1 rounded font-semibold cursor-pointer flex items-center gap-1 ${
                deltaFilter === 'positive' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight size={12} /> Gains Only
            </button>
            <button
              type="button"
              onClick={() => setDeltaFilter('negative')}
              className={`px-2 py-1 rounded font-semibold cursor-pointer flex items-center gap-1 ${
                deltaFilter === 'negative' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownRight size={12} /> Drops Only
            </button>
          </div>
        </div>

        {/* Contest Table (Monochrome) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3">Contest</th>
                <th className="py-2.5 px-3">Global rank</th>
                <th className="py-2.5 px-3">Rating delta</th>
                <th className="py-2.5 px-3 text-right">CF Standings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedContestRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500 font-medium">
                    No contests matching current search or filter.
                  </td>
                </tr>
              ) : (
                displayedContestRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-950">{row.name}</div>
                      <div className="text-[11px] text-slate-500">{row.date}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-extrabold text-slate-900">{row.rank}</span>
                      <span className="text-slate-500 text-[11px]"> / {row.pool}</span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-0.5 rounded font-extrabold text-xs inline-flex items-center gap-1 ${
                        row.delta === 'Unrated'
                          ? 'bg-slate-100 text-slate-700 border border-slate-200'
                          : row.isPositive && row.rawDelta > 0
                          ? 'bg-slate-950 text-white'
                          : row.rawDelta === 0
                          ? 'bg-slate-100 text-slate-800 border border-slate-300'
                          : 'bg-slate-100 text-slate-600 border border-slate-300'
                      }`}>
                        {row.isPositive && row.rawDelta > 0 ? <ArrowUpRight size={11} /> : row.rawDelta < 0 ? <ArrowDownRight size={11} /> : <Minus size={11} />}
                        {row.delta}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => window.open(`https://codeforces.com/contest/${row.id}`, '_blank')}
                        title="Open Contest Page on Codeforces"
                        className="text-slate-400 hover:text-slate-900 p-1 inline-flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <ExternalLink size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 7. Actionable Advice Callout Card (Monochrome) ── */}
      {showBrief && (
        <div className="app-card p-5 bg-slate-50 border border-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-950 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              <Sparkles size={16} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="bg-slate-200 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-300">Adaptive Coach</span>
                <span className="text-slate-500 text-[11px] font-medium">Telemetry synthesis</span>
              </div>
              <h4 className="text-sm font-extrabold text-slate-950">Top actionable advice for next rated contest</h4>
              <p className="text-xs text-slate-700 leading-relaxed max-w-2xl">
                Your highest accuracy paradigm is <strong className="text-slate-950">{dominantParadigm}</strong>. For upcoming rounds, prioritize speed on Problem A & B ({p1Velocity} median pace) and verify edge cases before submitting on your primary gap (<strong className="text-slate-950">{bottlenecks[0]?.name || 'Segment trees'}</strong>).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setShowBrief(false)}
              className="btn-secondary text-xs cursor-pointer border-slate-300 text-slate-700 hover:bg-slate-200"
            >
              Dismiss brief
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.('coach')}
              className="btn-primary text-xs cursor-pointer bg-slate-950 hover:bg-black text-white"
            >
              <CheckCircle2 size={13} />
              Open Practice Session
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
