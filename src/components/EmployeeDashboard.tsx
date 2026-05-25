/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
const logoUrl = "https://lh3.googleusercontent.com/d/1Lj5Gm67qUfIYizVoGVdPsXwC6yt-WxgB";
const otherLogoUrl = "https://lh3.googleusercontent.com/d/1FeJm6poQPXmoYKLJd94gGnqdJmkwhiHL";
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, 
  Gift, 
  History, 
  FileText, 
  LogOut, 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  Download,
  Calendar,
  ChevronRight,
  Shield,
  Users,
  AlertCircle
} from 'lucide-react';
import { Employee } from '../types';
import { Avatar, StatusBadge } from './ui/Shared';
import { MetricCard } from './ui/MetricCard';
import { VestingBar } from './ui/VestingBar';
import { 
  calcPortfolioValue, 
  calcPotentialGain, 
  calcTotalVested, 
  calcTotalGranted, 
  fmtCurrency, 
  fmt, 
  fmtDate,
  calculateLiveVested,
  generateVestingSchedule
} from '../lib/utils';
import { subscribeToEmployee, subscribeToCompanySettings, updateEmployeeData, CompanySettings } from '../services/dataService';
import { jsPDF } from 'jspdf';

interface Props {
  user: Employee;
  onLogout: () => void;
}

