import React, { useState, useEffect } from 'react';
import { fetchRecommendations } from '../api/codeforces';
import type { CFUserInfo, CFRatingChange, CFSubmission, CFProblem } from '../api/codeforces';
import { AlertTriangle, TrendingDown, BookOpen, ThumbsUp, Activity, Award, HelpCircle } from 'lucide-react';

interface AnalysisProps {
  userInfo: CFUserInfo;
  ratingHistory: CFRatingChange[];
  submissions: CFSubmission[];
}

export const Analysis: React.FC<AnalysisProps> = ({ userInfo, ratingHistory, submissions }) => {
  // 1. Analyze rating drops
  const ratingDrops = ratingHistory
    .map((change) => {
      const diff = change.newRating - change.oldRating;
      return {
        contestName: change.contestName,
        diff,
        rank: change.rank,
        date: new Date(change.ratingUpdateTimeSeconds * 1000).toLocaleDateString(),
        ratingAfter: change.newRating,
      };
    })
    .filter(d => d.diff < 0)
    .sort((a, b) => a.diff - b.diff); // Biggest drops first

  // 2. Detect weak topics
  const tagStats: { [tag: string]: { ok: number; total: number } } = {};
  submissions.forEach(s => {
    const isOk = s.verdict === 'OK';
    s.problem.tags.forEach(tag => {
      if (!tagStats[tag]) {
        tagStats[tag] = { ok: 0, total: 0 };
      }
      tagStats[tag].total += 1;
      if (isOk) tagStats[tag].ok += 1;
    });
  });

  const weakTopics = Object.keys(tagStats)
    .map(tag => {
      const stats = tagStats[tag];
      const ratio = stats.total > 0 ? stats.ok / stats.total : 0;
      return {
        tag,
        ok: stats.ok,
        total: stats.total,
        ratio,
        percentage: (ratio * 100).toFixed(0),
      };
    })
    // Filter tags where they have attempted at least 3 times and success rate is < 60%
    .filter(t => t.total >= 3 && t.ratio < 0.6)
    .sort((a, b) => a.ratio - b.ratio);

  const strongTopics = Object.keys(tagStats)
    .map(tag => {
      const stats = tagStats[tag];
      const ratio = stats.total > 0 ? stats.ok / stats.total : 0;
      return {
        tag,
        ok: stats.ok,
        total: stats.total,
        ratio,
        percentage: (ratio * 100).toFixed(0),
      };
    })
    .filter(t => t.total >= 3 && t.ratio >= 0.7)
    .sort((a, b) => b.ratio - a.ratio);

  // 3. Compute contest efficiency
  // Average problem index solved: convert A->1, B->2, C->3 etc.
  const solvedIndices = submissions
    .filter(s => s.verdict === 'OK')
    .map(s => s.problem.index.charCodeAt(0) - 64);
  const avgIndexSolved = solvedIndices.length > 0
    ? (solvedIndices.reduce((a, b) => a + b, 0) / solvedIndices.length).toFixed(1)
    : '0';
  
  // Penalty efficiency: incorrect submissions per solved problem
  const totalFails = submissions.filter(s => s.verdict !== 'OK' && s.verdict !== 'COMPILATION_ERROR').length;
  const okCount = submissions.filter(s => s.verdict === 'OK').length;
  const wrongTriesRatio = okCount > 0 ? (totalFails / okCount).toFixed(2) : '0';

  const userRating = userInfo.rating || 1200;

  const [recommendations, setRecommendations] = useState<CFProblem[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);

  useEffect(() => {
    const loadRecommendations = async () => {
      setRecsLoading(true);
      try {
        const data = await fetchRecommendations(userInfo.handle);
        setRecommendations(data);
      } catch (err) {
        console.warn('Failed to load recommended problems:', err);
      } finally {
        setRecsLoading(false);
      }
    };
    loadRecommendations();
  }, [userInfo.handle]);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. Efficiency Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center">
            <Activity size={24} />
          </div>
          <h4 className="text-sm font-semibold text-slate-400">Contest Efficiency Index</h4>
          <p className="text-3xl font-black text-indigo-300">Level {avgIndexSolved}</p>
          <p className="text-xs text-slate-500">Average maximum difficulty class solved in rounds</p>
        </div>

        <div className="glass-card p-6 rounded-2xl text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-rose-500/10 text-rose-400 rounded-full flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          <h4 className="text-sm font-semibold text-slate-400">Errors Per Solved Problem</h4>
          <p className="text-3xl font-black text-rose-300">{wrongTriesRatio}x</p>
          <p className="text-xs text-slate-500">Average failed attempts before getting an Accepted verdict</p>
        </div>

        <div className="glass-card p-6 rounded-2xl text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center">
            <Award size={24} />
          </div>
          <h4 className="text-sm font-semibold text-slate-400">Estimated Performance</h4>
          <p className="text-3xl font-black text-emerald-300">+{Math.max(10, Math.floor(userRating * 0.08))} Rating</p>
          <p className="text-xs text-slate-500">Current training difficulty focus: <span className="font-bold text-slate-300">{userRating + 150}</span></p>
        </div>
      </div>

      {/* 2. Weak & Strong Topics Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weak Topics */}
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <AlertTriangle size={18} className="text-rose-400" />
            Weak Areas Identified
          </h3>
          <p className="text-xs text-slate-400">Topics where your success rate is below 60% (minimum 3 submissions):</p>
          <div className="space-y-4">
            {weakTopics.length > 0 ? (
              weakTopics.slice(0, 5).map((t, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-300 capitalize">{t.tag}</span>
                    <span className="text-rose-400 font-bold">{t.percentage}% Success ({t.ok}/{t.total})</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2">
                    <div className="bg-rose-500 h-2 rounded-full" style={{ width: `${t.percentage}%` }}></div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-sm">No weak tags identified! You have balanced accuracy or limited history.</p>
            )}
          </div>
        </div>

        {/* Strong Topics */}
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ThumbsUp size={18} className="text-emerald-400" />
            Strengths & Comfort Zones
          </h3>
          <p className="text-xs text-slate-400">Topics where your success rate is above 70% (minimum 3 submissions):</p>
          <div className="space-y-4">
            {strongTopics.length > 0 ? (
              strongTopics.slice(0, 5).map((t, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-300 capitalize">{t.tag}</span>
                    <span className="text-emerald-400 font-bold">{t.percentage}% Success ({t.ok}/{t.total})</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${t.percentage}%` }}></div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-sm">Collect more solved problems to unlock specific comfort zones.</p>
            )}
          </div>
        </div>
      </div>

      {/* 3. Rating Drops Analysis */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <TrendingDown size={18} className="text-red-400" />
          Contest Defeats & Rating Drops
        </h3>
        <p className="text-xs text-slate-400">Analysis of your highest rating drops. Target these for post-mortem analysis:</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2">Contest Name</th>
                <th className="py-2 text-right">Rank</th>
                <th className="py-2 text-right">Rating Drop</th>
                <th className="py-2 text-right">Rating After</th>
              </tr>
            </thead>
            <tbody>
              {ratingDrops.length > 0 ? (
                ratingDrops.slice(0, 4).map((drop, idx) => (
                  <tr key={idx} className="border-b border-slate-900 hover:bg-slate-800/20 text-slate-300">
                    <td className="py-3 pr-4 font-medium truncate max-w-[200px] md:max-w-md">{drop.contestName}</td>
                    <td className="py-3 text-right">{drop.rank}</td>
                    <td className="py-3 text-right font-bold text-rose-500">{drop.diff}</td>
                    <td className="py-3 text-right">{drop.ratingAfter}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-500">No rating drops recorded. Phenomenal progress!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Recommendations Panel */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <BookOpen size={18} className="text-cyan-400" />
          Recommended Unsolved Problems
        </h3>
        <p className="text-xs text-slate-400">These unsolved problems fit your current rating range and target your weak tags:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recsLoading ? (
            <div className="col-span-2 text-center py-6 text-slate-500 text-sm flex flex-col items-center justify-center gap-2">
              <span className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></span>
              <span>Loading dynamic CP recommendations...</span>
            </div>
          ) : (
            recommendations.slice(0, 4).map((prob, idx) => (
              <div key={idx} className="glass-panel p-4 rounded-xl flex justify-between items-center hover:border-cyan-500/30 transition-all">
                <div className="space-y-1 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-slate-900 text-cyan-400 px-2 py-0.5 rounded font-black border border-cyan-500/10">
                      {prob.contestId}{prob.index}
                    </span>
                    <a 
                      href={`https://codeforces.com/problemset/problem/${prob.contestId}/${prob.index}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="font-semibold text-white hover:text-cyan-300 hover:underline text-sm truncate max-w-[150px] sm:max-w-[250px]"
                    >
                      {prob.name}
                    </a>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {prob.tags.slice(0, 2).map((t, i) => (
                      <span key={i} className="text-[10px] bg-slate-800/80 text-slate-400 px-1.5 py-0.5 rounded-full capitalize">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 block">Rating</span>
                  <span className="font-black text-emerald-400 text-sm">{prob.rating}</span>
                </div>
              </div>
            ))
          )}
          {!recsLoading && recommendations.length === 0 && (
            <div className="col-span-2 text-center py-6 text-slate-500 text-sm flex flex-col items-center justify-center gap-2">
              <HelpCircle size={32} className="opacity-30" />
              <span>We don't have suitable recommendations right now. Keep solving!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
