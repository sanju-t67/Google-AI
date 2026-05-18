/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
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
  Shield // Added Shield
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
  calculateLiveVested
} from '../lib/utils';
import { subscribeToEmployee, subscribeToCompanySettings, CompanySettings } from '../services/dataService';
import { jsPDF } from 'jspdf';

interface Props {
  user: Employee;
  onLogout: () => void;
}

export const EmployeeDashboard: React.FC<Props> = ({ user: initialUser, onLogout }) => {
  const [user, setUser] = useState<Employee>(initialUser);
  const [activeTab, setActiveTab] = useState("overview");
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

  const portfolioValue = calcPortfolioValue(user.grants, companySettings.currentFMV);
  const potentialGain = calcPotentialGain(user.grants, companySettings.currentFMV);
  const totalVested = calcTotalVested(user.grants);
  const totalGranted = calcTotalGranted(user.grants);

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "grants", label: "My Grants", icon: Gift },
    { id: "transactions", label: "History", icon: History },
    { id: "documents", label: "Documents", icon: FileText },
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
    doc.text(`Current Portfolio Value: ${fmtCurrency(portfolioValue)}`, 20, 130);
    doc.text(`Potential Portfolio Gain: ${fmtCurrency(potentialGain)}`, 20, 135);
    
    if (docName.includes("Grant Letter")) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Grant Details", 20, 155);
      doc.line(20, 158, 190, 158);
      
      const grant = user.grants[0];
      if (grant) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`Grant ID: ${grant.id}`, 20, 165);
        doc.text(`Grant Date: ${fmtDate(grant.grantDate)}`, 20, 170);
        doc.text(`Strike Price: ${fmtCurrency(grant.strikePrice)}`, 20, 175);
        doc.text(`Vesting Schedule: ${grant.vestingSchedule}`, 20, 180);
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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center text-white shadow-lg shadow-brand-primary/20">
              <Shield size={24} />
            </div>
            <span className="text-xl font-extrabold text-text-main tracking-tight">TeachVest</span>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <MetricCard 
                    label="Portfolio Value" 
                    value={fmtCurrency(portfolioValue)} 
                    sub="Current FMV Valuation" 
                    icon={<DollarSign size={20} />} 
                    colorClass="text-emerald-500"
                  />
                  <MetricCard 
                    label="Potential Gain" 
                    value={fmtCurrency(potentialGain)} 
                    sub="Est. Gross Benefit" 
                    icon={<TrendingUp size={20} />} 
                    colorClass="text-brand-primary"
                    trend="up"
                  />
                  <MetricCard 
                    label="Vested Shares" 
                    value={fmt(totalVested)} 
                    sub={`of ${fmt(totalGranted)} granted`} 
                    icon={<CheckCircle2 size={20} />} 
                    colorClass="text-blue-500"
                  />
                  <MetricCard 
                    label="Total Grants" 
                    value={user.grants.length} 
                    sub="Active Allocations" 
                    icon={<Gift size={20} />} 
                    colorClass="text-brand-accent"
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
                              { label: 'Strike Price', value: fmtCurrency(grant.strikePrice) },
                              { label: 'Current FMV', value: fmtCurrency(grant.currentFMV) },
                              { label: 'Shares Available', value: fmt(calculateLiveVested(grant) - grant.exercisedShares) },
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
                        { label: 'Total Granted', value: fmt(grant.totalShares), icon: Gift },
                        { label: 'Strike Price', value: fmtCurrency(grant.strikePrice), icon: DollarSign },
                        { label: 'Current Value', value: fmtCurrency(grant.currentFMV), icon: TrendingUp },
                      ].map(item => (
                        <div key={item.label} className="p-5 rounded-2xl bg-bg-base border border-slate-100 dark:border-slate-800 transition-colors">
                          <item.icon size={20} className="text-brand-primary mb-3" />
                          <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">{item.label}</div>
                          <div className="text-xl font-bold text-text-main">{item.value}</div>
                        </div>
                      ))}
                    </div>

                    <VestingBar vested={calculateLiveVested(grant)} exercised={grant.exercisedShares} total={grant.totalShares} />
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
                        {["Date", "Action Type", "Shares", "FMV", "Potential Gain"].map(h => (
                          <th key={h} className="px-8 py-5 text-[11px] font-bold text-text-muted uppercase tracking-widest">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 transition-all">
                      {user.transactions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-8 py-20 text-center text-text-muted font-medium">
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
                            <td className="px-8 py-6 text-sm font-bold text-text-main font-mono">{fmtCurrency(t.fmv)}</td>
                            <td className={`px-8 py-6 text-sm font-bold font-mono ${t.gain ? 'text-emerald-600' : 'text-text-muted'}`}>
                              {t.gain ? `+ ${fmtCurrency(t.gain)}` : "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "documents" && (
              <div className="bg-bg-surface border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm transition-colors">
                <h3 className="text-xl font-bold text-text-main mb-8">Official Documentation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: "ESOP Grant Letter", date: user.grantDate, type: "Grant Letter · PDF", icon: FileText },
                    { name: "Quarterly Vesting Schedule", date: user.grantDate, type: "Legal · PDF", icon: Calendar },
                    { name: "Company ESOP Policy - TeachVest", date: "2024-01-15", type: "Guide · PDF", icon: FileText },
                    { name: "Buy-Back & Exit Policy", date: "2024-04-01", type: "Legal · PDF", icon: DollarSign },
                  ].map((doc, idx) => (
                    <motion.div 
                      key={idx}
                      whileHover={{ x: 5 }}
                      onClick={() => handleDownloadPDF(doc.name)}
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
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