export const EmployeeDashboard: React.FC<Props> = ({ user: initialUser, onLogout }) => {
  const [user, setUser] = useState<Employee>(initialUser);
  const [activeTab, setActiveTab] = useState("overview");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [nomineeSuccess, setNomineeSuccess] = useState("");
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    currentFMV: 210,
    totalPool: 10000000,
    lastUpdated: new Date().toISOString()
  });

  React.useEffect(() => {
    const unsubUser = subscribeToEmployee(initialUser.id, (userData) => {
      if (userData) setUser(userData);
    });

    const unsubSettings = subscribeToCompanySettings((settings) => {
      setCompanySettings(settings);
    });

    return () => {
      unsubUser();
      unsubSettings();
    };
  }, [initialUser.id]);

  const portfolioValue = calcPortfolioValue(user.grants, companySettings.currentFMV, user.joinDate, user.cliffType);
  const potentialGain = calcPotentialGain(user.grants, companySettings.currentFMV, user.joinDate, user.cliffType);
  const totalVested = calcTotalVested(user.grants, user.joinDate, user.cliffType);
  const totalGranted = calcTotalGranted(user.grants);
  const totalExercised = user.grants.reduce((sum, g) => sum + (g.exercisedShares || 0), 0);
  
  const totalOutstandingVested = Math.max(0, totalVested - totalExercised);
  const totalOutstandingUnvested = Math.max(0, totalGranted - totalVested);
  
  const totalLapsed = user.grants.reduce((sum, g) => g.status === "Expired" ? sum + (g.totalShares - (g.exercisedShares || 0)) : sum, 0);
  
  const totalBuyback = user.transactions
    .filter(t => t.type.toLowerCase() === "buyback" || t.type.toLowerCase() === "surrender")
    .reduce((sum, t) => sum + t.shares, 0);

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "grants", label: "My Grants", icon: Gift },
    { id: "vesting", label: "Vesting Schedule", icon: Calendar },
    { id: "transactions", label: "History", icon: History },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "profile", label: "Security", icon: Shield },
  ];

  const handleDownloadPDF = (docName: string) => {
    const doc = new jsPDF();
    const primaryColor = "#0052FF";
    
    // Header
    doc.setFillColor( primaryColor );
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("TEACHVEST", 20, 25);
    doc.setFontSize(10);
    doc.text("OFFICIAL EQUITY STATEMENT", 20, 32);
    
    // Body
    doc.setTextColor(51, 51, 51);
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 150, 50);
    
    doc.setFont("helvetica", "bold");
    doc.text("Employee Information", 20, 65);
    doc.setDrawColor(230, 230, 230);
    doc.line(20, 68, 190, 68);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Name: ${user.name}`, 20, 75);
    doc.text(`Employee ID: ${user.id}`, 20, 80);
    doc.text(`Department: ${user.department}`, 20, 85);
    doc.text(`Designation: ${user.designation}`, 20, 90);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Equity Summary", 20, 110);
    doc.line(20, 113, 190, 113);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Total Options Granted: ${fmt(totalGranted)} Shares`, 20, 120);
    doc.text(`Total Options Vested: ${fmt(totalVested)} Shares`, 20, 125);
    doc.text(`Total Options Exercised: ${fmt(totalExercised)} Shares`, 20, 130);
    
    if (docName.includes("Grant Letter")) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Grant Details", 20, 150);
      doc.line(20, 153, 190, 153);
      
      const grant = user.grants[0];
      if (grant) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`Grant ID: ${grant.id}`, 20, 160);
        doc.text(`Grant Date: ${fmtDate(grant.grantDate)}`, 20, 165);
        doc.text(`Vesting Schedule: ${grant.vestingSchedule}`, 20, 170);
      }
    }
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("This is an electronically generated document. No signature required.", 105, 280, { align: "center" });
    doc.text("© 2024 TeachVest. Confidental & Restricted.", 105, 285, { align: "center" });
    
    doc.save(`${docName.toLowerCase().replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="min-h-screen bg-bg-base transition-colors duration-300">
      {/* Navbar */}
      <header className="bg-bg-surface border-b border-slate-100 dark:border-slate-800 sticky top-0 z-50 shadow-[0_4px_12px_rgba(0,82,255,0.03)] transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 group">
            <motion.div 
              whileHover={{ rotate: -5, scale: 1.05 }}
              className="w-12 h-12 rounded-2xl bg-white overflow-hidden shadow-xl"
            >
               <img 
                 src={logoUrl} 
                 alt="TeachVest" 
                 className="w-full h-full object-contain p-1"
               />
            </motion.div>
            <div className="flex flex-col min-w-0">
               <img 
                 src={otherLogoUrl} 
                 alt="TeachVest" 
                 className="h-8 object-contain"
                 referrerPolicy="no-referrer"
               />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-3 pr-6 border-r border-slate-100 dark:border-slate-800">
              <Avatar name={user.name} size={40} />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-text-main leading-tight">{user.name}</span>
                <span className="text-[11px] text-brand-primary font-bold uppercase tracking-tight">{user.designation}</span>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="p-2.5 rounded-xl text-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all border border-transparent hover:border-red-100 dark:hover:border-red-900/50"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
          <div>
            <h1 className="text-4xl font-extrabold text-text-main tracking-tight mb-2">My TeachVest Portfolio</h1>
            <p className="text-text-muted font-medium flex items-center gap-3">
              Member ID: <span className="text-brand-primary font-bold">{user.id}</span>
              <span className="w-1.5 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full"></span>
              Joined {fmtDate(user.joinDate)}
            </p>
          </div>
          
          {/* Tab Navigation */}
          <nav className="flex bg-slate-100/80 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 self-start lg:self-auto transition-colors">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-[14px] text-sm font-bold transition-all ${
                  activeTab === tab.id 
                  ? "bg-bg-surface text-brand-primary shadow-lg shadow-brand-primary/10 ring-1 ring-black/5" 
                  : "text-text-muted hover:text-text-main"
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "overview" && (
              <div className="space-y-10">
                {/* Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                  <MetricCard 
                    label="Total Granted Options" 
                    value={fmt(totalGranted)} 
                    sub="Allocated Shares" 
                    icon={<Gift size={20} />} 
                    colorClass="text-brand-accent"
                  />
                  <MetricCard 
                    label="Total Outstanding Vested" 
                    value={fmt(totalOutstandingVested)} 
                    sub="Vested - Exercised" 
                    icon={<CheckCircle2 size={20} />} 
                    colorClass="text-emerald-500"
                  />
                  <MetricCard 
                    label="Total Outstanding Unvested" 
                    value={fmt(totalOutstandingUnvested)} 
                    sub="Vesting Remaining" 
                    icon={<TrendingUp size={20} />} 
                    colorClass="text-brand-primary"
                  />
                  <MetricCard 
                    label="Total Surrendered/Buyback" 
                    value={fmt(totalBuyback)} 
                    sub="Claimed/Returned" 
                    icon={<History size={20} />} 
                    colorClass="text-purple-500"
                  />
                  <MetricCard 
                    label="Total Lapsed Options" 
                    value={fmt(totalLapsed)} 
                    sub="Expired Slots" 
                    icon={<AlertCircle size={20} />} 
                    colorClass="text-rose-500"
                  />
                  <MetricCard 
                    label="Total Exercised Options" 
                    value={fmt(totalExercised)} 
                    sub="Converted to equity" 
                    icon={<CheckCircle2 size={20} />} 
                    colorClass="text-slate-500"
                  />
                </div>

                {/* Grants Section */}
                <div className="bg-bg-surface border border-slate-100 dark:border-slate-800 rounded-3xl p-10 shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition-colors">
                  <div className="flex items-center gap-3 mb-10">
                    <div className="w-2 h-8 bg-brand-primary rounded-full"></div>
                    <h3 className="text-2xl font-extrabold text-text-main">TeachVest Grants</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-8">
                    {user.grants.map(grant => (
                      <div key={grant.id} className="group p-8 rounded-3xl bg-bg-base border border-slate-100 dark:border-slate-800 hover:border-brand-primary/20 hover:shadow-xl hover:shadow-brand-primary/5 transition-all">
                        <div className="flex flex-col lg:flex-row justify-between gap-8 mb-10">
                          <div className="flex gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-bg-surface border border-slate-200 dark:border-slate-700 flex items-center justify-center text-brand-primary group-hover:scale-110 transition-transform shadow-lg shadow-brand-primary/5">
                              <Gift size={28} />
                            </div>
                            <div>
                              <div className="flex items-center gap-4 mb-2">
                                <h4 className="text-xl font-extrabold text-text-main tracking-tight">{grant.id}</h4>
                                <StatusBadge status={grant.status} />
                              </div>
                              <p className="text-sm text-text-muted font-medium flex items-center gap-3">
                                <span className="flex items-center gap-1.5"><Calendar size={16} className="text-slate-400" /> Granted {fmtDate(grant.grantDate)}</span>
                                <span className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full"></span>
                                <span className="font-bold text-brand-primary/80 uppercase tracking-tighter text-xs">{grant.vestingSchedule}</span>
                              </p>
                            </div>
                          </div>
                                                     <div className="flex flex-wrap gap-4">
                            {[
                              { label: 'Shares Available', value: fmt(calculateLiveVested(grant, user.joinDate, user.cliffType) - grant.exercisedShares) },
                              { label: 'Total Shares', value: fmt(grant.totalShares) },
                              { label: 'Exercised Shares', value: fmt(grant.exercisedShares) },
                            ].map(item => (
                              <div key={item.label} className="px-6 py-3 rounded-2xl bg-bg-surface border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center transition-colors">
                                <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest leading-none mb-2">{item.label}</div>
                                <div className="text-base font-bold text-text-main">{item.value}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <VestingBar vested={calculateLiveVested(grant)} exercised={grant.exercisedShares} total={grant.totalShares} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "grants" && (
              <div className="grid grid-cols-1 gap-6">
                {user.grants.map(grant => (
                  <div key={grant.id} className="bg-bg-surface border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm transition-colors">
                    <div className="flex justify-between items-start mb-10">
                      <div>
                        <h3 className="text-2xl font-extrabold text-text-main tracking-tight mb-2">Allocation Details: {grant.id}</h3>
                        <p className="text-text-muted font-medium">Automated quarterly vesting as per Grant Letter</p>
                      </div>
                      <StatusBadge status={grant.status} />
                    </div>
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
                      {[
                        { label: 'Grant Date', value: fmtDate(grant.grantDate), icon: Calendar },
                        { label: 'Total Granted (Units)', value: fmt(grant.totalShares), icon: Gift },
                        { label: 'Vested (Units)', value: fmt(calculateLiveVested(grant, user.joinDate, user.cliffType)), icon: CheckCircle2 },
                        { label: 'Exercised (Units)', value: fmt(grant.exercisedShares), icon: CheckCircle2 },
                      ].map(item => (
                        <div key={item.label} className="p-5 rounded-2xl bg-bg-base border border-slate-100 dark:border-slate-800 transition-colors">
                          <item.icon size={20} className="text-brand-primary mb-3" />
                          <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">{item.label}</div>
                          <div className="text-xl font-bold text-text-main">{item.value}</div>
                        </div>
                      ))}
                    </div>

                    <VestingBar vested={calculateLiveVested(grant, user.joinDate, user.cliffType)} exercised={grant.exercisedShares} total={grant.totalShares} />
                  </div>
                ))}
              </div>
            )}
             {activeTab === "transactions" && (
              <div className="bg-bg-surface border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm transition-colors">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-xl font-bold text-text-main">Transaction History</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-bg-base">
                        {["Date", "Action Type", "Units/Shares"].map(h => (
                          <th key={h} className="px-8 py-5 text-[11px] font-bold text-text-muted uppercase tracking-widest">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 transition-all">
                      {user.transactions.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-8 py-20 text-center text-text-muted font-medium">
                            No transactions recorded yet.
                          </td>
                        </tr>
                      ) : (
                        user.transactions.map((t, idx) => (
                          <tr key={idx} className="group hover:bg-bg-base transition-colors">
                            <td className="px-8 py-6 text-sm font-semibold text-text-main">{fmtDate(t.date)}</td>
                            <td className="px-8 py-6">
                              <StatusBadge status={t.type} />
                            </td>
                            <td className="px-8 py-6 text-sm font-bold text-text-main font-mono">{fmt(t.shares)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "vesting" && (
              <div className="space-y-8 animate-fadeIn">
                {/* Header Information Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 bg-bg-surface shadow-sm rounded-3xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-black tracking-widest text-[#0052FF] block mb-2">Joining Date / ESOP Start</span>
                    <span className="text-2xl font-extrabold text-text-main font-mono">{fmtDate(user.joinDate)}</span>
                  </div>
                  <div className="p-6 bg-bg-surface shadow-sm rounded-3xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-black tracking-widest text-emerald-500 block mb-2">My Vesting Cliff Selection</span>
                    <span className="text-2xl font-extrabold text-text-main font-sans">{user.cliffType || "Annually (Standard)"}</span>
                  </div>
                  <div className="p-6 bg-bg-surface shadow-sm rounded-3xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-black tracking-widest text-brand-accent block mb-2">Total Shares Outstanding</span>
                    <span className="text-2xl font-extrabold text-text-main font-mono">{fmt(totalGranted)} Shares</span>
                  </div>
                </div>

                {user.grants.map(grant => {
                  const schedule = generateVestingSchedule(user.joinDate, grant.totalShares, user.cliffType);
                  const nextMilestones = schedule.filter(m => m.status === "Upcoming");
                  const vestedMilestones = schedule.filter(m => m.status === "Vested");

                  return (
                    <div key={grant.id} className="bg-bg-surface border border-slate-200 dark:border-slate-800 rounded-[32px] p-8 shadow-sm transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                          <div className="text-xs font-black text-brand-primary uppercase tracking-widest mb-1">Schedule Forecast for Allocation</div>
                          <h3 className="text-2xl font-extrabold text-text-main tracking-tight">- Grant ID Reference: {grant.id}</h3>
                        </div>
                        <div className="px-5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 font-mono text-sm font-bold text-text-muted">
                          Multiplier: {fmt(grant.totalShares / 16)} Units / Quarter
                        </div>
                      </div>

                      {/* Summary statistics inside schedule */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center">
                          <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-1">Vested Stages</span>
                          <span className="text-sm font-bold text-emerald-600">{vestedMilestones.length} / {schedule.length} Milestones</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center">
                          <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-1">Next Release</span>
                          <span className="text-sm font-bold text-brand-primary">{nextMilestones[0] ? fmtDate(nextMilestones[0].date) : "Fully Vested"}</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center">
                          <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-1">Upcoming Units</span>
                          <span className="text-sm font-bold text-amber-500 font-mono">{nextMilestones[0] ? `${fmt(nextMilestones[0].toVest)} Units` : "—"}</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center">
                          <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-1">Aggregate Vested</span>
                          <span className="text-sm font-bold text-text-main font-mono">{fmt(totalVested)} Vested Units</span>
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900 transition-colors">
                              <th className="px-8 py-4 text-[10px] font-extrabold text-text-muted uppercase tracking-[0.2em]">Vesting Date</th>
                              <th className="px-8 py-4 text-[10px] font-extrabold text-text-muted uppercase tracking-[0.2em]">To Vest</th>
                              <th className="px-8 py-4 text-[10px] font-extrabold text-text-muted uppercase tracking-[0.2em]">Total Vested</th>
                              <th className="px-8 py-4 text-[10px] font-extrabold text-text-muted uppercase tracking-[0.2em]">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 transition-all">
                            {schedule.map((milestone, idx) => (
                              <tr key={idx} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                                <td className="px-8 py-4.5 text-sm font-bold text-text-main font-mono">{fmtDate(milestone.date)}</td>
                                <td className="px-8 py-4.5 text-sm font-black text-brand-primary font-mono">+{fmt(milestone.toVest)} Units</td>
                                <td className="px-8 py-4.5 text-sm font-extrabold text-text-main font-mono">{fmt(milestone.totalVested)} Units</td>
                                <td className="px-8 py-4.5">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                    milestone.status === "Vested" 
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                  }`}>
                                    <span className={`w-1 h-1 rounded-full ${milestone.status === "Vested" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                                    {milestone.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "documents" && (
              <div className="bg-bg-surface border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm transition-colors">
                <h3 className="text-xl font-bold text-text-main mb-8">Official Documentation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: "ESOP Grant Letter", date: user.grantDate, type: "Grant Letter · PDF", icon: FileText, custom: false, url: "" },
                    { name: "Quarterly Vesting Schedule", date: user.grantDate, type: "Legal · PDF", icon: Calendar, custom: false, url: "" },
                    { name: "Company ESOP Policy - TeachVest", date: "2024-01-15", type: "Guide · PDF", icon: FileText, custom: false, url: "" },
                    { name: "Buy-Back & Exit Policy", date: "2024-04-01", type: "Legal · PDF", icon: DollarSign, custom: false, url: "" },
                    ...(user.documents || []).map((doc: any) => ({
                      name: doc.name,
                      date: doc.uploadedAt || new Date().toISOString(),
                      type: `Custom Document · ${doc.url.split('.').pop()?.toUpperCase() || "PDF"}`,
                      icon: FileText,
                      custom: true,
                      url: doc.url
                    }))
                  ].map((doc, idx) => (
                    <motion.div 
                      key={idx}
                      whileHover={{ x: 5 }}
                      onClick={() => {
                        if (doc.custom && doc.url) {
                          window.open(doc.url, "_blank");
                        } else {
                          handleDownloadPDF(doc.name);
                        }
                      }}
                      className="group flex items-center justify-between p-5 rounded-3xl border border-slate-100 dark:border-slate-800 bg-bg-base hover:bg-brand-secondary/30 dark:hover:bg-brand-secondary/10 hover:border-brand-primary/20 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-bg-surface border border-slate-200 dark:border-slate-700 flex items-center justify-center text-text-muted group-hover:text-brand-primary transition-colors">
                          <doc.icon size={22} />
                        </div>
                        <div>
                          <h4 className="font-bold text-text-main leading-tight group-hover:text-brand-primary transition-colors">{doc.name}</h4>
                          <p className="text-xs text-text-muted font-medium mt-1">{doc.type} • Last Updated {fmtDate(doc.date)}</p>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-bg-surface border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-300 group-hover:text-emerald-500 transition-colors shadow-sm">
                        <Download size={18} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "profile" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn">
                <div className="bg-bg-surface border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm transition-colors">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                      <Shield size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-text-main">Security Settings</h3>
                      <p className="text-xs text-text-muted font-bold uppercase tracking-widest mt-0.5">Manage your user profile & password</p>
                    </div>
                  </div>

                  {successMsg && (
                    <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 size={16} />
                      {successMsg}
                    </div>
                  )}
                  {errorMsg && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      {errorMsg}
                    </div>
                  )}

                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setSuccessMsg("");
                    setErrorMsg("");
                    const form = e.currentTarget;
                    const newPassword = (form.elements.namedItem('newPassword') as HTMLInputElement).value;
                    const confirmPassword = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value;
                    
                    if (!newPassword) {
                      setErrorMsg("Password cannot be empty");
                      return;
                    }
                    if (newPassword !== confirmPassword) {
                      setErrorMsg("New passwords do not match");
                      return;
                    }

                    try {
                      await updateEmployeeData(user.id, { password: newPassword });
                      setSuccessMsg("Password reset successfully!");
                      form.reset();
                    } catch (err) {
                      setErrorMsg("Error resetting password. Please check connection.");
                    }
                  }} className="space-y-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] block">ID Number</label>
                      <input 
                        type="text" 
                        disabled 
                        value={user.id} 
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-text-muted font-extrabold text-sm outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] block">Email / Username</label>
                      <input 
                        type="text" 
                        disabled 
                        value={user.email} 
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-text-muted font-extrabold text-sm outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] block">New Password</label>
                      <input 
                        type="password" 
                        name="newPassword"
                        required
                        placeholder="Enter new account password"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:border-brand-primary outline-none transition-all font-bold text-sm bg-transparent"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] block">Confirm New Password</label>
                      <input 
                        type="password" 
                        name="confirmPassword"
                        required
                        placeholder="Confirm new account password"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:border-brand-primary outline-none transition-all font-bold text-sm bg-transparent"
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="w-full py-4 bg-brand-primary text-white rounded-xl font-bold shadow-lg shadow-brand-primary/20 hover:scale-[1.01] transition-all"
                    >
                      Reset Password
                    </button>
                  </form>
                </div>

                <div className="bg-bg-surface border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm transition-colors flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                        <Users size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-text-main">Nominee Beneficiary Details</h3>
                        <p className="text-xs text-text-muted font-bold uppercase tracking-widest mt-0.5 font-sans">Set up nominee for settlement claim</p>
                      </div>
                    </div>

                    {nomineeSuccess && (
                      <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        {nomineeSuccess}
                      </div>
                    )}

                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      setNomineeSuccess("");
                      const form = e.currentTarget;
                      const nameVal = (form.elements.namedItem('nomineeName') as HTMLInputElement).value.trim();
                      const relationVal = (form.elements.namedItem('nomineeRelation') as HTMLInputElement).value.trim();
                      const contactVal = (form.elements.namedItem('nomineeContact') as HTMLInputElement).value.trim();

                      try {
                        await updateEmployeeData(user.id, {
                          nomineeName: nameVal,
                          nomineeRelation: relationVal,
                          nomineeContact: contactVal
                        });
                        setNomineeSuccess("Nominee details updated successfully!");
                      } catch (err) {
                        console.error(err);
                      }
                    }} className="space-y-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] block">Nominee Full Name</label>
                        <input 
                          type="text" 
                          name="nomineeName"
                          defaultValue={user.nomineeName || ""}
                          required
                          placeholder="e.g. Suman Gupta" 
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:border-brand-primary outline-none transition-all font-bold text-sm bg-transparent"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] block">Relationship</label>
                        <input 
                          type="text" 
                          name="nomineeRelation"
                          defaultValue={user.nomineeRelation || ""}
                          required
                          placeholder="e.g. Spouse / Mother / Brother" 
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:border-brand-primary outline-none transition-all font-bold text-sm bg-transparent"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] block">Contact Number / Email</label>
                        <input 
                          type="text" 
                          name="nomineeContact"
                          defaultValue={user.nomineeContact || ""}
                          required
                          placeholder="e.g. +91 9988776655" 
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:border-brand-primary outline-none transition-all font-bold text-sm bg-transparent"
                        />
                      </div>

                      <button 
                        type="submit" 
                        className="w-full py-4 bg-brand-primary text-white rounded-xl font-bold shadow-lg shadow-brand-primary/20 hover:scale-[1.01] transition-all"
                      >
                        Save Nominee Details
                      </button>
                    </form>
                  </div>

                  {user.customFields && Object.keys(user.customFields).length > 0 && (
                    <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
                      <h4 className="text-xs font-extrabold text-text-muted uppercase tracking-widest mb-4">Additional Information (Custom Profiles)</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(user.customFields).map(([k, v]) => (
                          <div key={k} className="p-4 rounded-2xl bg-bg-base border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-0.5">{k}</span>
                            <span className="text-sm font-extrabold text-text-main">{v as string || "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
