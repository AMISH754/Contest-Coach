import React from 'react';

export const TabSkeleton: React.FC = () => (
  <div className="space-y-5 animate-pulse">
    {/* Metrics row */}
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-24 bg-slate-800/50 rounded-2xl border border-slate-800/40" />
      ))}
    </div>
    {/* Charts row */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 h-64 bg-slate-800/50 rounded-2xl border border-slate-800/40" />
      <div className="h-64 bg-slate-800/50 rounded-2xl border border-slate-800/40" />
    </div>
    {/* Bottom row */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="h-48 bg-slate-800/50 rounded-2xl border border-slate-800/40" />
      <div className="lg:col-span-2 h-48 bg-slate-800/50 rounded-2xl border border-slate-800/40" />
    </div>
  </div>
);
