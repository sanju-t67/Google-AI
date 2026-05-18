import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Download, AlertCircle, CheckCircle2, Loader2, Plus, Trash2, Gift } from 'lucide-react';
import Papa from 'papaparse';
import { Employee, Grant } from '../types';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// --- Edit Employee Modal ---
interface EditEmployeeProps extends ModalProps {
  employee: Employee;
  onSave: (updated: Employee) => void;
}

export const EditEmployeeModal: React.FC<EditEmployeeProps> = ({ isOpen, onClose, employee, onSave }) => {
  const [formData, setFormData] = useState<Partial<Employee>>({});

  useEffect(() => {
    if (employee) setFormData({ ...employee });
  }, [employee]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as Employee);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-text-main">Edit Employee Profile</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5"><label className="text-xs font-bold text-text-muted uppercase tracking-wider">Full Name</label><input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-primary outline-none transition-all" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
            <div className="space-y-1.5"><label className="text-xs font-bold text-text-muted uppercase tracking-wider">Email Address</label><input type="email" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-primary outline-none transition-all" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
            <div className="space-y-1.5"><label className="text-xs font-bold text-text-muted uppercase tracking-wider">Mobile Number</label><input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-primary outline-none transition-all" value={formData.mobile || ''} onChange={e => setFormData({...formData, mobile: e.target.value})} /></div>
            <div className="space-y-1.5"><label className="text-xs font-bold text-text-muted uppercase tracking-wider">Department</label><input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-primary outline-none transition-all" value={formData.department || ''} onChange={e => setFormData({...formData, department: e.target.value})} /></div>
            <div className="space-y-1.5"><label className="text-xs font-bold text-text-muted uppercase tracking-wider">Designation</label><input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-primary outline-none transition-all" value={formData.designation || ''} onChange={e => setFormData({...formData, designation: e.target.value})} /></div>
            <div className="space-y-1.5"><label className="text-xs font-bold text-text-muted uppercase tracking-wider">Join Date</label><input type="date" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-primary outline-none transition-all" value={formData.joinDate || ''} onChange={e => setFormData({...formData, joinDate: e.target.value})} /></div>
            <div className="space-y-1.5"><label className="text-xs font-bold text-text-muted uppercase tracking-wider">Account Password</label><input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-primary outline-none transition-all" value={formData.password || ''} placeholder="Set new password" onChange={e => setFormData({...formData, password: e.target.value})} /></div>
          </div>
        </form>
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-text-muted hover:bg-slate-200 transition-all">Cancel</button>
          <button onClick={handleSubmit} className="px-8 py-2.5 bg-brand-primary text-white rounded-xl font-bold shadow-lg shadow-brand-primary/20 hover:scale-[1.02] transition-all">Save Changes</button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Add Employee Modal ---
interface AddEmployeeProps extends ModalProps {
  onAdd: (newEmployee: Employee) => void;
}

export const AddEmployeeModal: React.FC<AddEmployeeProps> = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState<Partial<Employee>>({
    id: `EMP${Math.floor(Math.random() * 9000) + 1000}`,
    grants: [],
    transactions: [],
    grantDate: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;
    onAdd(formData as Employee);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-text-main">Add New Employee</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5"><label className="text-xs font-bold text-text-muted uppercase tracking-wider">Employee ID</label><input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 cursor-not-allowed" value={formData.id} readOnly /></div>
            <div className="space-y-1.5"><label className="text-xs font-bold text-text-muted uppercase tracking-wider">Full Name</label><input required type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" placeholder="e.g. John Doe" onChange={e => setFormData({...formData, name: e.target.value})} /></div>
            <div className="space-y-1.5"><label className="text-xs font-bold text-text-muted uppercase tracking-wider">Email Address</label><input required type="email" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" placeholder="john@teachmint.com" onChange={e => setFormData({...formData, email: e.target.value})} /></div>
            <div className="space-y-1.5"><label className="text-xs font-bold text-text-muted uppercase tracking-wider">Mobile Number</label><input required type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" placeholder="9988776655" onChange={e => setFormData({...formData, mobile: e.target.value})} /></div>
            <div className="space-y-1.5"><label className="text-xs font-bold text-text-muted uppercase tracking-wider">Department</label><input required type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" placeholder="e.g. Engineering" onChange={e => setFormData({...formData, department: e.target.value})} /></div>
            <div className="space-y-1.5"><label className="text-xs font-bold text-text-muted uppercase tracking-wider">Designation</label><input required type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" placeholder="e.g. Senior Dev" onChange={e => setFormData({...formData, designation: e.target.value})} /></div>
            <div className="space-y-1.5"><label className="text-xs font-bold text-text-muted uppercase tracking-wider">Account Password</label><input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" placeholder="Set password" onChange={e => setFormData({...formData, password: e.target.value})} /></div>
          </div>
        </form>
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-text-muted hover:bg-slate-200 transition-all">Cancel</button>
          <button onClick={handleSubmit} className="px-8 py-2.5 bg-brand-primary text-white rounded-xl font-bold shadow-lg shadow-brand-primary/20 hover:scale-[1.02] transition-all">Create Profile</button>
        </div>
      </motion.div>
    </div>
  );
}

// --- Manage Grants Modal ---
interface ManageGrantsProps extends ModalProps {
  employee: Employee;
  onSave: (updated: Employee) => void;
}

export const ManageGrantsModal: React.FC<ManageGrantsProps> = ({ isOpen, onClose, employee, onSave }) => {
  const [grants, setGrants] = useState<Grant[]>([]);

  useEffect(() => {
    if (employee) setGrants([...employee.grants]);
  }, [employee, isOpen]);

  const handleAddGrant = () => {
    const newGrant: Grant = {
      id: `GRT-${Math.floor(Math.random() * 9000) + 1000}`,
      grantDate: new Date().toISOString().split('T')[0],
      totalShares: 1000,
      vestedShares: 0,
      exercisedShares: 0,
      strikePrice: 10,
      currentFMV: 210,
      vestingSchedule: "4 Year / 1 Year Cliff",
      status: "Active"
    };
    setGrants([...grants, newGrant]);
  };

  const handleRemoveGrant = (id: string) => {
    setGrants(grants.filter(g => g.id !== id));
  };

  const handleUpdateGrant = (id: string, field: keyof Grant, value: any) => {
    setGrants(grants.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const handleSave = () => {
    onSave({ ...employee, grants });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div><h3 className="text-xl font-bold text-text-main">Manage Equity Grants</h3><p className="text-xs text-text-muted font-medium">Assign and edit grants for {employee.name}</p></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
        </div>
        <div className="p-8 max-h-[60vh] overflow-y-auto space-y-6">
          {grants.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200"><Gift size={40} className="mx-auto text-slate-300 mb-4" /><p className="text-sm font-bold text-text-main">No grants assigned yet</p><p className="text-xs text-text-muted mt-1">Start by adding a new equity grant</p></div>
          ) : (
            <div className="space-y-4">
              {grants.map((grant, idx) => (
                <div key={grant.id} className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm ring-1 ring-black/5">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-xs">{idx + 1}</div><input type="text" className="font-bold text-lg text-text-main outline-none focus:text-brand-primary" value={grant.id} onChange={e => handleUpdateGrant(grant.id, 'id', e.target.value)} /></div>
                    <button onClick={() => handleRemoveGrant(grant.id)} className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={18} /></button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="space-y-1"><label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Total Shares</label><input type="number" className="w-full bg-slate-50 px-3 py-2 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-brand-primary/10" value={grant.totalShares} onChange={e => handleUpdateGrant(grant.id, 'totalShares', Number(e.target.value))} /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Vested Shares</label><input type="number" className="w-full bg-slate-50 px-3 py-2 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-brand-primary/10" value={grant.vestedShares} onChange={e => handleUpdateGrant(grant.id, 'vestedShares', Number(e.target.value))} /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Grant Date</label><input type="date" className="w-full bg-slate-50 px-3 py-2 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-brand-primary/10" value={grant.grantDate} onChange={e => handleUpdateGrant(grant.id, 'grantDate', e.target.value)} /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Strike Price</label><input type="number" className="w-full bg-slate-50 px-3 py-2 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-brand-primary/10" value={grant.strikePrice} onChange={e => handleUpdateGrant(grant.id, 'strikePrice', Number(e.target.value))} /></div>
                    <div className="space-y-1"><label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Schedule</label><select className="w-full bg-slate-50 px-3 py-2 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all" value={grant.vestingSchedule} onChange={e => handleUpdateGrant(grant.id, 'vestingSchedule', e.target.value)}><option>4yr/1yr cliff (Quarterly)</option><option>4yr/1yr cliff (Monthly)</option><option>Quarterly Vesting (Automated)</option><option>Monthly Vesting (Automated)</option><option>Immediate</option></select></div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-[10px] text-brand-primary font-bold uppercase tracking-wider bg-brand-primary/5 px-3 py-1.5 rounded-lg w-fit">
                    <CheckCircle2 size={12} />
                    TeachVest Engine: Automated calculation enabled for this grant type
                  </div>
                </div>
              ))}
            </div>
          )}
          <button onClick={handleAddGrant} className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-bold hover:bg-slate-50 hover:border-brand-primary/30 hover:text-brand-primary transition-all flex items-center justify-center gap-2"><Plus size={20} />Add New Grant Allocation</button>
        </div>
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-text-muted hover:bg-slate-200 transition-all">Cancel</button>
          <button onClick={handleSave} className="px-8 py-2.5 bg-brand-primary text-white rounded-xl font-bold shadow-lg shadow-brand-primary/20 transition-all">Save All Changes</button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Bulk Upload Modal ---
interface BulkUploadProps extends ModalProps {
  onSuccess: (employees: Employee[]) => void;
}

export const BulkUploadModal: React.FC<BulkUploadProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setParsing(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const json = JSON.parse(text);
        if (Array.isArray(json)) { setData(json); setStep('preview'); setParsing(false); return; }
      } catch (e) {}
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) setError("Error parsing CSV: " + results.errors[0].message);
          else { setData(results.data); setStep('preview'); }
          setParsing(false);
        },
        error: (err) => { setError(err.message); setParsing(false); }
      });
    };
    reader.readAsText(f);
  };

  const processImport = () => {
    // Basic deduplication and merging logic
    const importedEmployees: Employee[] = data.map((row, idx) => {
      const grantId = row.grantId || row.grant_id;
      const grants: Grant[] = grantId ? [{
        id: grantId,
        grantDate: row.grantDate || row.grant_date || new Date().toISOString().split('T')[0],
        totalShares: Number(row.totalShares || row.total_shares || row.shares || 0),
        vestedShares: Number(row.vestedShares || row.vested_shares || 0),
        exercisedShares: Number(row.exercisedShares || row.exercised_shares || 0),
        strikePrice: Number(row.strikePrice || row.strike_price || row.price || 1),
        currentFMV: 210,
        vestingSchedule: row.vestingSchedule || row.vesting_schedule || "4yr/1yr cliff (Quarterly)",
        status: "Active"
      }] : [];

      return {
        id: row.id || row.employeeId || row.emp_id || `EMP${Math.floor(Math.random() * 9000) + 1000 + idx}`,
        name: row.name || row.employee_name || 'Unknown',
        email: row.email || row.official_email || `user${idx}@teachmint.com`,
        mobile: row.mobile || row.phone || '',
        department: row.department || 'N/A',
        designation: row.designation || 'N/A',
        joinDate: row.joinDate || row.joining_date || new Date().toISOString().split('T')[0],
        grantDate: row.grantDate || row.grant_date || new Date().toISOString().split('T')[0],
        grants: grants,
        transactions: []
      };
    });
    onSuccess(importedEmployees);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center"><Upload size={20} /></div>
             <div><h3 className="text-xl font-bold text-text-main">Bulk Upload Data</h3><p className="text-xs text-text-muted font-medium">Import employees or grants via CSV/JSON</p></div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
        </div>
        <div className="p-10 max-h-[70vh] overflow-y-auto">
          {step === 'upload' ? (
            <div className="space-y-8">
              <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                <h4 className="text-sm font-bold text-brand-primary mb-3 uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle size={16} />
                  CSV Template Guide
                </h4>
                <p className="text-xs text-text-muted mb-4 font-medium">For successful import, ensure your CSV has these headers (case-insensitive):</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[10px] font-mono bg-white/50 dark:bg-black/20 p-4 rounded-xl border border-blue-100/50">
                  <div className="flex justify-between border-b border-blue-100/30 pb-1"><span>Employee ID</span><span className="text-brand-primary font-bold">id</span></div>
                  <div className="flex justify-between border-b border-blue-100/30 pb-1"><span>Full Name</span><span className="text-brand-primary font-bold">name</span></div>
                  <div className="flex justify-between border-b border-blue-100/30 pb-1"><span>Email</span><span className="text-brand-primary font-bold">email</span></div>
                  <div className="flex justify-between border-b border-blue-100/30 pb-1"><span>Shares</span><span className="text-brand-primary font-bold">shares</span></div>
                  <div className="flex justify-between border-b border-blue-100/30 pb-1"><span>Grant ID</span><span className="text-brand-primary font-bold">grantId</span></div>
                  <div className="flex justify-between border-b border-blue-100/30 pb-1"><span>Grant Date</span><span className="text-brand-primary font-bold">grantDate</span></div>
                </div>
              </div>

              <div className="border-2 border-dashed border-slate-200 rounded-3xl p-12 bg-slate-50/50 hover:bg-brand-secondary/30 transition-all group relative">
                <input type="file" accept=".csv,.json" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} />
                <div className="flex flex-col items-center gap-4"><div className="w-20 h-20 rounded-full bg-white shadow-xl flex items-center justify-center text-slate-300 group-hover:text-brand-primary transition-colors">{parsing ? <Loader2 className="animate-spin" size={40} /> : <Upload size={40} />}</div><div><p className="text-lg font-bold text-text-main">Click or drag file to upload</p><p className="text-sm text-text-muted">Supports .csv and .json formats</p></div></div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between"><p className="text-sm font-bold text-text-main">Previewing <span className="text-brand-primary">{data.length}</span> records detected</p><button onClick={() => setStep('upload')} className="text-xs font-bold text-text-muted hover:text-brand-primary underline transition-colors">Change File</button></div>
              <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-[400px] overflow-y-auto shadow-sm">
                <table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-50 border-b border-slate-100"><tr>{Object.keys(data[0] || {}).map(k => (<th key={k} className="px-4 py-3 font-bold text-text-muted uppercase tracking-widest">{k}</th>))}</tr></thead><tbody className="divide-y divide-slate-50 bg-white">{data.slice(0, 10).map((row, i) => (<tr key={i}>{Object.values(row).map((v: any, j) => (<td key={j} className="px-4 py-3 text-text-main truncate max-w-[150px]">{String(v)}</td>))}</tr>))}{data.length > 10 && (<tr><td colSpan={Object.keys(data[0]).length} className="px-4 py-3 text-center text-slate-400 italic">+ {data.length - 10} more records...</td></tr>)}</tbody></table>
              </div>
            </div>
          )}
        </div>
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-text-muted hover:bg-slate-200 transition-all">Cancel</button>
          <button disabled={step === 'upload' || parsing} onClick={processImport} className="px-8 py-2.5 bg-brand-primary text-white rounded-xl font-bold shadow-lg shadow-brand-primary/20 hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 transition-all">Import {data.length} Records</button>
        </div>
      </motion.div>
    </div>
  );
}
