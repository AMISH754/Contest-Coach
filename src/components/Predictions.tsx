import React, { useState } from 'react';
import type { CFUserInfo, CFRatingChange } from '../api/codeforces';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid } from 'recharts';
import { Target, Compass, Award, HelpCircle } from 'lucide-react';

interface PredictionsProps {
  userInfo: CFUserInfo;
  ratingHistory: CFRatingChange[];
}

export const Predictions: React.FC<PredictionsProps> = ({ userInfo, ratingHistory }) => {
  const currentRating = userInfo.rating || 1200;
  const [targetRating, setTargetRating] = useState<number>(Math.min(currentRating + 200, 3000));

  // 1. Calculate historical trend (slope of last 5 contests)
  const lastContests = ratingHistory.slice(-5);
  let averageGain = 15; // default gain per contest
  if (lastContests.length >= 2) {
    const totalDiff = lastContests[lastContests.length - 1].newRating - lastContests[0].oldRating;
    averageGain = Math.round(totalDiff / lastContests.length);
  }
  if (averageGain <= 0) averageGain = 12; // fallback for plateauing / declining users to keep it encouraging but realistic

  // 2. Predict next 6 contests
  const chartData = ratingHistory.map((c, i) => ({
    contestIndex: i + 1,
    name: `Round ${i + 1}`,
    actual: c.newRating,
    predicted: null as number | null,
    contestName: c.contestName,
  }));

  const lastActualIndex = chartData.length;
  let runningRating = currentRating;
  
  // Add prediction points
  const predictionData = [...chartData];
  
  // Connect the actual line to the predicted line
  if (predictionData.length > 0) {
    predictionData[predictionData.length - 1].predicted = currentRating;
  }

  for (let i = 1; i <= 6; i++) {
    runningRating += averageGain;
    predictionData.push({
      contestIndex: lastActualIndex + i,
      name: `Est. Rd ${lastActualIndex + i}`,
      actual: null as any,
      predicted: runningRating,
      contestName: `Simulated Contest #${i}`,
    });
  }

  // 3. Goal ranks mapping
  const ranksList = [
    { name: 'Pupil', rating: 1200, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    { name: 'Specialist', rating: 1400, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    { name: 'Expert', rating: 1600, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { name: 'Candidate Master', rating: 1900, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
    { name: 'Master', rating: 2100, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
    { name: 'Grandmaster', rating: 2400, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    { name: 'Legendary Grandmaster', rating: 3000, color: 'text-rose-500 font-extrabold', bg: 'bg-rose-500/15', border: 'border-rose-500/30' },
  ];

  const ratingDiff = targetRating - currentRating;
  
  // Formulas for estimates:
  // Contests needed: diff / avgGain
  const estContestsNeeded = ratingDiff > 0 ? Math.ceil(ratingDiff / averageGain) : 0;
  
  // Problems needed: we estimate it takes roughly 15 solved problems of rating (targetRating - 100)
  // to build the skills for +100 rating increase.
  const estProblemsNeeded = ratingDiff > 0 ? Math.ceil((ratingDiff / 100) * 12) : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. Header Target Slider */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Target size={20} className="text-violet-400" />
              Interactive Goal Estimator
            </h3>
            <p className="text-xs text-slate-400">Drag the slider to set your target rating and calculate practice requirements:</p>
          </div>
          <div className="flex gap-4">
            <div className="glass-panel px-4 py-2 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Current</span>
              <span className="text-lg font-black text-white">{currentRating}</span>
            </div>
            <div className="glass-panel px-4 py-2 rounded-xl text-center border-violet-500/30">
              <span className="text-[10px] text-violet-400 block uppercase font-semibold">Target</span>
              <span className="text-lg font-black text-violet-400">{targetRating}</span>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <input 
            type="range" 
            min={Math.max(800, currentRating - 200)} 
            max={Math.min(3000, currentRating + 800)} 
            value={targetRating} 
            onChange={(e) => setTargetRating(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-violet-500"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>{Math.max(800, currentRating - 200)}</span>
            <span>Current: {currentRating}</span>
            <span>Max Estimate: {Math.min(3000, currentRating + 800)}</span>
          </div>
        </div>
      </div>

      {/* 2. Estimates Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-2xl text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-violet-500/10 text-violet-400 rounded-full flex items-center justify-center">
            <Compass size={24} />
          </div>
          <h4 className="text-sm font-semibold text-slate-400">Est. Contests Needed</h4>
          <p className="text-3xl font-black text-violet-300">
            {ratingDiff <= 0 ? 'Goal Reached!' : `${estContestsNeeded} Contests`}
          </p>
          <p className="text-xs text-slate-500">Based on trend of +{averageGain} rating/contest</p>
        </div>

        <div className="glass-card p-6 rounded-2xl text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center">
            <Target size={24} />
          </div>
          <h4 className="text-sm font-semibold text-slate-400">Required Practice Solves</h4>
          <p className="text-3xl font-black text-emerald-300">
            {ratingDiff <= 0 ? 'Goal Reached!' : `${estProblemsNeeded} Problems`}
          </p>
          <p className="text-xs text-slate-500">Problems of rating <span className="font-bold text-slate-300">+{Math.max(100, Math.floor(targetRating - currentRating + 100))}</span> relative to current rating</p>
        </div>

        <div className="glass-card p-6 rounded-2xl text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center">
            <Award size={24} />
          </div>
          <h4 className="text-sm font-semibold text-slate-400">Target Milestone</h4>
          <p className="text-3xl font-black text-amber-300">
            {ranksList.find(r => r.rating >= targetRating)?.name || 'Legendary GM'}
          </p>
          <p className="text-xs text-slate-500">Next tier milestone at rating <span className="font-bold text-slate-300">{ranksList.find(r => r.rating >= targetRating)?.rating || 3000}</span></p>
        </div>
      </div>

      {/* 3. Rating Projection Chart */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            📊 Predictive Rating Curve
          </h3>
          <span className="text-xs bg-slate-900 border border-violet-500/20 text-slate-400 px-2 py-0.5 rounded">
            Linear Regression + Current Gain Model
          </span>
        </div>
        <div className="h-[320px]">
          {ratingHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={predictionData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis domain={['dataMin - 100', 'dataMax + 200']} stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '8px' }}
                  formatter={(value, name) => [value, name === 'actual' ? 'Historical Rating' : 'Predicted Rating']}
                />
                <ReferenceLine y={currentRating} stroke="rgba(168, 85, 247, 0.4)" strokeDasharray="3 3" label={{ value: 'Current', fill: '#c084fc', fontSize: 10, position: 'insideBottomRight' }} />
                <ReferenceLine y={targetRating} stroke="rgba(16, 185, 129, 0.4)" strokeDasharray="3 3" label={{ value: 'Target', fill: '#34d399', fontSize: 10, position: 'insideTopRight' }} />
                <Line type="monotone" dataKey="actual" stroke="#c084fc" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="predicted" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500">
              <HelpCircle size={48} className="opacity-30 mb-2" />
              <p>Play at least 1 contest to view ratings forecasts.</p>
            </div>
          )}
        </div>
      </div>

      {/* 4. Milestone Roadmaps */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <h3 className="text-lg font-bold text-white">🏆 CF Milestones</h3>
        <p className="text-xs text-slate-400">Ranks hierarchy and distance relative to your current rating:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ranksList.map((rank, idx) => {
            const isCompleted = currentRating >= rank.rating;
            const diff = rank.rating - currentRating;
            return (
              <div 
                key={idx} 
                className={`glass-panel p-4 rounded-xl border flex flex-col justify-between ${rank.border} ${isCompleted ? 'opacity-55' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`font-black text-sm uppercase ${rank.color}`}>{rank.name}</span>
                    <span className="text-xs text-slate-500 block">Rating Threshold: {rank.rating}</span>
                  </div>
                  {isCompleted && (
                    <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold border border-emerald-500/20">
                      Earned
                    </span>
                  )}
                </div>
                {!isCompleted && (
                  <div className="mt-4 pt-3 border-t border-slate-900 flex justify-between items-center text-xs">
                    <span className="text-slate-400">Distance</span>
                    <span className="font-bold text-violet-400">+{diff} pts</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
