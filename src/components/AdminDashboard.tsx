/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, 
  Users, 
  Gift, 
  Settings, 
  LogOut, 
  Search, 
  Filter, 
  TrendingUp, 
  UserPlus, 
  ArrowLeft,
  Calendar,
  DollarSign,
  Briefcase,
  CheckCircle2, 
  ChevronRight,
  Database,
  ExternalLink,
  ShieldCheck,
  Building,
  Upload,
  Shield // Added Shield
} from 'lucide-react';
import { Admin, Employee, Grant } from '../types';
import { Avatar, StatusBadge } from './ui/Shared';
import { MetricCard } from './ui/MetricCard';
import { VestingBar } from './ui/VestingBar';
import { MOCK_EMPLOYEES, MOCK_ADMINS } from '../constants';
import { 
  calcPortfolioValue, 
  calcTotalVested, 
  calcTotalGranted, 
  calcPotentialGain,
  fmtCurrency, 
  fmt, 
  fmtDate,
  pct,
  calculateLiveVested
} from '../lib/utils';
import { AddEmployeeModal, EditEmployeeModal, BulkUploadModal, ManageGrantsModal } from './AdminModals';
import { 
  subscribeToEmployees, 
  subscribeToCompanySettings, 
  updateCompanySettings, 
  updateEmployeeData, 
  createEmployee,
  createAdmin,
  CompanySettings
} from '../services/dataService';
import Papa from 'papaparse';
import { auth } from '../lib/firebase';

