import React, { useState, useEffect } from 'react';
import { regenerateTasks } from '../api/codeforces';
import type { CFUserInfo, CFSubmission } from '../api/codeforces';
import { Calendar, Dumbbell, ChevronRight, Zap } from 'lucide-react';

interface CoachProps {
  userInfo: CFUserInfo;
  submissions: CFSubmission[];
}

interface TaskItem {
  id: string;
  title: string;
  category: string;
  difficulty: number;
  completed: boolean;
  desc: string;
}

export const Coach: React.FC<CoachProps> = ({ userInfo, submissions }) => {
  const currentRating = userInfo.rating || 1200;

  // 1. Calculate Daily streak
  // Create last 28 days list
  const streakDays = Array.from({ length: 28 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (27 - i));
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const submissionsByDay: { [time: number]: number } = {};
  submissions.forEach(s => {
    const sDate = new Date(s.creationTimeSeconds * 1000);
    sDate.setHours(0, 0, 0, 0);
    const timeVal = sDate.getTime();
    submissionsByDay[timeVal] = (submissionsByDay[timeVal] || 0) + 1;
  });

  // Calculate current active streak
  let currentStreak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let checkDate = new Date(today);
  while (true) {
    const count = submissionsByDay[checkDate.getTime()] || 0;
    if (count > 0) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [regenLoading, setRegenLoading] = useState(false);

  const handleRegenerate = async () => {
    setRegenLoading(true);
    try {
      const data = await regenerateTasks(userInfo.handle);
      const mapped: TaskItem[] = data.map((t: any) => ({
        id: t.id,
        title: t.title,
        category: t.category,
        difficulty: t.difficulty,
        completed: t.completed,
        desc: t.desc
      }));
      setTasks(mapped);
    } catch (err) {
      console.warn('Failed to regenerate practice plan:', err);
    } finally {
      setRegenLoading(false);
    }
  };

  // Fetch tasks on mount
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/user/${userInfo.handle}/tasks`);
        const json = await response.json();
        if (json.status === 'OK' && json.result && json.result.length > 0) {
          // Map database structure to TaskItem
          const mapped: TaskItem[] = json.result.map((t: any) => ({
            id: t.id,
            title: t.title,
            category: t.category,
            difficulty: t.difficulty,
            completed: t.completed,
            desc: t.desc
          }));
          setTasks(mapped);
        } else {
          // Generate default client-side fallback if backend tasks is empty
          generateFallbackTasks();
        }
      } catch (err) {
        console.warn('Failed to fetch tasks from backend database, using client fallbacks:', err);
        generateFallbackTasks();
      }
    };

    const generateFallbackTasks = () => {
      setTasks([
        {
          id: 'task-1',
          title: 'Master Greedy Choice Property',
          category: 'Greedy',
          difficulty: currentRating + 100,
          completed: false,
          desc: 'Solve 2 problems with rating ' + (currentRating + 100) + ' featuring the "greedy" tag. Focus on proving correctness before typing.'
        },
        {
          id: 'task-2',
          title: 'Practice Under Pressure (Virtual Contest)',
          category: 'Simulation',
          difficulty: currentRating,
          completed: false,
          desc: 'Run a virtual contest on any past Div. 3 or Div. 2 round. Try to solve problems A and B within the first 45 minutes.'
        },
        {
          id: 'task-3',
          title: 'Topic Upsolving Challenge',
          category: 'Dynamic Programming',
          difficulty: currentRating + 200,
          completed: false,
          desc: 'Select your last contest rating drop, locate the first problem you failed to solve in-contest, and up-solve it.'
        },
        {
          id: 'task-4',
          title: 'Speed & Accuracy Drill',
          category: 'Math / Implementation',
          difficulty: Math.max(800, currentRating - 200),
          completed: true, // Mark one complete to show visual
          desc: 'Solve 3 problems of rating ' + Math.max(800, currentRating - 200) + ' with exactly 0 wrong submissions. Focus on speed.'
        }
      ]);
    };

    fetchTasks();
  }, [userInfo.handle, currentRating]);

  const toggleTask = async (id: string) => {
    // 1. Trigger backend toggle endpoint
    try {
      const response = await fetch(`http://localhost:5000/api/user/${userInfo.handle}/tasks/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ taskId: id })
      });
      const json = await response.json();
      if (json.status === 'OK') {
        // Toggle locally
        setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
      }
    } catch (err) {
      console.warn('Failed to toggle task in PostgreSQL backend, falling back to local toggle:', err);
      // Fallback
      setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    }
  };

  const getHeatmapColor = (count: number) => {
    if (!count || count === 0) return 'bg-slate-900 border-slate-800';
    if (count === 1) return 'bg-cyan-950/65 border-cyan-850';
    if (count <= 3) return 'bg-cyan-700/60 border-cyan-600';
    return 'bg-cyan-500 border-cyan-400';
  };

  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. Daily Activity Streak */}
      <div className="glass-card p-6 rounded-2xl flex flex-col lg:flex-row justify-between items-center gap-6">
        <div className="space-y-2 text-center lg:text-left">
          <h3 className="text-lg font-bold text-white flex items-center justify-center lg:justify-start gap-2">
            <Zap size={20} className="text-cyan-400" />
            Consistency Streak Tracker
          </h3>
          <p className="text-xs text-slate-400">Practicing regularly is the secret to scaling the ranks. Solve at least 1 problem daily.</p>
          <div className="flex justify-center lg:justify-start items-baseline gap-2 pt-2">
            <span className="text-4xl font-black text-cyan-400">{currentStreak}</span>
            <span className="text-sm text-slate-400 font-semibold">Days Active Streak</span>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="space-y-2">
          <div className="grid grid-cols-7 gap-1.5 p-3 bg-slate-950/50 rounded-xl border border-slate-900">
            {streakDays.map((day, idx) => {
              const count = submissionsByDay[day.getTime()] || 0;
              return (
                <div 
                  key={idx} 
                  title={`${day.toLocaleDateString()}: ${count} submissions`}
                  className={`w-7 h-7 rounded border transition-colors cursor-help ${getHeatmapColor(count)}`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 px-1">
            <span>28 days ago</span>
            <div className="flex items-center gap-1">
              <span>Less</span>
              <span className="w-2.5 h-2.5 rounded bg-slate-900 border border-slate-800"></span>
              <span className="w-2.5 h-2.5 rounded bg-cyan-700"></span>
              <span className="w-2.5 h-2.5 rounded bg-cyan-500"></span>
              <span>More</span>
            </div>
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* 2. Practice Roadmap (Phase 4 MVP) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Roadmap Card */}
        <div className="glass-card p-6 rounded-2xl lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar size={18} className="text-cyan-400" />
              Dynamic Weekly Plan
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400">
                Progress: {completedCount}/{tasks.length} ({tasks.length > 0 ? ((completedCount / tasks.length) * 100).toFixed(0) : 0}%)
              </span>
              <button
                onClick={handleRegenerate}
                disabled={regenLoading}
                className="text-xs font-bold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 px-3 py-1 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
              >
                {regenLoading ? 'Regenerating...' : 'Regenerate Plan'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {tasks.map((task) => (
              <div 
                key={task.id}
                onClick={() => toggleTask(task.id)}
                className={`glass-panel p-4 rounded-xl border cursor-pointer flex items-start gap-4 transition-all hover:bg-slate-800/20 ${task.completed ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-slate-800 hover:border-cyan-500/20'}`}
              >
                <div className="mt-1">
                  <input 
                    type="checkbox" 
                    checked={task.completed} 
                    onChange={() => {}} // toggled by parent div click
                    className="w-5 h-5 rounded border-slate-700 bg-slate-900 text-cyan-500 cursor-pointer focus:ring-0 focus:ring-offset-0"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-start">
                    <h4 className={`text-sm font-bold ${task.completed ? 'line-through text-slate-500' : 'text-white'}`}>
                      {task.title}
                    </h4>
                    <span className="text-xs bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded uppercase font-semibold">
                      {task.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{task.desc}</p>
                  <div className="pt-2 flex items-center gap-2 text-[10px] font-bold text-emerald-400">
                    <span>Target Difficulty: {task.difficulty}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Topic-focused learning plans */}
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Dumbbell size={18} className="text-rose-400" />
            Training Recommendations
          </h3>
          <p className="text-xs text-slate-400">We recommend focusing on these custom skill plans based on your weaknesses:</p>

          <div className="space-y-3">
            <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2 hover:border-rose-500/20 transition-all">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-white">Dynamic Programming 101</span>
                <span className="text-rose-400 font-extrabold">Highly Recommended</span>
              </div>
              <p className="text-xs text-slate-400">Focus: Knapsack variations, Digit DP basics, State compression. Recommended problem target range: <span className="font-bold text-slate-300">{currentRating + 100} - {currentRating + 300}</span>.</p>
              <button className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 pt-1">
                Begin Plan <ChevronRight size={14} />
              </button>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2 hover:border-cyan-500/20 transition-all">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-white">Graph Traversals (DFS/BFS)</span>
                <span className="text-slate-400">Standard Path</span>
              </div>
              <p className="text-xs text-slate-400">Focus: Connected components, Tree diameters, Shortest path trees. Target rating: <span className="font-bold text-slate-300">{currentRating}</span>.</p>
              <button className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 pt-1">
                Begin Plan <ChevronRight size={14} />
              </button>
            </div>

            <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-2 hover:border-cyan-500/20 transition-all">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-white">Binary Search on Answer</span>
                <span className="text-slate-400">Advanced Drill</span>
              </div>
              <p className="text-xs text-slate-400">Focus: Monotonicity identification, Floating-point search. Target rating: <span className="font-bold text-slate-300">{currentRating + 150}</span>.</p>
              <button className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 pt-1">
                Begin Plan <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
