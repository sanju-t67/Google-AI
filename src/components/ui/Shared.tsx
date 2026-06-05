/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface BadgeProps {
  status: string;
}

export const StatusBadge: React.FC<BadgeProps> = ({ status }) => {
  const getColors = () => {
    switch (status) {
      case "Active":
      case "Vesting":
        return "bg-brand-secondary text-brand-primary dark:bg-slate-800/40 dark:text-brand-primary/90 border border-brand-primary/10 dark:border-brand-primary/30";
      case "Fully Vested":
        return "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30";
      case "Expired":
        return "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-100 dark:border-red-900/30";
      case "Exercise":
        return "bg-blue-50 text-blue-500 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30";
      default:
        return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700/50";
    }
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${getColors()}`}>
      {status}
    </span>
  );
};

interface AvatarProps {
  name: string;
  size?: number;
}

export const Avatar: React.FC<AvatarProps> = ({ name, size = 36 }) => {
  const initials = name?.split(" ").map(w => w[0]).slice(0, 2).join("") || "??";
  return (
    <div 
      className="rounded-full bg-brand-primary/10 text-brand-primary font-semibold flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
};