interface Props {
  user: Admin;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<Props> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [employees, setEmployees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [loading, setLoading] = useState(true);
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    currentFMV: 210,
    totalPool: 10000000,
    lastUpdated: new Date().toISOString()
  });

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isGrantsModalOpen, setIsGrantsModalOpen] = useState(false);

  React.useEffect(() => {
    // Seed admins first
    const currentUid = auth.currentUser?.uid;
    if (currentUid && user.role === 'admin') {
      createAdmin(user, currentUid).catch(console.error);
    }
    MOCK_ADMINS.forEach(a => createAdmin(a).catch(console.error));

    const unsubEmployees = subscribeToEmployees((data) => {
      setLoading(false);
      if (data.length < MOCK_EMPLOYEES.length) {
        // Restore missing mocks to Firestore to ensure "data removed" is fixed
        MOCK_EMPLOYEES.forEach(mockEmp => {
          if (!data.find(d => d.id === mockEmp.id || d.email === mockEmp.email)) {
             createEmployee(mockEmp).catch(console.error);
          }
        });
      } else {
        setEmployees(data);
      }
    });

    const unsubSettings = subscribeToCompanySettings((settings) => {
      setCompanySettings(settings);
    });

    return () => {
      unsubEmployees();
      unsubSettings();
    };
  }, []);

  const handleAddEmployee = async (newEmp: Employee) => {
    await createEmployee(newEmp);
  };

  const handleEditEmployee = async (updatedEmp: Employee) => {
    await updateEmployeeData(updatedEmp.id, updatedEmp);
  };

  const handleBulkUpload = async (newEmployees: Employee[]) => {
    for (const emp of newEmployees) {
      await createEmployee(emp);
    }
  };

  const departments = ["All", ...Array.from(new Set(employees.map(e => e.department)))];

  const filteredEmployees = employees.filter(e => 
    (deptFilter === "All" || e.department === deptFilter) &&
    (e.name.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase()))
  );

  const stats = {
    totalEmployees: employees.length,
    totalPortfolio: employees.reduce((s, e) => s + calcPortfolioValue(e.grants, companySettings.currentFMV), 0),
    totalGranted: employees.reduce((s, e) => s + calcTotalGranted(e.grants), 0),
    totalVested: employees.reduce((s, e) => s + calcTotalVested(e.grants), 0),
    totalExercised: employees.reduce((s, e) => s + e.grants.reduce((sum, g) => sum + g.exercisedShares, 0), 0)
  };

  const handleExportCSV = () => {
    const data = employees.map(e => ({
      ID: e.id,
      Name: e.name,
      Email: e.email,
      Department: e.department,
      Designation: e.designation,
      JoinDate: e.joinDate,
      TotalGrants: e.grants.length,
      TotalShares: calcTotalGranted(e.grants),
      VestedShares: calcTotalVested(e.grants),
      PortfolioValue: calcPortfolioValue(e.grants, companySettings.currentFMV)
    }));
    
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `TeachVest_Employee_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const navItems = [
    { id: "overview", label: "Dashboard", icon: BarChart3 },
    { id: "employees", label: "Employees", icon: Users },
    { id: "grants", label: "Pool Management", icon: Gift },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-bg-base flex transition-colors duration-300">
      {/* Sidebar - Teachmint style sidebar */}
      <aside className="w-72 bg-bg-surface border-r border-slate-100 dark:border-slate-800 flex flex-col sticky top-0 h-screen z-50 transition-colors">
        <div className="p-8 pb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center text-white shadow-lg shadow-brand-primary/20">
              <Shield size={24} />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-text-main">TeachVest</span>
          </div>
          <p className="text-brand-primary/60 text-[10px] uppercase font-bold tracking-[0.2em] mt-4">Admin Console</p>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setSelectedEmployee(null); }}
              className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all group ${
                activeTab === item.id 
                ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/25" 
                : "text-text-muted hover:text-brand-primary hover:bg-brand-primary/5 dark:hover:bg-brand-primary/10"
              }`}
            >
              <item.icon size={20} className={activeTab === item.id ? "text-white" : "text-text-muted group-hover:text-brand-primary"} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-50 dark:border-slate-800 bg-bg-base/50">
          <div className="flex items-center gap-4 mb-4 select-none">
            <Avatar name={user.name} size={40} />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold truncate text-text-main leading-tight">{user.name}</span>
              <span className="text-[10px] text-brand-primary font-bold uppercase tracking-widest">{user.role}</span>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-bg-surface border border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 hover:border-red-100 dark:hover:border-red-900/50 text-sm font-bold transition-all shadow-sm"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <header className="h-20 border-b border-slate-100 dark:border-slate-800 bg-bg-surface/80 backdrop-blur-md sticky top-0 z-40 px-8 flex items-center justify-between transition-colors">
          <h2 className="text-lg font-extrabold text-text-main tracking-tight uppercase tracking-wider text-xs">
            {selectedEmployee ? `Profile: ${selectedEmployee.name}` : navItems.find(i => i.id === activeTab)?.label}
          </h2>
          
          <div className="flex items-center gap-4">
             <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-brand-primary/5 border border-brand-primary/10 text-brand-primary rounded-xl text-xs font-bold transition-colors">
               <Database size={14} />
               Server: Stable
             </button>
          </div>
        </header>

        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (selectedEmployee?.id || '')}
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "overview" && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <MetricCard 
                      label="AUM (ESOP)" 
                      value={fmtCurrency(stats.totalPortfolio)} 
                      icon={<Building size={20} />} 
                      colorClass="text-brand-primary"
                    />
                    <MetricCard 
                      label="Tokens Allocated" 
                      value={fmt(stats.totalGranted)} 
                      icon={<Gift size={20} />} 
                      colorClass="text-brand-accent"
                    />
                    <MetricCard 
                      label="Vesting Progress" 
                      value={`${pct(stats.totalVested, stats.totalGranted)}%`} 
                      sub={`${fmt(stats.totalVested)} Vested`}
                      icon={<TrendingUp size={20} />} 
                      colorClass="text-blue-500"
                    />
                    <MetricCard 
                      label="Exercise Rate" 
                      value={`${pct(stats.totalExercised, stats.totalVested)}%`} 
                      sub={`${fmt(stats.totalExercised)} Exercised`}
                      icon={<ShieldCheck size={20} />} 
                      colorClass="text-emerald-500"
                    />
                  </div>

                  <div className="bg-bg-surface border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition-colors">
                    <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                      <h3 className="text-xl font-extrabold text-text-main">Top TeachVest Stakeholders</h3>
                      <button 
                        onClick={() => setActiveTab("employees")}
                        className="text-xs font-bold text-brand-primary hover:bg-brand-primary/5 px-4 py-2 rounded-xl transition-all flex items-center gap-1 uppercase tracking-widest"
                      >
                        Management <ChevronRight size={16} />
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-bg-base/50">
                            {["Employee", "Identity", "Equity Valuation", "Grant Allocation", "Vesting Status", ""].map(h => (
                               <th key={h} className="px-8 py-5 text-[10px] font-bold text-text-muted uppercase tracking-widest">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                          {employees.slice(0, 5).map(e => (
                            <tr key={e.id} className="group hover:bg-bg-base transition-colors">
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-3">
                                  <Avatar name={e.name} size={40} />
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold text-text-main leading-tight">{e.name}</span>
                                    <span className="text-xs text-text-muted font-medium">{e.email}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-text-main uppercase tracking-tighter">{e.department}</span>
                                  <span className="text-[11px] text-text-muted">{e.designation}</span>
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <span className="text-sm font-bold text-text-main font-mono">{fmtCurrency(calcPortfolioValue(e.grants, companySettings.currentFMV))}</span>
                              </td>
                              <td className="px-8 py-6">
                                <span className="text-sm font-bold text-text-main font-mono">{fmt(calcTotalGranted(e.grants))}</span>
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-brand-primary transition-all duration-500" 
                                      style={{ width: `${pct(calcTotalVested(e.grants), calcTotalGranted(e.grants))}%` }} 
                                    />
                                  </div>
                                  <span className="text-xs font-bold text-text-main">{pct(calcTotalVested(e.grants), calcTotalGranted(e.grants))}%</span>
                                </div>
                              </td>
                              <td className="px-8 py-6 text-right">
                                <button 
                                  onClick={() => setSelectedEmployee(e)}
                                  className="w-10 h-10 rounded-xl bg-bg-surface border border-slate-100 dark:border-slate-800 text-slate-300 hover:text-brand-primary hover:border-brand-primary/30 transition-all flex items-center justify-center shadow-sm"
                                >
                                  <ChevronRight size={18} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "employees" && !selectedEmployee && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div className="flex items-center gap-3 bg-bg-surface px-6 py-4 rounded-3xl border border-slate-100 dark:border-slate-800 w-full max-w-md shadow-sm transition-colors">
                      <Search size={22} className="text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search Identity, Email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none text-sm font-semibold placeholder:text-slate-400 text-text-main"
                      />
                    </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button 
                          onClick={handleExportCSV}
                          className="flex items-center justify-center p-3.5 bg-bg-surface border border-slate-200 dark:border-slate-800 text-text-muted hover:text-brand-primary rounded-2xl shadow-sm transition-all"
                          title="Export Employees CSV"
                        >
                          <Upload size={20} className="rotate-180" />
                        </button>
                        <div className="flex items-center gap-2 bg-bg-surface px-5 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
                          <Filter size={18} className="text-slate-400" />
                          <select 
                            value={deptFilter}
                            onChange={(e) => setDeptFilter(e.target.value)}
                            className="bg-transparent border-none outline-none text-[11px] font-extrabold text-text-muted cursor-pointer uppercase tracking-widest"
                          >
                            {departments.map(d => <option key={d}>{d}</option>)}
                          </select>
                        </div>
                        <button 
                          onClick={() => setIsBulkModalOpen(true)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-bg-surface border border-slate-200 dark:border-slate-800 text-text-main rounded-2xl text-sm font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-mono"
                        >
                          CSV
                        </button>
                        <button 
                          onClick={() => setIsAddModalOpen(true)}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 bg-brand-primary text-white rounded-2xl text-sm font-bold shadow-xl shadow-brand-primary/20 hover:scale-[1.02] transition-all"
                        >
                          <UserPlus size={18} />
                          New Member
                        </button>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEmployees.map(e => (
                      <motion.div 
                        layout
                        key={e.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-bg-surface border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-sm hover:shadow-[0_20px_60px_-15px_rgba(0,82,255,0.08)] hover:border-brand-primary/30 transition-all cursor-pointer group relative overflow-hidden"
                        onClick={() => setSelectedEmployee(e)}
                      >
                         <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-lg"><ChevronRight size={16} /></div>
                         </div>

                        <div className="flex justify-between items-start mb-8">
                          <Avatar name={e.name} size={56} />
                          <div className="text-[10px] font-bold bg-brand-primary/10 text-brand-primary px-3 py-1.5 rounded-xl uppercase tracking-widest">{e.id}</div>
                        </div>
                        
                        <div className="mb-8">
                          <h4 className="text-xl font-extrabold text-text-main leading-tight mb-1 group-hover:text-brand-primary transition-colors tracking-tight">{e.name}</h4>
                          <p className="text-sm text-text-muted font-medium">{e.designation}</p>
                          <div className="flex items-center gap-1 mt-3 px-3 py-1 bg-bg-base dark:bg-slate-800 rounded-lg w-fit text-xs font-bold text-brand-primary transition-colors">
                            <Building size={12} className="mr-1" />
                            {e.department}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pb-8 mb-8 border-b border-slate-50 dark:border-slate-800 font-mono">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">Allocated</span>
                            <span className="text-base font-bold text-text-main">{fmt(calcTotalGranted(e.grants))}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-widest mb-1">Portfolio</span>
                            <span className="text-base font-bold text-emerald-600 transition-colors">{fmtCurrency(calcPortfolioValue(e.grants, companySettings.currentFMV))}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest">
                          <span className="text-text-muted">Vesting Status</span>
                          <span className="text-brand-primary">{pct(calcTotalVested(e.grants), calcTotalGranted(e.grants))}%</span>
                        </div>
                        <div className="w-full h-2 bg-bg-base dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
                          <div 
                            className="h-full bg-brand-primary rounded-full transition-all duration-700 ease-out shadow-[0_0_12px_rgba(0,82,255,0.4)]"
                            style={{ width: `${pct(calcTotalVested(e.grants), calcTotalGranted(e.grants))}%` }}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "employees" && selectedEmployee && (
                <div className="space-y-8">
                  <div className="flex items-center justify-between mb-2">
                    <button 
                      onClick={() => setSelectedEmployee(null)}
                      className="flex items-center gap-2 text-text-muted hover:text-brand-primary font-bold transition-all px-4 py-2 rounded-2xl hover:bg-brand-primary/5"
                    >
                      <ArrowLeft size={20} />
                      Stakeholder Directory
                    </button>
                    <div className="flex items-center gap-3">
                       <button 
                        onClick={() => setIsEditModalOpen(true)}
                        className="px-6 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-bg-surface text-text-main text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
                       >
                        Edit Profile
                       </button>
                       <button 
                        onClick={() => setIsGrantsModalOpen(true)}
                        className="px-8 py-3 rounded-2xl bg-brand-primary text-white text-sm font-bold shadow-xl shadow-brand-primary/25 hover:scale-[1.02] transition-all"
                       >
                        Manage TeachVest
                       </button>
                    </div>
                  </div>

                  <div className="bg-bg-surface border border-slate-100 dark:border-slate-800 rounded-[32px] p-12 shadow-sm transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center gap-12 mb-16">
                      <div className="relative">
                        <Avatar name={selectedEmployee.name} size={120} />
                        <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center border-4 border-bg-surface shadow-xl">
                          <CheckCircle2 size={24} />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-4 mb-4">
                          <h1 className="text-5xl font-extrabold text-text-main tracking-tighter leading-none">{selectedEmployee.name}</h1>
                          <span className="bg-brand-primary text-white px-4 py-1.5 rounded-2xl text-[10px] font-extrabold uppercase tracking-[0.2em]">{selectedEmployee.id}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-y-3 gap-x-8 text-sm font-bold text-text-muted mb-8 uppercase tracking-widest">
                           <span className="flex items-center gap-2">
                             <Briefcase size={18} className="text-brand-primary" />
                             {selectedEmployee.designation} • {selectedEmployee.department}
                           </span>
                           <span className="flex items-center gap-2">
                             <Calendar size={18} className="text-brand-primary" />
                             Started {fmtDate(selectedEmployee.joinDate)}
                           </span>
                        </div>
                        <div className="flex flex-wrap gap-6">
                           <div className="px-8 py-6 bg-bg-base dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 min-w-48 shadow-sm">
                             <div className="text-[10px] font-extrabold text-brand-primary uppercase tracking-[0.15em] mb-2">Net Portfolio (₹)</div>
                             <div className="text-3xl font-extrabold text-emerald-600 font-mono tracking-tighter">{fmtCurrency(calcPortfolioValue(selectedEmployee.grants, companySettings.currentFMV))}</div>
                           </div>
                           <div className="px-8 py-6 bg-bg-base dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 min-w-48 shadow-sm">
                             <div className="text-[10px] font-extrabold text-brand-primary uppercase tracking-[0.15em] mb-2">Potential Gain</div>
                             <div className="text-3xl font-extrabold text-brand-primary font-mono tracking-tighter">{fmtCurrency(calcPotentialGain(selectedEmployee.grants, companySettings.currentFMV))}</div>
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-12">
                      <div>
                        <div className="flex items-center justify-between mb-8">
                           <h4 className="text-2xl font-extrabold text-text-main tracking-tight uppercase tracking-widest text-xs">Grant Inventory</h4>
                           <div className="h-0.5 bg-slate-50 dark:bg-slate-800 flex-1 ml-8"></div>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                          {selectedEmployee.grants.map(grant => (
                            <div key={grant.id} className="p-8 rounded-[24px] bg-bg-base dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-brand-primary/20 transition-all shadow-sm">
                              <div className="flex justify-between items-start mb-8">
                                <div className="flex items-center gap-5">
                                  <div className="w-12 h-12 rounded-2xl bg-bg-surface border border-slate-200 dark:border-slate-700 flex items-center justify-center text-brand-primary shadow-sm">
                                    <Gift size={24} />
                                  </div>
                                  <div>
                                    <h5 className="text-xl font-extrabold text-text-main tracking-tight">{grant.id}</h5>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-[10px] font-extrabold text-brand-primary uppercase tracking-widest bg-brand-primary/5 px-2 py-0.5 rounded leading-none">{grant.vestingSchedule}</span>
                                      <span className="px-2 py-0.5 border border-slate-100 dark:border-slate-800 rounded text-[10px] font-bold text-text-muted">Quarterly Calculations Enabled</span>
                                    </div>
                                  </div>
                                </div>
                                <StatusBadge status={grant.status} />
                              </div>
                              <VestingBar vested={calculateLiveVested(grant)} exercised={grant.exercisedShares} total={grant.totalShares} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "grants" && (
                <div className="space-y-8">
                  <div className="bg-bg-surface border border-slate-200 dark:border-slate-800 rounded-[40px] p-12 shadow-sm relative overflow-hidden transition-colors">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10">
                      <h3 className="text-4xl font-extrabold text-text-main tracking-tighter mb-4">TeachVest Liquidity Pool</h3>
                      <p className="text-text-muted max-w-2xl font-semibold mb-12 leading-relaxed text-lg">
                        Real-time visualization of {employees.reduce((s, e) => s + e.grants.length, 0)} equity allocations. 
                        Tracking automated quarterly vesting intervals globally.
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-12">
                         {[
                           { label: "Total ESOP Pool", val: fmt(companySettings.totalPool), icon: Shield, color: "text-brand-primary", bg: "bg-brand-primary/5" },
                           { label: "Pool Distributed", val: fmt(stats.totalGranted), icon: Database, color: "text-blue-500", bg: "bg-blue-50" },
                           { label: "Pool Remaining", val: fmt(Math.max(0, companySettings.totalPool - stats.totalGranted)), icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50" },
                           { label: "Beneficiaries", val: employees.length, icon: Users, color: "text-brand-accent", bg: "bg-brand-accent/5" },
                         ].map((s, i) => (
                           <div key={i} className="p-8 rounded-[32px] bg-bg-surface border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all">
                             <div className={`w-12 h-12 ${s.bg} ${s.color} rounded-2xl flex items-center justify-center mb-6`}>
                               <s.icon size={24} />
                             </div>
                             <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.2em] mb-2">{s.label}</div>
                             <div className="text-3xl font-extrabold text-text-main tracking-tight font-mono">{s.val}</div>
                           </div>
                         ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "settings" && (
                <div className="max-w-4xl mx-auto space-y-10">
                  <div className="bg-bg-surface border border-slate-100 dark:border-slate-800 rounded-[40px] p-12 shadow-sm transition-colors">
                    <div className="flex items-center gap-6 mb-12">
                       <div className="w-16 h-16 rounded-[24px] bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-inner">
                          <Settings size={36} />
                       </div>
                       <div>
                         <h3 className="text-3xl font-extrabold text-text-main tracking-tight">System Infrastructure</h3>
                         <p className="text-sm text-text-muted font-bold uppercase tracking-widest mt-1">Connect TeachVest to source ecosystems</p>
                       </div>
                    </div>

                    <div className="space-y-8">
                      <div className="p-8 rounded-[32px] bg-bg-base dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                           <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-2xl bg-[#0F9D58]/10 flex items-center justify-center">
                               <div className="w-6 h-6 bg-[#0F9D58] rounded-md" />
                             </div>
                             <div>
                               <span className="font-extrabold text-text-main tracking-tight text-lg">Teachmint Spreadsheet Sync</span>
                               <p className="text-xs text-text-muted font-bold uppercase tracking-widest mt-0.5">Real-time Data Tunnel</p>
                             </div>
                           </div>
                           <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40 px-4 py-1.5 rounded-full uppercase tracking-widest">Active Link</span>
                        </div>
                        <div className="flex gap-4">
                           <input 
                             readOnly 
                             value="https://teachmint.com/api/v1/esop/sync" 
                             className="flex-1 bg-bg-surface dark:bg-bg-base border border-slate-200 dark:border-slate-700 rounded-2xl px-6 text-xs font-mono text-text-muted outline-none transition-colors"
                           />
                           <button className="px-8 py-4 bg-brand-primary text-white rounded-2xl text-xs font-bold shadow-xl shadow-brand-primary/20 hover:scale-[1.02] transition-all">Manual Flush</button>
                        </div>
                      </div>

                      <div className="p-8 rounded-[32px] bg-bg-base dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                           <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                               <Database size={24} />
                             </div>
                             <div>
                               <span className="font-extrabold text-text-main tracking-tight text-lg">Liquidity Pool Management</span>
                               <p className="text-xs text-text-muted font-bold uppercase tracking-widest mt-0.5">Total ESOP Token Supply</p>
                             </div>
                           </div>
                        </div>
                        <div className="flex items-end gap-6">
                           <div className="flex-1">
                             <label className="block text-[10px] font-extrabold text-text-muted uppercase tracking-[0.2em] mb-3 ml-1">Total ESOP Pool (Shares)</label>
                             <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-extrabold text-text-muted">#</span>
                                <input 
                                  type="number" 
                                  value={companySettings.totalPool} 
                                  onChange={(e) => setCompanySettings({...companySettings, totalPool: Number(e.target.value)})}
                                  className="w-full bg-bg-surface dark:bg-bg-base border border-slate-200 dark:border-slate-700 rounded-[20px] pl-12 pr-6 py-5 font-extrabold text-2xl text-text-main outline-none focus:ring-4 focus:ring-brand-primary/5 transition-all"
                                />
                             </div>
                           </div>
                           <button 
                             onClick={() => updateCompanySettings({ totalPool: companySettings.totalPool })}
                             className="px-10 py-6 bg-brand-primary text-white rounded-[24px] text-sm font-extrabold shadow-2xl shadow-brand-primary/30 hover:scale-[1.01] transition-all"
                           >
                             Update Pool
                           </button>
                        </div>
                      </div>

                      <div className="p-8 rounded-[32px] bg-bg-base dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                           <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-2xl bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                               <TrendingUp size={24} />
                             </div>
                             <div>
                               <span className="font-extrabold text-text-main tracking-tight text-lg">Grant Valuation Engine</span>
                               <p className="text-xs text-text-muted font-bold uppercase tracking-widest mt-0.5">Automated Price Feeds</p>
                             </div>
                           </div>
                        </div>
                        <div className="flex items-end gap-6">
                           <div className="flex-1">
                             <label className="block text-[10px] font-extrabold text-text-muted uppercase tracking-[0.2em] mb-3 ml-1 font-bold">Current Market Valuation (₹)</label>
                             <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-extrabold text-text-muted">₹</span>
                                <input 
                                  type="number" 
                                  value={companySettings.currentFMV} 
                                  onChange={(e) => setCompanySettings({...companySettings, currentFMV: Number(e.target.value)})}
                                  className="w-full bg-bg-surface dark:bg-bg-base border border-slate-200 dark:border-slate-700 rounded-[20px] pl-12 pr-6 py-5 font-extrabold text-2xl text-text-main outline-none focus:ring-4 focus:ring-brand-primary/5 transition-all"
                                />
                             </div>
                           </div>
                           <button 
                             onClick={() => updateCompanySettings({ currentFMV: companySettings.currentFMV })}
                             className="px-10 py-6 bg-brand-primary text-white rounded-[24px] text-sm font-extrabold shadow-2xl shadow-brand-primary/30 hover:scale-[1.01] transition-all"
                           >
                             Broadcast Update
                           </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {isAddModalOpen && (
          <AddEmployeeModal 
            isOpen={isAddModalOpen} 
            onClose={() => setIsAddModalOpen(false)} 
            onAdd={handleAddEmployee} 
          />
        )}
        {isEditModalOpen && selectedEmployee && (
          <EditEmployeeModal 
            isOpen={isEditModalOpen} 
            onClose={() => setIsEditModalOpen(false)} 
            employee={selectedEmployee}
            onSave={handleEditEmployee}
          />
        )}
        {isBulkModalOpen && (
          <BulkUploadModal 
            isOpen={isBulkModalOpen} 
            onClose={() => setIsBulkModalOpen(false)} 
            onSuccess={handleBulkUpload}
          />
        )}
        {isGrantsModalOpen && selectedEmployee && (
          <ManageGrantsModal
            isOpen={isGrantsModalOpen}
            onClose={() => setIsGrantsModalOpen(false)}
            employee={selectedEmployee}
            onSave={handleEditEmployee}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
