import React from 'react';

export const TabSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    {/* Metrics row */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-28 bg-slate-200/70 rounded-2xl border border-slate-200" />
      ))}
    </div>
    {/* Main card */}
    <div className="h-72 bg-slate-200/70 rounded-2xl border border-slate-200" />
    {/* Two column cards */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="h-64 bg-slate-200/70 rounded-2xl border border-slate-200" />
      <div className="h-64 bg-slate-200/70 rounded-2xl border border-slate-200" />
    </div>
  </div>
);
