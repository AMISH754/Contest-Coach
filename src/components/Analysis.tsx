import React, { useState, useEffect, useMemo } from 'react';
import { fetchRecommendations } from '../api/codeforces';
import type { CFUserInfo, CFRatingChange, CFSubmission, CFProblem } from '../api/codeforces';
import {
  AlertTriangle, TrendingDown, BookOpen, ThumbsUp,
  Activity, Award, HelpCircle, ExternalLink, Flame,
  Target, ChevronRight, Zap, ShieldCheck, Brain
} from 'lucide-react';

interface AnalysisProps {
  userInfo: CFUserInfo;
  ratingHistory: CFRatingChange[];
  submissions: CFSubmission[];
}

export const Analysis: React.FC<AnalysisProps> = ({ userInfo, ratingHistory, submissions }) => {

  // ── Memoized: rating drops ─────────────────────────────────────────────────
  const ratingDrops = useMemo(() =>
    ratingHistory
      .map((change) => ({
        contestName: change.contestName,
        diff: change.newRating - change.oldRating,
        rank: change.rank,
        date: new Date(change.ratingUpdateTimeSeconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
        ratingAfter: change.newRating,
      }))
      .filter(d => d.diff < 0)
      .sort((a, b) => a.diff - b.diff),
    [ratingHistory]
  );

  // ── Memoized: topic strengths ──────────────────────────────────────────────
  const { weakTopics, strongTopics } = useMemo(() => {
    const tagStats: { [tag: string]: { ok: number; total: number } } = {};
    submissions.forEach(s => {
      const isOk = s.verdict === 'OK';
      s.problem.tags.forEach(tag => {
        if (!tagStats[tag]) tagStats[tag] = { ok: 0, total: 0 };
        tagStats[tag].total += 1;
        if (isOk) tagStats[tag].ok += 1;
      });
    });

    const allTopics = Object.keys(tagStats).map(tag => {
      const stats = tagStats[tag];
      const ratio = stats.total > 0 ? stats.ok / stats.total : 0;
      return { tag, ok: stats.ok, total: stats.total, ratio, percentage: Math.round(ratio * 100) };
    });

    return {
      weakTopics: allTopics.filter(t => t.total >= 3 && t.ratio < 0.6).sort((a, b) => a.ratio - b.ratio),
      strongTopics: allTopics.filter(t => t.total >= 3 && t.ratio >= 0.7).sort((a, b) => b.ratio - a.ratio),
    };
  }, [submissions]);

  // ── Memoized: efficiency metrics ───────────────────────────────────────────
  const { avgIndexSolved, wrongTriesRatio, totalOk, totalSubs } = useMemo(() => {
    const solvedIndices = submissions
      .filter(s => s.verdict === 'OK')
      .map(s => s.problem.index.charCodeAt(0) - 64);
    const avg = solvedIndices.length > 0
      ? (solvedIndices.reduce((a, b) => a + b, 0) / solvedIndices.length).toFixed(1)
      : '0';
    const ok = submissions.filter(s => s.verdict === 'OK').length;
    const fails = submissions.filter(s => s.verdict !== 'OK' && s.verdict !== 'COMPILATION_ERROR').length;
    const ratio = ok > 0 ? (fails / ok).toFixed(2) : '0';
    return { avgIndexSolved: avg, wrongTriesRatio: ratio, totalOk: ok, totalSubs: submissions.length };
  }, [submissions]);

  const userRating = userInfo.rating || 1200;
  const acceptRate = totalSubs > 0 ? Math.round((totalOk / totalSubs) * 100) : 0;

  // ── Recommendations ────────────────────────────────────────────────────────
  const [recommendations, setRecommendations] = useState<CFProblem[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setRecsLoading(true);
      try {
        const data = await fetchRecommendations(userInfo.handle);
        setRecommendations(data);
      } catch {
        console.warn('Failed to load recommendations');
      } finally {
        setRecsLoading(false);
      }
    };
    load();
  }, [userInfo.handle]);

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* ── Hero Stats Row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Contest Efficiency */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-950/60 to-[#080e1a] border border-indigo-500/20 rounded-2xl p-6 group hover:border-indigo-500/40 transition-all">
          <div className="absolute inset-0 bg-indigo-500/3 group-hover:bg-indigo-500/5 transition-all" />
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/15 transition-all" />
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 bg-indigo-500/15 border border-indigo-500/25 rounded-xl flex items-center justify-center">
                <Activity size={17} className="text-indigo-400" />
              </div>
              <span className="text-[10px] uppercase tracking-widest font-extrabold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">Efficiency</span>
            </div>
            <div>
              <p className="text-[40px] font-black text-white leading-none">{avgIndexSolved}</p>
              <p className="text-xs text-indigo-300/80 font-semibold mt-0.5">Avg difficulty level solved</p>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">A = 1, B = 2, C = 3… Higher means harder problems reached in contests.</p>
          </div>
        </div>

        {/* Error Rate */}
        <div className="relative overflow-hidden bg-gradient-to-br from-rose-950/50 to-[#080e1a] border border-rose-500/20 rounded-2xl p-6 group hover:border-rose-500/40 transition-all">
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/15 transition-all" />
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 bg-rose-500/15 border border-rose-500/25 rounded-xl flex items-center justify-center">
                <AlertTriangle size={17} className="text-rose-400" />
              </div>
              <span className="text-[10px] uppercase tracking-widest font-extrabold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">Errors/AC</span>
            </div>
            <div>
              <p className="text-[40px] font-black text-white leading-none">{wrongTriesRatio}<span className="text-xl font-bold text-rose-400">×</span></p>
              <p className="text-xs text-rose-300/80 font-semibold mt-0.5">Failed attempts per solve</p>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">Lower is better. Aim for &lt;1.0 by carefully reading constraints first.</p>
          </div>
        </div>

        {/* Estimated Focus */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-950/50 to-[#080e1a] border border-emerald-500/20 rounded-2xl p-6 group hover:border-emerald-500/40 transition-all">
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/15 transition-all" />
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 bg-emerald-500/15 border border-emerald-500/25 rounded-xl flex items-center justify-center">
                <Target size={17} className="text-emerald-400" />
              </div>
              <span className="text-[10px] uppercase tracking-widest font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Target</span>
            </div>
            <div>
              <p className="text-[40px] font-black text-white leading-none">{userRating + 150}</p>
              <p className="text-xs text-emerald-300/80 font-semibold mt-0.5">Recommended practice rating</p>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Accept rate: <span className="text-white font-bold">{acceptRate}%</span> · Solve {totalOk} / {totalSubs} problems accepted.
            </p>
          </div>
        </div>

      </div>

      {/* ── Topic Analysis Row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Weak Areas */}
        <div className="bg-[#080e1a] border border-[#121e35] rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b border-[#121e35]/70 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <AlertTriangle size={15} className="text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Weak Areas</h3>
                <p className="text-[10px] text-slate-500">Below 60% success rate</p>
              </div>
            </div>
            <span className="text-[10px] font-extrabold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
              {weakTopics.length} found
            </span>
          </div>

          <div className="px-6 py-5 space-y-4">
            {weakTopics.length > 0 ? (
              weakTopics.slice(0, 5).map((t, idx) => (
                <div key={idx} className="space-y-2 group">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-600 tabular-nums w-4">{idx + 1}</span>
                      <span className="text-sm font-semibold text-slate-200 capitalize group-hover:text-white transition-colors">{t.tag}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500">{t.ok}/{t.total}</span>
                      <span className="text-xs font-black text-rose-400 tabular-nums">{t.percentage}%</span>
                    </div>
                  </div>
                  {/* Animated progress bar */}
                  <div className="relative h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-700"
                      style={{ width: `${t.percentage}%` }}
                    />
                    {/* Target line at 60% */}
                    <div className="absolute top-0 h-full w-px bg-slate-600" style={{ left: '60%' }} />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <ShieldCheck size={22} className="text-emerald-400" />
                </div>
                <p className="text-sm font-bold text-white">No weak spots!</p>
                <p className="text-xs text-slate-500">Balanced accuracy across all topics or limited history.</p>
              </div>
            )}
          </div>

          {weakTopics.length > 0 && (
            <div className="px-6 pb-4">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
                <div className="w-px h-3 bg-slate-600 mx-0.5" />
                <span>Vertical line marks the 60% target threshold</span>
              </div>
            </div>
          )}
        </div>

        {/* Strong Areas */}
        <div className="bg-[#080e1a] border border-[#121e35] rounded-2xl overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-[#121e35]/70 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <ThumbsUp size={15} className="text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Strengths</h3>
                <p className="text-[10px] text-slate-500">Above 70% success rate</p>
              </div>
            </div>
            <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
              {strongTopics.length} tags
            </span>
          </div>

          <div className="px-6 py-5 space-y-4">
            {strongTopics.length > 0 ? (
              strongTopics.slice(0, 5).map((t, idx) => (
                <div key={idx} className="space-y-2 group">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-600 tabular-nums w-4">{idx + 1}</span>
                      <span className="text-sm font-semibold text-slate-200 capitalize group-hover:text-white transition-colors">{t.tag}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500">{t.ok}/{t.total}</span>
                      <span className="text-xs font-black text-emerald-400 tabular-nums">{t.percentage}%</span>
                    </div>
                  </div>
                  <div className="relative h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-emerald-700 to-emerald-400 transition-all duration-700"
                      style={{ width: `${t.percentage}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                  <Brain size={22} className="text-slate-500" />
                </div>
                <p className="text-sm font-bold text-white">Keep building</p>
                <p className="text-xs text-slate-500">Solve more problems to unlock comfort zone tags.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── Rating Drops (Redesigned) ──────────────────────────────────────── */}
      <div className="bg-[#080e1a] border border-[#121e35] rounded-2xl overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-[#121e35]/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <TrendingDown size={15} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Worst Rating Drops</h3>
              <p className="text-[10px] text-slate-500">Post-mortem — study these contests first</p>
            </div>
          </div>
          <span className="text-[10px] font-extrabold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
            {ratingDrops.length} drops total
          </span>
        </div>

        {ratingDrops.length > 0 ? (
          <div className="divide-y divide-[#121e35]/60">
            {ratingDrops.slice(0, 4).map((drop, idx) => {
              const severity = drop.diff <= -50 ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' :
                               drop.diff <= -25 ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' :
                               'text-amber-400 bg-amber-500/10 border-amber-500/20';
              return (
                <div
                  key={idx}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-800/20 transition-colors group"
                >
                  {/* Rank Badge */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center">
                    <span className="text-[9px] text-slate-500 uppercase font-bold leading-none">#</span>
                    <span className="text-sm font-black text-slate-300 leading-none">{idx + 1}</span>
                  </div>

                  {/* Contest Name */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-sm font-semibold text-slate-200 truncate group-hover:text-white transition-colors">{drop.contestName}</p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500">
                      <span>📅 {drop.date}</span>
                      <span>Rank #{drop.rank.toLocaleString()}</span>
                      <span>After: <span className="text-slate-400 font-bold">{drop.ratingAfter}</span></span>
                    </div>
                  </div>

                  {/* Drop Badge */}
                  <div className={`flex-shrink-0 px-3 py-1.5 rounded-xl border text-sm font-black tabular-nums ${severity}`}>
                    {drop.diff}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Award size={26} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">Zero rating drops!</p>
              <p className="text-xs text-slate-500 mt-1">Every contest you've played resulted in a rating gain. Phenomenal!</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Recommended Problems ───────────────────────────────────────────── */}
      <div className="bg-[#080e1a] border border-[#121e35] rounded-2xl overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-[#121e35]/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <BookOpen size={15} className="text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Recommended Problems</h3>
              <p className="text-[10px] text-slate-500">Targeting your weak tags · Rating {userRating}–{userRating + 300}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-full">
            <Zap size={10} />
            <span className="font-extrabold uppercase tracking-wider">AI Curated</span>
          </div>
        </div>

        <div className="p-5">
          {recsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-slate-900/60 rounded-xl border border-slate-800/60 animate-pulse" />
              ))}
            </div>
          ) : recommendations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recommendations.slice(0, 4).map((prob, idx) => {
                const ratingColor =
                  (prob.rating ?? 0) >= 2000 ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' :
                  (prob.rating ?? 0) >= 1600 ? 'text-orange-400 bg-orange-500/10 border-orange-500/20' :
                  (prob.rating ?? 0) >= 1300 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

                return (
                  <a
                    key={idx}
                    href={`https://codeforces.com/problemset/problem/${prob.contestId}/${prob.index}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-4 p-4 bg-slate-900/40 hover:bg-slate-900/70 border border-slate-800/60 hover:border-cyan-500/25 rounded-xl transition-all group"
                  >
                    {/* Problem ID badge */}
                    <div className="flex-shrink-0 w-12 h-12 bg-[#060b13] border border-slate-800 rounded-xl flex flex-col items-center justify-center group-hover:border-cyan-500/30 transition-colors">
                      <span className="text-[9px] text-slate-500 font-bold leading-none">{prob.contestId}</span>
                      <span className="text-base font-black text-cyan-400 leading-none">{prob.index}</span>
                    </div>

                    {/* Name + tags */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <p className="text-sm font-semibold text-slate-200 group-hover:text-white truncate transition-colors">
                        {prob.name}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {prob.tags.slice(0, 2).map((t, i) => (
                          <span key={i} className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-md capitalize">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Rating + arrow */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                      <span className={`text-xs font-black px-2 py-0.5 rounded-md border tabular-nums ${ratingColor}`}>
                        {prob.rating}
                      </span>
                      <ExternalLink size={12} className="text-slate-600 group-hover:text-cyan-400 transition-colors" />
                    </div>
                  </a>
                );
              })}
            </div>
          ) : (
            <div className="py-10 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                <HelpCircle size={22} className="text-slate-500" />
              </div>
              <p className="text-sm font-bold text-white">No recommendations yet</p>
              <p className="text-xs text-slate-500 max-w-xs">Keep solving problems to generate personalized recommendations based on your weak tags.</p>
            </div>
          )}
        </div>

        {/* Footer bar */}
        {recommendations.length > 0 && (
          <div className="px-5 pb-4 flex items-center justify-between">
            <p className="text-[10px] text-slate-600">Showing {Math.min(4, recommendations.length)} of {recommendations.length} recommendations</p>
            <a
              href="https://codeforces.com/problemset"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-bold transition-colors"
            >
              Browse Problemset <ChevronRight size={12} />
            </a>
          </div>
        )}
      </div>

    </div>
  );
};
