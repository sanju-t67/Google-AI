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
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -8, scale: 1.02, rotateX: 2, rotateY: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[32px] p-8 flex flex-col gap-4 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06)] hover:shadow-[0_25px_60px_-15px_rgba(0,82,255,0.15)] transition-all cursor-default perspective-1000"
    >
      <div className="flex justify-between items-start">
        <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">{label}</span>
        <div className={`p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 shadow-inner ${colorClass}`}>
          {icon}
        </div>
      </div>
      <div>
        <div className="text-3xl font-black text-text-main tracking-tight mb-1">{value}</div>
        {sub && (
          <div className={`text-[11px] font-extrabold flex items-center gap-2 ${
            trend === 'up' ? 'text-emerald-500' : 
            trend === 'down' ? 'text-red-500' : 
            'text-text-muted'
          }`}>
            <span className="bg-current/10 px-2 py-0.5 rounded-full">
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '•'} {sub}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};
