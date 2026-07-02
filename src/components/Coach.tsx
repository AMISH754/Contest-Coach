import React, { useState, useEffect } from 'react';
import { fetchCoachTasks, toggleCoachTask, regenerateTasks } from '../api/codeforces';
import type { CFUserInfo, CFSubmission, CoachTask } from '../api/codeforces';
import { Calendar, Dumbbell, ChevronRight, Zap, RefreshCw, Flame, CheckCircle2, Circle, Target, BookOpen, Code2 } from 'lucide-react';

interface CoachProps {
  userInfo: CFUserInfo;
  submissions: CFSubmission[];
  onNavigate: (tab: string) => void;
}

export const Coach: React.FC<CoachProps> = ({ userInfo, submissions, onNavigate }) => {
  const currentRating = userInfo.rating || 1200;

  // ── Heatmap / Streak ───────────────────────────────────────────────────────
  const streakDays = Array.from({ length: 28 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (27 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const submissionsByDay: { [time: number]: number } = {};
  submissions.forEach(s => {
    const d = new Date(s.creationTimeSeconds * 1000);
    d.setHours(0, 0, 0, 0);
    const t = d.getTime();
    submissionsByDay[t] = (submissionsByDay[t] || 0) + 1;
  });

  // Calculate current active streak
  // If today has no submissions yet, start from yesterday (same as GitHub's streak logic)
  let currentStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let checkDate = new Date(today);

  // If today is empty, check from yesterday — streak is still "active"
  // as long as it ended no more than 1 day ago
  if (!submissionsByDay[checkDate.getTime()]) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (true) {
    const count = submissionsByDay[checkDate.getTime()] || 0;
    if (count > 0) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // ── Tasks ──────────────────────────────────────────────────────────────────
  const [tasks, setTasks] = useState<CoachTask[]>([]);
  const [regenLoading, setRegenLoading] = useState(false);

  const generateFallbackTasks = (): CoachTask[] => [
    { id: 'task-1', title: 'Master Greedy Choice Property', category: 'Greedy', difficulty: currentRating + 100, completed: false, desc: `Solve 2 problems rating ${currentRating + 100} with "greedy" tag. Prove correctness before typing.` },
    { id: 'task-2', title: 'Virtual Contest Simulation', category: 'Simulation', difficulty: currentRating, completed: false, desc: 'Run a virtual Div. 3 or 2 contest. Solve A & B within 45 minutes.' },
    { id: 'task-3', title: 'Upsolve a Hard Drop', category: 'Dynamic Programming', difficulty: currentRating + 200, completed: false, desc: 'Pick your last rated contest, find the first unsolved problem, upsolve it.' },
    { id: 'task-4', title: 'Speed & Zero-Error Drill', category: 'Implementation', difficulty: Math.max(800, currentRating - 200), completed: true, desc: `Solve 3 problems of rating ${Math.max(800, currentRating - 200)} with 0 wrong submissions.` },
  ];

  const handleRegenerate = async () => {
    setRegenLoading(true);
    try {
      const data = await regenerateTasks(userInfo.handle);
      setTasks(data.map((t: any) => ({ id: t.id, title: t.title, category: t.category, difficulty: t.difficulty, completed: t.completed, desc: t.desc })));
    } catch {
      console.warn('Failed to regenerate');
    } finally {
      setRegenLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const serverTasks = await fetchCoachTasks(userInfo.handle);
        setTasks(serverTasks.length > 0 ? serverTasks : generateFallbackTasks());
      } catch {
        setTasks(generateFallbackTasks());
      }
    };
    load();
  }, [userInfo.handle]);

  // Optimistic toggle with rollback
  const handleToggle = async (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    try {
      await toggleCoachTask(userInfo.handle, id);
    } catch {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    }
  };

  const getHeatColor = (count: number) => {
    if (!count) return 'bg-slate-900 border-slate-800/80';
    if (count === 1) return 'bg-cyan-900/60 border-cyan-800/40';
    if (count <= 3) return 'bg-cyan-600/70 border-cyan-500/40';
    return 'bg-cyan-400 border-cyan-300 shadow-[0_0_6px_rgba(34,211,238,0.4)]';
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progressPct = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  const trainingPlans = [
    { icon: Code2, title: 'Dynamic Programming 101', tag: 'Highly Recommended', tagColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20', desc: `Focus: Knapsack, Digit DP, State compression. Target: ${currentRating + 100}–${currentRating + 300}`, color: 'border-rose-500/20 hover:border-rose-500/35' },
    { icon: Target, title: 'Graph Traversals (DFS/BFS)', tag: 'Standard Path', tagColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20', desc: `Connected components, Tree diameters, Shortest paths. Target: ${currentRating}`, color: 'border-slate-800 hover:border-cyan-500/30' },
    { icon: BookOpen, title: 'Binary Search on Answer', tag: 'Advanced Drill', tagColor: 'text-violet-400 bg-violet-500/10 border-violet-500/20', desc: `Monotonicity identification, Floating-point search. Target: ${currentRating + 150}`, color: 'border-slate-800 hover:border-violet-500/30' },
  ];

  return (
    <div className="space-y-6 animate-fade-in-up">

      {/* ── Streak Hero ───────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0a0f1e] to-[#060b14] border border-[#1b2b48] rounded-2xl p-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center gap-6 justify-between">
          {/* Left: streak info */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-cyan-500/10 border border-cyan-500/20 rounded-xl flex items-center justify-center">
                <Zap size={17} className="text-cyan-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 font-extrabold">Consistency Tracker</p>
                <p className="text-sm font-bold text-white">Practice at least 1 problem daily to build streaks</p>
              </div>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-6xl font-black text-white leading-none">{currentStreak}</span>
              <div>
                <p className="text-sm font-bold text-cyan-400">Day Streak 🔥</p>
                <p className="text-[11px] text-slate-500">consecutive active days</p>
              </div>
            </div>

            {currentStreak >= 3 && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full w-fit">
                <Flame size={12} /> On fire! Keep it going
              </div>
            )}
          </div>

          {/* Right: heatmap */}
          <div className="space-y-2">
            <div className="grid grid-cols-7 gap-1.5 p-3 bg-[#060b13] rounded-xl border border-slate-900">
              {streakDays.map((day, idx) => {
                const count = submissionsByDay[day.getTime()] || 0;
                const isToday = day.getTime() === today.getTime();
                return (
                  <div
                    key={idx}
                    title={`${day.toLocaleDateString()}: ${count} submission${count !== 1 ? 's' : ''}`}
                    className={`w-7 h-7 rounded border transition-all cursor-help ${getHeatColor(count)} ${isToday ? 'ring-1 ring-cyan-400 ring-offset-1 ring-offset-[#060b13]' : ''}`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-slate-600 px-1">
              <span>28 days ago</span>
              <div className="flex items-center gap-1">
                <span>Less</span>
                <div className="w-2 h-2 rounded bg-slate-900 border border-slate-800" />
                <div className="w-2 h-2 rounded bg-cyan-700" />
                <div className="w-2 h-2 rounded bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.5)]" />
                <span>More</span>
              </div>
              <span>Today</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content Grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Weekly Plan */}
        <div className="lg:col-span-2 bg-[#080e1a] border border-[#121e35] rounded-2xl overflow-hidden">
          <div className="px-6 pt-5 pb-4 border-b border-[#121e35]/70">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <Calendar size={15} className="text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Weekly Practice Plan</h3>
                  <p className="text-[10px] text-slate-500">AI-generated based on your profile</p>
                </div>
              </div>
              <button
                onClick={handleRegenerate}
                disabled={regenLoading}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-cyan-400 bg-slate-900 hover:bg-cyan-500/10 border border-slate-800 hover:border-cyan-500/20 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw size={12} className={regenLoading ? 'animate-spin' : ''} />
                {regenLoading ? 'Generating...' : 'Regenerate'}
              </button>
            </div>

            {/* Progress bar */}
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>{completedCount}/{tasks.length} tasks completed</span>
                <span className="font-bold text-cyan-400">{Math.round(progressPct)}%</span>
              </div>
              <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="px-6 py-5 space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => handleToggle(task.id)}
                className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all group ${
                  task.completed
                    ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/35'
                    : 'bg-slate-900/30 border-slate-800 hover:border-cyan-500/25 hover:bg-slate-900/50'
                }`}
              >
                <div className={`flex-shrink-0 mt-0.5 transition-colors ${task.completed ? 'text-emerald-400' : 'text-slate-600 group-hover:text-slate-400'}`}>
                  {task.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <p className={`text-sm font-semibold leading-snug transition-colors ${task.completed ? 'line-through text-slate-500' : 'text-white group-hover:text-cyan-50'}`}>
                      {task.title}
                    </p>
                    <span className="flex-shrink-0 text-[10px] font-black text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md uppercase">
                      {task.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{task.desc}</p>
                  <p className="text-[10px] text-emerald-400 font-bold mt-2">⚡ Target: {task.difficulty}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Training Plans */}
        <div className="bg-[#080e1a] border border-[#121e35] rounded-2xl overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-[#121e35]/70">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                <Dumbbell size={15} className="text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Training Plans</h3>
                <p className="text-[10px] text-slate-500">Curated skill paths</p>
              </div>
            </div>
          </div>

          <div className="px-5 py-5 space-y-3">
            {trainingPlans.map(({ icon: Icon, title, tag, tagColor, desc, color }) => (
              <div
                key={title}
                className={`relative overflow-hidden bg-[#060b13] border rounded-xl p-4 transition-all group ${color}`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon size={14} className="text-slate-500 group-hover:text-slate-300 transition-colors flex-shrink-0" />
                      <span className="text-xs font-bold text-white leading-snug">{title}</span>
                    </div>
                    <span className={`flex-shrink-0 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border ${tagColor}`}>
                      {tag}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{desc}</p>
                  <button
                    onClick={() => onNavigate('analysis')}
                    className="flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300 font-bold transition-colors group/btn cursor-pointer"
                  >
                    View Problems
                    <ChevronRight size={12} className="group-hover/btn:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
