import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import type { CFUserInfo, CFRatingChange, CFSubmission } from '../api/codeforces';
import { Award, ShieldAlert, CheckCircle2, TrendingUp, Calendar, Zap, ListFilter } from 'lucide-react';

interface DashboardProps {
  userInfo: CFUserInfo;
  ratingHistory: CFRatingChange[];
  submissions: CFSubmission[];
}

export const Dashboard: React.FC<DashboardProps> = ({ userInfo, ratingHistory, submissions }) => {
  // 1. Calculate general stats
  const totalSubmissions = submissions.length;
  const okSubmissions = submissions.filter(s => s.verdict === 'OK');
  const totalSolved = new Set(okSubmissions.map(s => s.problem.contestId + '-' + s.problem.index)).size;
  const successRate = totalSubmissions > 0 ? ((okSubmissions.length / totalSubmissions) * 100).toFixed(1) : '0';
  
  // 2. Prepare Rating Chart Data
  const ratingData = ratingHistory.map(change => ({
    name: new Date(change.ratingUpdateTimeSeconds * 1000).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    rating: change.newRating,
    rank: change.rank,
    contest: change.contestName,
  }));

  // 3. Prepare Verdict Distribution Data
  const verdictCounts: { [key: string]: number } = {};
  submissions.forEach(s => {
    const v = s.verdict || 'UNKNOWN';
    verdictCounts[v] = (verdictCounts[v] || 0) + 1;
  });
  
  const COLORS = {
    OK: '#10b981',           // Emerald
    WRONG_ANSWER: '#ef4444',     // Red
    TIME_LIMIT_EXCEEDED: '#f59e0b', // Amber
    MEMORY_LIMIT_EXCEEDED: '#3b82f6', // Blue
    COMPILATION_ERROR: '#6b7280', // Gray
    RUNTIME_ERROR: '#ec4899', // Pink
    SKIPPED: '#8b5cf6', // Purple
  };

  const verdictData = Object.keys(verdictCounts).map(v => ({
    name: v.replace(/_/g, ' '),
    value: verdictCounts[v],
    color: COLORS[v as keyof typeof COLORS] || '#a855f7'
  })).sort((a, b) => b.value - a.value);

  // 4. Prepare Solved by Month Data (last 6 months)
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const solvedByMonth: { [key: string]: { month: string, solved: Set<string>, submissions: number } } = {};
  
  okSubmissions.forEach(s => {
    const date = new Date(s.creationTimeSeconds * 1000);
    const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
    const problemKey = `${s.problem.contestId}-${s.problem.index}`;
    
    if (!solvedByMonth[key]) {
      solvedByMonth[key] = {
        month: `${monthNames[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`,
        solved: new Set<string>(),
        submissions: 0
      };
    }
    solvedByMonth[key].solved.add(problemKey);
  });

  submissions.forEach(s => {
    const date = new Date(s.creationTimeSeconds * 1000);
    const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
    if (solvedByMonth[key]) {
      solvedByMonth[key].submissions += 1;
    }
  });

  const monthlyData = Object.keys(solvedByMonth)
    .sort()
    .slice(-6)
    .map(key => ({
      name: solvedByMonth[key].month,
      Solved: solvedByMonth[key].solved.size,
      Submissions: solvedByMonth[key].submissions,
    }));

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. Header Profile Summary */}
      <div className="glass-card p-6 rounded-2xl flex flex-col md:flex-row items-center gap-6">
        <div className="relative">
          <img 
            src={userInfo.avatar} 
            alt={userInfo.handle} 
            className="w-24 h-24 rounded-full border-4 border-violet-500/30 bg-slate-900 object-cover"
          />
          <div className="absolute -bottom-1 -right-1 bg-violet-600 px-3 py-0.5 rounded-full text-xs font-bold shadow-lg shadow-violet-900/30">
            {userInfo.rank || 'Unrated'}
          </div>
        </div>
        <div className="text-center md:text-left flex-1 space-y-2">
          <h2 className="text-3xl font-extrabold text-white tracking-tight flex items-center justify-center md:justify-start gap-3">
            {userInfo.handle}
            {userInfo.maxRating && userInfo.maxRating >= 2400 && (
              <span className="text-xs uppercase bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-black border border-red-500/30 animate-pulse">
                Grandmaster
              </span>
            )}
          </h2>
          <p className="text-slate-400 text-sm flex flex-wrap justify-center md:justify-start gap-4">
            {userInfo.organization && <span>🏫 {userInfo.organization}</span>}
            {userInfo.country && <span>📍 {userInfo.country}</span>}
            <span>🤝 Contribution: {userInfo.contribution ?? 0}</span>
          </p>
        </div>
        
        {/* Rating Quick Badges */}
        <div className="flex gap-4">
          <div className="glass-panel px-4 py-3 rounded-xl text-center min-w-[100px]">
            <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Rating</p>
            <p className="text-2xl font-bold text-violet-400">{userInfo.rating || 'N/A'}</p>
          </div>
          <div className="glass-panel px-4 py-3 rounded-xl text-center min-w-[100px]">
            <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Max Rating</p>
            <p className="text-2xl font-bold text-emerald-400">{userInfo.maxRating || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-violet-500/10 text-violet-400 rounded-xl">
            <Award size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Contests Played</p>
            <p className="text-2xl font-black text-white">{ratingHistory.length}</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Problems Solved</p>
            <p className="text-2xl font-black text-white">{totalSolved}</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <Zap size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Success Rate</p>
            <p className="text-2xl font-black text-white">{successRate}%</p>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
            <ListFilter size={24} />
          </div>
          <div>
            <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Total Submissions</p>
            <p className="text-2xl font-black text-white">{totalSubmissions}</p>
          </div>
        </div>
      </div>

      {/* 3. Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rating Trend (Phase 1 MVP) */}
        <div className="glass-card p-6 rounded-2xl lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-violet-400" />
              Rating Progression
            </h3>
            <span className="text-xs bg-violet-500/10 text-violet-400 px-2 py-0.5 rounded border border-violet-500/20">
              Live CF History
            </span>
          </div>
          <div className="h-[300px]">
            {ratingData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ratingData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRating" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis domain={['dataMin - 100', 'dataMax + 100']} stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '8px' }}
                    labelFormatter={(label) => `Contest Date: ${label}`}
                  />
                  <Area type="monotone" dataKey="rating" stroke="#a78bfa" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRating)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500">
                <Calendar size={48} className="opacity-30 mb-2" />
                <p>No contest history found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Verdict Distribution (Phase 1 MVP) */}
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldAlert size={18} className="text-rose-400" />
            Verdict Distribution
          </h3>
          <div className="h-[200px] relative flex items-center justify-center">
            {verdictData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={verdictData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {verdictData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} Submissions`, 'Verdict']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-slate-500">No submission records.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs max-h-[90px] overflow-y-auto pr-1">
            {verdictData.slice(0, 6).map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }}></span>
                <span className="text-slate-300 truncate max-w-[80px]">{entry.name}</span>
                <span className="text-slate-500 font-bold ml-auto">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Solved / Submissions Chart (Phase 1 MVP) */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Calendar size={18} className="text-emerald-400" />
          Monthly Solved & Submissions Trend
        </h3>
        <div className="h-[280px]">
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Bar dataKey="Solved" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Submissions" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500">
              <p>No activity records available.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
