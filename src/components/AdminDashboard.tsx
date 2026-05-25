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
  Shield, // Added Shield
  Trash2,
  AlertCircle,
  Mail,
  History
} from 'lucide-react';
import { Admin, Employee, Grant, AuditLog } from '../types';
import { Avatar, StatusBadge } from './ui/Shared';
import { MetricCard } from './ui/MetricCard';
import { VestingBar } from './ui/VestingBar';
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
  deleteEmployee,
  createEmployee,
  createAdmin,
  deleteAdmin,
  subscribeToAdmins,
  CompanySettings,
  subscribeToEmails,
  SentEmail,
  subscribeToAuditLogs
} from '../services/dataService';
import Papa from 'papaparse';
import { auth } from '../lib/firebase';

interface Props {
  user: Admin;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<Props> = ({ user: initialUser, onLogout }) => {
  const [user, setUser] = useState<Admin>(initialUser);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [adminsList, setAdminsList] = useState<Admin[]>([]);
  const [adminSuccess, setAdminSuccess] = useState("");
  const [adminError, setAdminError] = useState("");
  const [newAdminSuccess, setNewAdminSuccess] = useState("");
  const [newAdminError, setNewAdminError] = useState("");
  const [settingsSuccess, setSettingsSuccess] = useState("");
  const [settingsError, setSettingsError] = useState("");
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

  // Deletion and alert confirmation states
  const [deleteEmployeeConfirmId, setDeleteEmployeeConfirmId] = useState<string | null>(null);
  const [deleteAdminConfirmEmail, setDeleteAdminConfirmEmail] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Email Outbox logs states
  const [emails, setEmails] = useState<SentEmail[]>([]);
  const [selectedMail, setSelectedMail] = useState<SentEmail | null>(null);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  React.useEffect(() => {
    // Seed current admin first to establish isAdmin status in Firestore
    const currentUid = auth.currentUser?.uid;
    if (currentUid && user.role === 'admin') {
      createAdmin(user, currentUid).catch(console.error);
    }

    const unsubEmployees = subscribeToEmployees((data) => {
      setLoading(false);
      setEmployees(data);
      // Instant real-time view update
      setSelectedEmployee(prev => {
        if (!prev) return null;
        const updated = data.find(emp => emp.id === prev.id);
        return updated || null;
      });
    });

    const unsubSettings = subscribeToCompanySettings((settings) => {
      setCompanySettings(settings);
    });

    const unsubAdmins = subscribeToAdmins((data) => {
      setAdminsList(data);
      // Keep active admin user object updated as well if it changes in database
      const latestMe = data.find(adm => adm.email.toLowerCase() === user.email.toLowerCase());
      if (latestMe) {
        setUser(latestMe);
      }
    });

    const unsubEmails = subscribeToEmails((data) => {
      // Sort emails in descending chronological order
      const sorted = [...data].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
      setEmails(sorted);
    });

    const unsubAuditLogs = subscribeToAuditLogs((data) => {
      const sorted = [...data].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setAuditLogs(sorted);
    }, user.email);

    return () => {
      unsubEmployees();
      unsubSettings();
      unsubAdmins();
      unsubEmails();
      unsubAuditLogs();
    };
  }, []);

  const handleUpdatePool = async () => {
    setSettingsSuccess("");
    setSettingsError("");
    try {
      await updateCompanySettings({ totalPool: companySettings.totalPool }, user.email);
      setSettingsSuccess("ESOP Liquidity Pool successfully updated!");
    } catch (err: any) {
      setSettingsError(err.message || "Failed to update ESOP Liquidity Pool.");
    }
  };

  const handleUpdateFMV = async () => {
    setSettingsSuccess("");
    setSettingsError("");
    try {
      await updateCompanySettings({ currentFMV: companySettings.currentFMV }, user.email);
      setSettingsSuccess("Current Market Valuation successfully broadcasted and synchronized with all active grants!");
    } catch (err: any) {
      setSettingsError(err.message || "Failed to broadcast valuation update.");
    }
  };

  const handleAddEmployee = async (newEmp: Employee) => {
    await createEmployee(newEmp, user.email);
  };

  const handleEditEmployee = async (updatedEmp: Employee) => {
    const originalId = selectedEmployee ? selectedEmployee.id : updatedEmp.id;
    await updateEmployeeData(originalId, updatedEmp, user.email);
    setSelectedEmployee(updatedEmp);
  };

  const handleDeleteEmployee = (employeeId: string) => {
    setDeleteEmployeeConfirmId(employeeId);
  };

  const confirmDeleteEmployee = async () => {
    if (deleteEmployeeConfirmId) {
      await deleteEmployee(deleteEmployeeConfirmId, user.email);
      setSelectedEmployee(null);
      setDeleteEmployeeConfirmId(null);
    }
  };

  const handleDeleteAdmin = (email: string) => {
    if (email.toLowerCase() === user.email.toLowerCase()) {
      setAlertMessage("You cannot remove your own administrator session.");
      return;
    }
    setDeleteAdminConfirmEmail(email);
  };

  const confirmDeleteAdmin = async () => {
    if (deleteAdminConfirmEmail) {
      await deleteAdmin(deleteAdminConfirmEmail, user.email);
      setDeleteAdminConfirmEmail(null);
    }
  };

  const handleBulkUpload = async (newEmployees: Employee[]) => {
    for (const emp of newEmployees) {
      await createEmployee(emp, user.email);
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
    { id: "auditLogs", label: "Audit Logs", icon: History },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-bg-base flex transition-colors duration-300">
      {/* Sidebar - Teachmint style sidebar */}
      <aside className="w-72 bg-bg-surface border-r border-slate-100 dark:border-slate-800 flex flex-col sticky top-0 h-screen z-50 transition-colors">
        <div className="p-8 pb-10">
          <div className="flex items-center gap-4 group cursor-pointer">
            <motion.div 
              whileHover={{ rotate: 10, scale: 1.1 }}
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
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setSelectedEmployee(null); setSearch(""); setDeptFilter("All"); }}
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
                          <div className="flex flex-col items-end gap-1.5">
                            <div className="text-[10px] font-bold bg-brand-primary/10 text-brand-primary px-3 py-1.5 rounded-xl uppercase tracking-widest">{e.id}</div>
                            {e.disabled && (
                              <span className="text-[9px] font-extrabold bg-red-500/15 text-red-600 dark:text-red-400 px-2.5 py-1 rounded-lg uppercase tracking-wide">Access Blocked</span>
                            )}
                          </div>
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
                        onClick={() => handleDeleteEmployee(selectedEmployee.id)}
                        className="px-6 py-3 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-600 dark:text-red-400 text-sm font-bold transition-all shadow-sm flex items-center gap-2"
                       >
                        <Trash2 size={16} />
                        Delete Stakeholder
                       </button>
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
                           <div className="px-8 py-6 bg-bg-base dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 min-w-48 shadow-sm flex-1">
                             <div className="text-[10px] font-extrabold text-brand-primary uppercase tracking-[0.15em] mb-2">Net Portfolio (₹)</div>
                             <div className="text-3xl font-extrabold text-emerald-600 font-mono tracking-tighter">{fmtCurrency(calcPortfolioValue(selectedEmployee.grants, companySettings.currentFMV))}</div>
                           </div>
                           <div className="px-8 py-6 bg-bg-base dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 min-w-48 shadow-sm flex-1">
                             <div className="text-[10px] font-extrabold text-brand-primary uppercase tracking-[0.15em] mb-2">Potential Gain</div>
                             <div className="text-3xl font-extrabold text-brand-primary font-mono tracking-tighter">{fmtCurrency(calcPotentialGain(selectedEmployee.grants, companySettings.currentFMV))}</div>
                           </div>
                           <div className="px-8 py-6 bg-bg-base dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 min-w-[240px] shadow-sm flex-1 flex flex-col justify-between">
                             <div className="text-[10px] font-extrabold text-brand-primary uppercase tracking-[0.15em] mb-2">Login Access Control</div>
                             <div>
                               <button
                                 onClick={async (e) => {
                                   e.stopPropagation();
                                   const newDisabled = !selectedEmployee.disabled;
                                   const updated = { ...selectedEmployee, disabled: newDisabled };
                                   setSelectedEmployee(updated);
                                   setEmployees(prev => prev.map(emp => emp.id === selectedEmployee.id ? updated : emp));
                                   await updateEmployeeData(selectedEmployee.id, { disabled: newDisabled }, user.email);
                                 }}
                                 className={`w-full py-2.5 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 border select-none ${
                                   !selectedEmployee.disabled
                                     ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                                     : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/20"
                                 }`}
                               >
                                 <span className={`w-2 h-2 rounded-full ${!selectedEmployee.disabled ? "bg-emerald-500" : "bg-red-500 animate-pulse"}`} />
                                 {!selectedEmployee.disabled ? "Enabled (Allow Access)" : "Disabled (Blocked)"}
                               </button>
                             </div>
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

              {activeTab === "auditLogs" && (
                <div className="space-y-8">
                  {/* Stats Summary Rows */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="p-8 rounded-[32px] bg-bg-surface border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.2em] mb-1">Total Logs Tracked</div>
                        <div className="text-3xl font-extrabold text-text-main font-mono">{auditLogs.length}</div>
                      </div>
                      <div className="w-12 h-12 bg-brand-primary/10 text-brand-primary rounded-2xl flex items-center justify-center">
                        <History size={24} />
                      </div>
                    </div>
                    <div className="p-8 rounded-[32px] bg-bg-surface border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.2em] mb-1">Employee Alterations</div>
                        <div className="text-3xl font-extrabold text-text-main font-mono">{auditLogs.filter(l => l.action.toLowerCase().includes("employee")).length}</div>
                      </div>
                      <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center">
                        <Users size={24} />
                      </div>
                    </div>
                    <div className="p-8 rounded-[32px] bg-bg-surface border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.2em] mb-1">Last Server Log</div>
                        <div className="text-sm font-bold text-text-main leading-snug truncate">
                          {auditLogs[0] ? `${auditLogs[0].action}` : "No actions yet"}
                        </div>
                        <div className="text-[10px] text-text-muted font-mono">{auditLogs[0] ? new Date(auditLogs[0].timestamp).toLocaleTimeString() : ""}</div>
                      </div>
                      <div className="w-12 h-12 bg-purple-500/10 text-purple-500 rounded-2xl flex items-center justify-center">
                        <Settings size={24} />
                      </div>
                    </div>
                  </div>

                  {/* Filter and Search Section */}
                  <div className="bg-bg-surface border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-sm transition-colors space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h3 className="text-xl font-extrabold text-text-main">Continuous Compliance Trail</h3>
                        <p className="text-xs text-text-muted font-bold uppercase tracking-widest mt-0.5">SOX & ISO 27001 compliant state logs of all corporate share events</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                        {/* Search Input */}
                        <div className="flex items-center gap-2 bg-bg-base px-4 py-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800 shadow-inner w-full sm:w-64">
                          <Search size={16} className="text-slate-400" />
                          <input
                            type="text"
                            placeholder="Filter by admin, message..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-transparent border-none outline-none text-xs font-semibold text-text-main placeholder:text-slate-400 flex-1"
                          />
                        </div>

                        {/* Action Type Dropdown Filter */}
                        <div className="flex items-center gap-2 bg-bg-base px-4 py-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800 shadow-sm">
                          <Filter size={14} className="text-slate-400" />
                          <select
                            value={deptFilter}
                            onChange={(e) => setDeptFilter(e.target.value)}
                            className="bg-transparent border-none outline-none text-[10px] font-extrabold text-text-muted cursor-pointer uppercase tracking-wider"
                          >
                            <option value="All">All Categories</option>
                            <option value="Create">Register Stakeholders</option>
                            <option value="Edit">Edit Employees</option>
                            <option value="Delete">Delete Operations</option>
                            <option value="Settings">System Settings</option>
                            <option value="Administrator">Permission Changes</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Logs Render Frame */}
                    {(() => {
                      const filteredLogs = auditLogs.filter(log => {
                        const matchesCategory = deptFilter === "All" || 
                          log.action.toLowerCase().includes(deptFilter.toLowerCase());
                        const matchesQuery = !search || 
                          log.details.toLowerCase().includes(search.toLowerCase()) || 
                          log.adminEmail.toLowerCase().includes(search.toLowerCase()) ||
                          log.action.toLowerCase().includes(search.toLowerCase());
                        return matchesCategory && matchesQuery;
                      });

                      if (filteredLogs.length === 0) {
                        return (
                          <div className="py-16 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                            <History className="mx-auto text-slate-300 dark:text-slate-700 mb-3" size={32} />
                            <span className="block font-bold text-text-muted text-sm">No match found inside logs</span>
                            <p className="text-xs text-text-muted mt-1">Try relaxing your search query or choosing another action filter.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="overflow-hidden border border-slate-100 dark:border-slate-800 rounded-2xl bg-bg-base/50">
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-[10px] font-extrabold text-text-muted uppercase tracking-wider">
                                  <th className="px-6 py-4">Security ID</th>
                                  <th className="px-6 py-4">Action Event</th>
                                  <th className="px-6 py-4">Detailed Description Notes</th>
                                  <th className="px-6 py-4">Administrator</th>
                                  <th className="px-6 py-4 text-right">Dispatched At</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans text-xs">
                                {filteredLogs.map(log => {
                                  // Assign color badge styles based on category
                                  let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300";
                                  if (log.action.includes("Create")) badgeStyle = "bg-emerald-50 text-emerald-600 border-emerald-100/50 dark:bg-emerald-950/20 dark:text-emerald-400";
                                  if (log.action.includes("Edit") || log.action.includes("Update")) badgeStyle = "bg-blue-50 text-blue-600 border-blue-100/50 dark:bg-blue-950/25 dark:text-blue-400";
                                  if (log.action.includes("Delete")) badgeStyle = "bg-red-50 text-red-600 border-red-100/50 dark:bg-red-950/20 dark:text-red-400";
                                  if (log.action.includes("Settings")) badgeStyle = "bg-purple-100 text-purple-700 border-purple-200/50 dark:bg-purple-950/20 dark:text-purple-400";

                                  return (
                                    <tr key={log.id} className="hover:bg-slate-100/30 dark:hover:bg-slate-900/10 transition-colors">
                                      <td className="px-6 py-4 font-mono text-[10px] font-extrabold text-text-muted whitespace-nowrap">
                                        {log.id}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-block px-2.5 py-1 border rounded-lg text-[9.5px] font-extrabold tracking-wide uppercase ${badgeStyle}`}>
                                          {log.action}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 text-text-main font-semibold leading-relaxed">
                                        {log.details}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                          <Avatar name={log.adminEmail} size={24} />
                                          <span className="font-bold text-text-main text-[11.5px]">{log.adminEmail}</span>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 text-right whitespace-nowrap font-mono text-[11px] text-text-muted">
                                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        <div className="text-[9.5px] text-slate-400 mt-0.5">{new Date(log.timestamp).toLocaleDateString()}</div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}
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

                    {settingsSuccess && (
                      <div className="mb-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        {settingsSuccess}
                      </div>
                    )}
                    {settingsError && (
                      <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        {settingsError}
                      </div>
                    )}

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
                             onClick={handleUpdatePool}
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
                             onClick={handleUpdateFMV}
                             className="px-10 py-6 bg-brand-primary text-white rounded-[24px] text-sm font-extrabold shadow-2xl shadow-brand-primary/30 hover:scale-[1.01] transition-all"
                           >
                             Broadcast Update
                           </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Admin Profile Update Section */}
                  <div className="bg-bg-surface border border-slate-100 dark:border-slate-800 rounded-[40px] p-12 shadow-sm transition-colors space-y-8">
                    <div className="flex items-center gap-6 mb-4">
                       <div className="w-16 h-16 rounded-[24px] bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner overflow-hidden">
                          <Avatar name={user.name} size={48} />
                       </div>
                       <div>
                         <h3 className="text-3xl font-extrabold text-text-main tracking-tight">Personal Admin Profile</h3>
                         <p className="text-sm text-text-muted font-bold uppercase tracking-widest mt-1">Manage your administrator details</p>
                       </div>
                    </div>

                    {adminSuccess && (
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        {adminSuccess}
                      </div>
                    )}
                    {adminError && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        {adminError}
                      </div>
                    )}

                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      setAdminSuccess("");
                      setAdminError("");
                      const form = e.currentTarget;
                      const adminName = (form.elements.namedItem('adminName') as HTMLInputElement).value;
                      const adminPassword = (form.elements.namedItem('adminPassword') as HTMLInputElement).value;
                      
                      try {
                        const currentUid = auth.currentUser?.uid || user.email.toLowerCase();
                        const updatedAdmin: Admin = {
                          ...user,
                          name: adminName,
                          ...(adminPassword ? { password: adminPassword } : {})
                        };
                        
                        await createAdmin(updatedAdmin, currentUid);
                        setUser(updatedAdmin);
                        setAdminSuccess("Admin profile updated successfully!");
                        const pwInput = form.elements.namedItem('adminPassword') as HTMLInputElement;
                        if (pwInput) pwInput.value = "";
                      } catch (err) {
                        setAdminError("Failed to update profile. Please check connection.");
                      }
                    }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5 col-span-1">
                        <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] block">Email Address (Immutable)</label>
                        <input 
                          type="text" 
                          disabled 
                          value={user.email} 
                          className="w-full px-5 py-4 rounded-[20px] bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-text-muted font-bold text-sm outline-none"
                        />
                      </div>
                      <div className="space-y-1.5 col-span-1">
                        <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] block">Full Name</label>
                        <input 
                          type="text" 
                          name="adminName"
                          required
                          defaultValue={user.name} 
                          className="w-full px-5 py-4 rounded-[20px] bg-bg-surface border border-slate-200 dark:border-slate-700 text-text-main font-bold text-sm focus:ring-4 focus:ring-brand-primary/5 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-1.5 col-span-1">
                        <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] block">New Secret Password</label>
                        <input 
                          type="password" 
                          name="adminPassword"
                          placeholder="Leave blank to keep current" 
                          className="w-full px-5 py-4 rounded-[20px] bg-bg-surface border border-slate-200 dark:border-slate-700 text-text-main font-bold text-sm focus:ring-4 focus:ring-brand-primary/5 outline-none transition-all"
                        />
                      </div>
                      <div className="col-span-1 md:col-span-2 flex justify-end">
                        <button 
                          type="submit" 
                          className="px-10 py-5 bg-brand-primary text-white rounded-[20px] text-sm font-extrabold shadow-2xl shadow-brand-primary/30 hover:scale-[1.01] transition-all"
                        >
                          Save Profile Changes
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Create Administrators Section */}
                  <div className="bg-bg-surface border border-slate-100 dark:border-slate-800 rounded-[40px] p-12 shadow-sm transition-colors space-y-10">
                    <div className="flex items-center gap-6">
                       <div className="w-16 h-16 rounded-[24px] bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-inner">
                          <ShieldCheck size={36} />
                       </div>
                       <div>
                         <h3 className="text-3xl font-extrabold text-text-main tracking-tight">Administrative Accounts</h3>
                         <p className="text-sm text-text-muted font-bold uppercase tracking-widest mt-1">Add additional admins and view permissions</p>
                       </div>
                    </div>

                    {newAdminSuccess && (
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        {newAdminSuccess}
                      </div>
                    )}
                    {newAdminError && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        {newAdminError}
                      </div>
                    )}

                    {/* New Admin Registration Form */}
                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      setNewAdminSuccess("");
                      setNewAdminError("");
                      
                      const form = e.currentTarget;
                      const newEmail = (form.elements.namedItem('newEmail') as HTMLInputElement).value.trim();
                      const newName = (form.elements.namedItem('newName') as HTMLInputElement).value.trim();
                      const newPassword = (form.elements.namedItem('newPassword') as HTMLInputElement).value;

                      if (!newEmail || !newName || !newPassword) {
                        setNewAdminError("All fields are required to register an administrator");
                        return;
                      }

                      try {
                        const newAdmin: Admin = {
                          email: newEmail,
                          name: newName,
                          password: newPassword,
                          role: "admin"
                        };

                        await createAdmin(newAdmin, newEmail.toLowerCase(), user.email);
                        setNewAdminSuccess(`Admin '${newName}' created successfully!`);
                        form.reset();
                      } catch (err) {
                        setNewAdminError("Failed to register administrator document on database.");
                      }
                    }} className="p-8 rounded-[32px] bg-bg-base dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                      <div className="text-xs font-extrabold text-brand-primary uppercase tracking-[0.2em]">Register New Administrator</div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1.5 col-span-1">
                          <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] block">Admin Full Name</label>
                          <input 
                            type="text" 
                            name="newName"
                            required
                            placeholder="John Doe" 
                            className="w-full px-5 py-4 rounded-[20px] bg-bg-surface border border-slate-200 dark:border-slate-700 text-text-main font-bold text-sm focus:ring-4 focus:ring-brand-primary/5 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-1.5 col-span-1">
                          <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] block">Email Address (Login ID)</label>
                          <input 
                            type="email" 
                            name="newEmail"
                            required
                            placeholder="admin@teachmint.com" 
                            className="w-full px-5 py-4 rounded-[20px] bg-bg-surface border border-slate-200 dark:border-slate-700 text-text-main font-bold text-sm focus:ring-4 focus:ring-brand-primary/5 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-1.5 col-span-1">
                          <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] block">Account Password</label>
                          <input 
                            type="password" 
                            name="newPassword"
                            required
                            placeholder="Create secret code" 
                            className="w-full px-5 py-4 rounded-[20px] bg-bg-surface border border-slate-200 dark:border-slate-700 text-text-main font-bold text-sm focus:ring-4 focus:ring-brand-primary/5 outline-none transition-all"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end pt-2">
                        <button 
                          type="submit" 
                          className="px-10 py-5 bg-brand-primary text-white rounded-[20px] text-sm font-extrabold shadow-2xl shadow-brand-primary/30 hover:scale-[1.01] transition-all"
                        >
                          Register Administrator
                        </button>
                      </div>
                    </form>

                    {/* Admin Directory List */}
                    <div className="space-y-4">
                      <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.2em] ml-1">Current Active Administrators ({adminsList.length})</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {adminsList.map((adm, i) => (
                          <div key={i} className="flex items-center justify-between p-5 rounded-3xl border border-slate-100 dark:border-slate-800 bg-bg-base dark:bg-slate-900 shadow-sm">
                            <div className="flex items-center gap-4">
                              <Avatar name={adm.name} size={40} />
                              <div>
                                <div className="font-extrabold text-text-main leading-tight flex items-center gap-2">
                                  {adm.name}
                                  {adm.email.toLowerCase() === "sanju@sanju-t.com" && (
                                    <span className="bg-red-500/10 text-red-500 text-[8px] font-black px-1.5 py-0.5 rounded tracking-widest uppercase">Super Admin</span>
                                  )}
                                </div>
                                <div className="text-xs text-text-muted font-bold uppercase tracking-wider mt-0.5">{adm.email}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {adm.email.toLowerCase() !== user.email.toLowerCase() && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAdmin(adm.email)}
                                  className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all"
                                  title="Remove Admin"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                              <span className="text-[9px] font-extrabold text-brand-primary bg-brand-primary/10 border border-brand-primary/20 px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                                Admin
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* System Invitation Logs (Outbox) Section */}
                  <div className="bg-bg-surface border border-slate-100 dark:border-slate-800 rounded-[40px] p-12 shadow-sm transition-colors space-y-8">
                    <div className="flex items-center gap-6">
                       <div className="w-16 h-16 rounded-[24px] bg-indigo-500/10 flex items-center justify-center text-indigo-500 shadow-inner">
                          <Mail size={36} />
                       </div>
                       <div>
                         <h3 className="text-3xl font-extrabold text-text-main tracking-tight">System Invitation Logs</h3>
                         <p className="text-sm text-text-muted font-bold uppercase tracking-widest mt-1">Simulated corporate SMTP email delivery logs</p>
                       </div>
                    </div>

                    <p className="text-sm text-text-muted">
                      When employees or administrators are registered in TeachVest, a state-compliant digital invitation email containing their temporary credential package is logged below. Click any log entry to view the rendered template and quickly inspect login details:
                    </p>

                    {emails.length === 0 ? (
                      <div className="py-12 text-center rounded-[32px] bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800">
                        <Mail className="mx-auto text-slate-300 dark:text-slate-700 mb-3" size={40} />
                        <span className="block font-bold text-text-muted text-sm">No emails sent yet</span>
                        <p className="text-xs text-text-muted mt-1">Creation of new admins or employee profiles triggers auto-dispatch.</p>
                      </div>
                    ) : (
                      <div className="overflow-hidden border border-slate-100 dark:border-slate-800 rounded-3xl bg-bg-base dark:bg-slate-950/40">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-100/50 dark:bg-slate-900 border-b border-slate-200/50 dark:border-slate-800 text-[10px] font-extrabold text-text-muted uppercase tracking-wider">
                                <th className="px-6 py-4">Status & ID</th>
                                <th className="px-6 py-4">Recipient Stakeholder</th>
                                <th className="px-6 py-4">Subject</th>
                                <th className="px-6 py-4">Dispatched At</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans text-xs">
                              {emails.map((email) => (
                                <tr key={email.id} className="hover:bg-slate-100/40 dark:hover:bg-slate-900/30 transition-colors">
                                  <td className="px-6 py-4 font-mono font-bold text-text-muted">
                                    <div className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                      <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded-full uppercase font-extrabold">DELIVERED</span>
                                    </div>
                                    <div className="mt-1 text-[10px] tracking-wide text-slate-400">ID: {email.id}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="font-extrabold text-text-main text-sm">{email.name}</div>
                                    <div className="text-text-muted font-medium mt-0.5">{email.recipient}</div>
                                    <span className={`inline-block mt-1 text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${email.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                      {email.role}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 max-w-xs truncate">
                                    <span className="font-semibold text-text-main">{email.subject}</span>
                                    <div className="text-text-muted mt-0.5 truncate text-[11px]">Passcode: <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-black text-brand-primary">{email.password}</code></div>
                                  </td>
                                  <td className="px-6 py-4 text-text-muted font-bold whitespace-nowrap">
                                    {new Date(email.sentAt).toLocaleTimeString()}
                                    <div className="text-[10.5px] font-normal text-text-muted mt-0.5">{new Date(email.sentAt).toLocaleDateString()}</div>
                                  </td>
                                  <td className="px-6 py-4 text-right whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedMail(email)}
                                      className="px-4 py-2 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 rounded-xl text-[11px] font-extrabold uppercase tracking-wider transition-all"
                                    >
                                      Inspect Mail
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
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

        {/* Custom Delete Employee Confirmation Modal */}
        {deleteEmployeeConfirmId && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteEmployeeConfirmId(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 overflow-hidden shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-red-500">
                <AlertCircle size={24} />
                <h3 className="text-lg font-bold">Delete Stakeholder Profile?</h3>
              </div>
              <p className="text-sm text-text-muted">
                Are you sure you want to permanently delete this employee? This will purge all associated grants and history. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setDeleteEmployeeConfirmId(null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-text-muted hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDeleteEmployee}
                  className="px-5 py-2 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                >
                  Permanently Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Custom Delete Admin Confirmation Modal */}
        {deleteAdminConfirmEmail && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteAdminConfirmEmail(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 overflow-hidden shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-red-500">
                <AlertCircle size={24} />
                <h3 className="text-lg font-bold">Revoke Admin Privileges?</h3>
              </div>
              <p className="text-sm text-text-muted">
                Are you sure you want to permanently revoke admin access for <strong className="text-text-main">{deleteAdminConfirmEmail}</strong>? They will immediately lose access to the administrator portal.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setDeleteAdminConfirmEmail(null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-text-muted hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDeleteAdmin}
                  className="px-5 py-2 bg-red-500 text-white text-sm font-semibold rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                >
                  Revoke Access
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Custom General Alert Message Modal */}
        {alertMessage && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setAlertMessage(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 overflow-hidden shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-brand-primary">
                <AlertCircle size={24} />
                <h3 className="text-lg font-bold text-text-main">Action Restricted</h3>
              </div>
              <p className="text-sm text-text-muted">
                {alertMessage}
              </p>
              <div className="flex justify-end pt-2">
                <button 
                  onClick={() => setAlertMessage(null)}
                  className="px-6 py-2.5 bg-brand-primary text-white text-sm font-semibold rounded-xl hover:scale-[1.02] transition-colors"
                >
                  Understood
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Custom Inspect Mail Modal */}
        {selectedMail && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedMail(null)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl p-6 overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-text-main flex items-center gap-2">
                    <Mail size={20} className="text-brand-primary" />
                    Inspect Dispatched Mail
                  </h3>
                  <p className="text-xs text-text-muted">Security Audited SMTP Mail Delivery Packet</p>
                </div>
                <button 
                  onClick={() => setSelectedMail(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-text-muted text-xl font-bold"
                >
                  &times;
                </button>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 mb-4 text-xs font-semibold">
                <div><span className="text-text-muted">Recipient:</span> <strong className="text-text-main">{selectedMail.name} ({selectedMail.recipient})</strong></div>
                <div><span className="text-text-muted">Subject:</span> <strong className="text-text-main">{selectedMail.subject}</strong></div>
                <div><span className="text-text-muted">Sent At:</span> <strong className="text-text-main">{new Date(selectedMail.sentAt).toLocaleString()}</strong></div>
                <div><span className="text-text-muted">Security Credentials:</span> Password: <code className="font-mono bg-indigo-50 dark:bg-indigo-950 text-indigo-600 px-1.5 py-0.5 rounded font-black text-xs">{selectedMail.password}</code></div>
              </div>

              <div className="flex-1 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-2xl p-4 bg-white text-slate-800">
                <div dangerouslySetInnerHTML={{ __html: selectedMail.body }} />
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
                <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full uppercase tracking-widest font-extrabold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  SMTP Server Response: Delivered
                </span>
                <button 
                  onClick={() => setSelectedMail(null)}
                  className="px-6 py-2.5 bg-brand-primary text-white text-xs font-bold rounded-xl hover:scale-[1.01] transition-all"
                >
                  Dismiss Inspector
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
