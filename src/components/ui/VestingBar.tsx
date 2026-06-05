/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { fmt, pct } from '../../lib/utils';

interface VestingBarProps {
  vested: number;
  exercised: number;
  total: number;
}

export const VestingBar: React.FC<VestingBarProps> = ({ vested, exercised, total }) => {
  const vestedPct = pct(vested, total);
  const exercisedPct = pct(exercised, total);

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-3 font-bold">
        <div className="flex flex-col">
          <span className="text-[10px] text-text-muted uppercase tracking-widest leading-none mb-1">Vesting Progress</span>
          <span className="text-lg text-brand-primary font-extrabold leading-none">{vestedPct}%</span>
        </div>
        <span className="text-xs text-text-main tabular-nums">{fmt(vested)} / {fmt(total)} shares</span>
      </div>
      <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative shadow-inner">
        <div 
          className="absolute left-0 top-0 h-full bg-brand-primary/20 rounded-full"
          style={{ width: `${vestedPct}%` }}
        />
        <div 
          className="absolute left-0 top-0 h-full bg-brand-primary rounded-full transition-all duration-700 ease-out"
          style={{ width: `${exercisedPct}%` }}
        />
      </div>
      <div className="flex gap-6 mt-3.5">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-text-muted">
          <div className="w-2.5 h-2.5 rounded-full bg-brand-primary ring-2 ring-brand-primary/10" />
          Exercised
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-text-muted">
          <div className="w-2.5 h-2.5 rounded-full bg-brand-primary/20" />
          Vested
        </div>
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold text-text-muted">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700" />
          Unvested
        </div>
      </div>
    </div>
  );
};
