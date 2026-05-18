/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { ReactNode } from 'react';
import { motion } from 'motion/react';

interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: ReactNode;
  colorClass?: string;
  trend?: 'up' | 'down';
}

export const MetricCard: React.FC<MetricCardProps> = ({ 
  label, value, sub, icon, colorClass = "text-brand-primary", trend 
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-100 rounded-3xl p-6 flex flex-col gap-3 shadow-[0_4px_12px_rgba(0,82,255,0.03)] hover:shadow-[0_8px_24px_rgba(0,82,255,0.08)] transition-all"
    >
      <div className="flex justify-between items-start">
        <span className="text-[11px] font-bold text-text-muted uppercase tracking-widest">{label}</span>
        <div className={`p-2.5 rounded-xl bg-brand-secondary ${colorClass}`}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-extrabold text-text-main tracking-tight">{value}</div>
      {sub && (
        <div className={`text-[11px] font-bold flex items-center gap-1.5 ${
          trend === 'up' ? 'text-emerald-500' : 
          trend === 'down' ? 'text-red-500' : 
          'text-text-muted'
        }`}>
          {trend === 'up' && (
            <div className="w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center">
              <span className="text-[10px]">↑</span>
            </div>
          )}
          {trend === 'down' && (
             <div className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center">
               <span className="text-[10px]">↓</span>
             </div>
          )}
          {sub}
        </div>
      )}
    </motion.div>
  );
};
