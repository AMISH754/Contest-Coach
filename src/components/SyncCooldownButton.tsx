import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

interface SyncCooldownButtonProps {
  userHandle: string;
  onSync: () => Promise<void>;
  loading: boolean;
  /** Override label (default: 'Sync') */
  label?: string;
  className?: string;
}

/**
 * Isolated cooldown button that owns its own countdown state.
 * Prevents the parent Dashboard from re-rendering 60x during the cooldown.
 */
export const SyncCooldownButton: React.FC<SyncCooldownButtonProps> = ({
  userHandle,
  onSync,
  loading,
  label = 'Sync',
  className = '',
}) => {
  const [cooldown, setCooldown] = useState(0);

  // Rehydrate cooldown from localStorage on mount / handle change
  useEffect(() => {
    const lastSyncStr = localStorage.getItem(`lc_last_sync_${userHandle}`);
    if (lastSyncStr) {
      const elapsed = Math.floor((Date.now() - parseInt(lastSyncStr, 10)) / 1000);
      if (elapsed < 60) {
        setCooldown(60 - elapsed);
      }
    }
  }, [userHandle]);

  // Count down every second — isolated to this component only
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleClick = async () => {
    if (loading || cooldown > 0) return;
    await onSync();
    localStorage.setItem(`lc_last_sync_${userHandle}`, Date.now().toString());
    setCooldown(60);
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading || cooldown > 0}
      className={`text-[10px] bg-[#0a1220] hover:bg-[#0f1d36] text-slate-300 font-bold px-3 py-1.5 rounded-lg border border-[#121e35] flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer ${className}`}
    >
      <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
      {cooldown > 0 ? `${cooldown}s` : label}
    </button>
  );
};
