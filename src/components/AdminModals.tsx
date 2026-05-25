/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Download, AlertCircle, CheckCircle2, Loader2, Plus, Trash2, FileText, Gift, PlusCircle, Paperclip } from 'lucide-react';
import Papa from 'papaparse';
import { Employee, Grant } from '../types';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// --- Edit Employee Modal (Highly Stable & Rich Component) ---
interface EditEmployeeProps extends ModalProps {
  employee: Employee;
  onSave: (updated: Employee) => void;
}

export const EditEmployeeModal: React.FC<EditEmployeeProps> = ({ isOpen, onClose, employee, onSave }) => {
  const [formData, setFormData] = useState<Partial<Employee>>({});
  const [lastBoundEmployeeId, setLastBoundEmployeeId] = useState<string | null>(null);

  // Custom Field Form state
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

  // Document upload state
  const [newDocName, setNewDocName] = useState('');
  const [newDocUrl, setNewDocUrl] = useState('');

  // Only bind employee initial state if opening a NEW employee to prevent typing overwrite.
  useEffect(() => {
    if (isOpen && employee && employee.id !== lastBoundEmployeeId) {
      setFormData({
        ...employee,
        cliffType: employee.cliffType || "Annually",
        nomineeName: employee.nomineeName || "",
        nomineeRelation: employee.nomineeRelation || "",
        nomineeContact: employee.nomineeContact || "",
        grantLetterNumber: employee.grantLetterNumber || "",
        customFields: employee.customFields || [],
        documents: employee.documents || []
      });
      setLastBoundEmployeeId(employee.id);
    }
  }, [employee, isOpen, lastBoundEmployeeId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as Employee);
    onClose();
  };

  const handleAddCustomField = () => {
    if (!newFieldName.trim() || !newFieldValue.trim()) return;
    const fields = [...(formData.customFields || [])];
    fields.push({ key: newFieldName.trim(), value: newFieldValue.trim() });
    setFormData({ ...formData, customFields: fields });
    setNewFieldName('');
    setNewFieldValue('');
  };

  const handleRemoveCustomField = (index: number) => {
    const fields = [...(formData.customFields || [])];
    fields.splice(index, 1);
    setFormData({ ...formData, customFields: fields });
  };

  const handleAddDocument = () => {
    if (!newDocName.trim()) return;
    const docs = [...(formData.documents || [])];
    const finalUrl = newDocUrl.trim() || "https://drive.google.com/file/d/1FeJm6poQPXmoYKLJd94gGnqdJmkwhiHL/view?usp=sharing";
    docs.push({
      id: `DOC-${Math.floor(Math.random() * 9000) + 1000}`,
      name: newDocName.trim(),
      url: finalUrl,
      uploadDate: new Date().toISOString().split('T')[0]
    });
    setFormData({ ...formData, documents: docs });
    setNewDocName('');
    setNewDocUrl('');
  };

  const handleReplaceDocument = (index: number, newUrl: string) => {
    const docs = [...(formData.documents || [])];
    if (docs[index]) {
      docs[index] = {
        ...docs[index],
        url: newUrl || "https://drive.google.com/file/d/1FeJm6poQPXmoYKLJd94gGnqdJmkwhiHL/view?usp=sharing",
        uploadDate: new Date().toISOString().split('T')[0]
      };
      setFormData({ ...formData, documents: docs });
    }
  };

  const handleRemoveDocument = (index: number) => {
    const docs = [...(formData.documents || [])];
    docs.splice(index, 1);
    setFormData({ ...formData, documents: docs });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-text-main">Edit Employee Profile & Vesting Setup</h3>
            <p className="text-xs text-text-muted">Modify organizational parameters, cliff settings, custom fields, and documents.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-8 space-y-8 overflow-y-auto flex-1">
            
            {/* Core Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-brand-primary uppercase tracking-wider border-b border-slate-100 pb-2">Core Demographics</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Employee ID (Editable)</label>
                  <input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-primary outline-none transition-all font-bold text-brand-primary" value={formData.id || ''} onChange={e => setFormData({...formData, id: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Full Name</label>
                  <input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-primary outline-none transition-all" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Email Address</label>
                  <input type="email" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-primary outline-none transition-all" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Mobile Number</label>
                  <input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-primary outline-none transition-all" value={formData.mobile || ''} onChange={e => setFormData({...formData, mobile: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Department</label>
                  <input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-primary outline-none transition-all" value={formData.department || ''} onChange={e => setFormData({...formData, department: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Designation</label>
                  <input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-primary outline-none transition-all" value={formData.designation || ''} onChange={e => setFormData({...formData, designation: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Joining Date (Triggers Vesting)</label>
                  <input type="date" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-primary outline-none transition-all" value={formData.joinDate || ''} onChange={e => setFormData({...formData, joinDate: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Account Password</label>
                  <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-primary outline-none transition-all" value={formData.password || ''} placeholder="Keep current or reset" onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Grant & Nominee Details */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-brand-primary uppercase tracking-wider border-b border-slate-100 pb-2">Grant & Nominee Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Grant Letter Number</label>
                  <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-primary outline-none transition-all font-bold text-brand-primary" value={formData.grantLetterNumber || ''} placeholder="e.g. TV-ESOP-2026-001" onChange={e => setFormData({...formData, grantLetterNumber: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Grant Date</label>
                  <input type="date" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-primary outline-none transition-all" value={formData.grantDate || ''} onChange={e => setFormData({...formData, grantDate: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Nominee Full Name</label>
                  <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-primary outline-none transition-all" value={formData.nomineeName || ''} placeholder="Nominee's Name" onChange={e => setFormData({...formData, nomineeName: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Nominee Relation</label>
                  <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-primary outline-none transition-all" value={formData.nomineeRelation || ''} placeholder="e.g. Spouse / Child / Parent" onChange={e => setFormData({...formData, nomineeRelation: e.target.value})} />
                </div>
                <div className="space-y-1.5 col-span-1 md:col-span-2">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Nominee Contact Number</label>
                  <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-primary outline-none transition-all" value={formData.nomineeContact || ''} placeholder="Nominee contact mobile, if any" onChange={e => setFormData({...formData, nomineeContact: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Vesting & Cliff Setup Selection */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-brand-primary uppercase tracking-wider border-b border-slate-100 pb-2">Cliff Configuration</h4>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-widest block">Cliff Selection Option</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white outline-none focus:border-brand-primary font-bold text-sm"
                    value={formData.cliffType || "Annually"}
                    onChange={e => setFormData({ ...formData, cliffType: e.target.value as any })}
                  >
                    <option value="Quarterly">Quarterly Cliff (3 Months)</option>
                    <option value="Half Yearly">Half Yearly Cliff (6 Months)</option>
                    <option value="Annually">Annually Cliff (12 Months / Standard)</option>
                  </select>
                </div>
                <p className="text-xs font-medium text-text-muted">
                  Note: Automated vesting cycles are triggered based on the above Cliff selection from the Joining Date. All options before the cliff will accumulate and vest exactly as legal clauses designate.
                </p>
              </div>
            </div>

            {/* Admin Custom Fields Panel */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-brand-primary uppercase tracking-wider border-b border-slate-100 pb-2">Custom Profile Fields</h4>
              
              {/* Render Existing Fields */}
              <div className="space-y-2">
                {(!formData.customFields || formData.customFields.length === 0) ? (
                  <p className="text-xs italic text-text-muted">No custom fields assigned to this profile.</p>
                ) : (
                  formData.customFields.map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-xs font-bold text-text-muted tracking-wider uppercase">{f.key}:</span>
                        <span className="text-sm font-bold text-text-main ml-2">{f.value}</span>
                      </div>
                      <button type="button" onClick={() => handleRemoveCustomField(i)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>
                    </div>
                  ))
                )}
              </div>

              {/* Add Custom Field Form */}
              <div className="bg-slate-100/50 p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Field Name</label>
                  <input type="text" placeholder="e.g. PAN Card" className="w-full px-3 py-2 text-xs rounded-lg border bg-white outline-none" value={newFieldName} onChange={e => setNewFieldName(e.target.value)} />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Field Value</label>
                  <input type="text" placeholder="e.g. ABCDE1234F" className="w-full px-3 py-2 text-xs rounded-lg border bg-white outline-none" value={newFieldValue} onChange={e => setNewFieldValue(e.target.value)} />
                </div>
                <button type="button" onClick={handleAddCustomField} className="bg-brand-primary text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1"><PlusCircle size={14} />Add Field</button>
              </div>
            </div>

            {/* Admin Document Upload Panel */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-brand-primary uppercase tracking-wider border-b border-slate-100 pb-2">Employee official documents</h4>
              
              {/* Render List */}
              <div className="space-y-3">
                {(!formData.documents || formData.documents.length === 0) ? (
                  <p className="text-xs italic text-text-muted">No documents uploaded or attached yet.</p>
                ) : (
                  formData.documents.map((d, i) => (
                    <div key={d.id} className="flex flex-col gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Paperclip size={16} className="text-brand-primary" />
                          <span className="text-xs font-extrabold text-text-main">{d.name}</span>
                          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-text-muted font-bold">{d.uploadDate}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-brand-primary hover:underline mr-2">Check Doc</a>
                          <button type="button" onClick={() => handleRemoveDocument(i)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          placeholder="Replace Document Link URL" 
                          className="w-full px-3 py-1.5 text-xs bg-white border rounded-lg"
                          defaultValue={d.url}
                          onBlur={e => handleReplaceDocument(i, e.target.value)}
                        />
                        <span className="text-[9px] font-black text-slate-400 whitespace-nowrap">Press tab to replace</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Document Entry */}
              <div className="bg-slate-100/50 p-4 rounded-2xl flex flex-col gap-3">
                <span className="text-xs font-extrabold text-text-main">Add/Attach New Legal Document</span>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Document Title</label>
                    <input type="text" placeholder="e.g. Non Disclosure Agreement (NDA)" className="w-full px-3 py-2 text-xs rounded-lg border bg-white outline-none" value={newDocName} onChange={e => setNewDocName(e.target.value)} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Document URL (Google Drive / PDF)</label>
                    <input type="text" placeholder="https://drive.google.com/..." className="w-full px-3 py-2 text-xs rounded-lg border bg-white outline-none" value={newDocUrl} onChange={e => setNewDocUrl(e.target.value)} />
                  </div>
                </div>
                <button type="button" onClick={handleAddDocument} className="bg-brand-primary text-white text-xs font-bold px-4 py-2 rounded-lg self-end flex items-center gap-1"><PlusCircle size={14} />Attach document</button>
              </div>
            </div>

          </div>
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-text-muted hover:bg-slate-200 transition-all">Cancel</button>
            <button type="submit" className="px-8 py-2.5 bg-brand-primary text-white rounded-xl font-bold shadow-lg shadow-brand-primary/20 hover:scale-[1.02] transition-all">Save Profile Changes</button>
          </div>
        </form>
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
    grantDate: new Date().toISOString().split('T')[0],
    joinDate: new Date().toISOString().split('T')[0],
    cliffType: "Annually",
    customFields: [],
    documents: [],
    password: "login123",
    grantLetterNumber: "",
    nomineeName: "",
    nomineeRelation: "",
    nomineeContact: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.id) return;
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
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
          <div className="p-8 space-y-6 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Employee ID (Editable)</label>
                <input required type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none font-bold text-brand-primary" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Full Name</label>
                <input required type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" placeholder="e.g. John Doe" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Email Address</label>
                <input required type="email" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" placeholder="john@teachmint.com" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Mobile Number</label>
                <input required type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" placeholder="9988776655" value={formData.mobile || ''} onChange={e => setFormData({...formData, mobile: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Department</label>
                <input required type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" placeholder="e.g. Engineering" value={formData.department || ''} onChange={e => setFormData({...formData, department: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Designation</label>
                <input required type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" placeholder="e.g. Senior Dev" value={formData.designation || ''} onChange={e => setFormData({...formData, designation: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Joining Date (Triggers Vesting)</label>
                <input required type="date" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" value={formData.joinDate} onChange={e => setFormData({...formData, joinDate: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Account Password</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>

              {/* Grant & Nominee Details */}
              <div className="space-y-1.5 col-span-1 md:col-span-2">
                <h4 className="text-xs font-bold text-brand-primary uppercase tracking-wider border-b border-slate-100 pb-1 mt-4">Grant & Nominee Details</h4>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Grant Letter Number</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-primary outline-none transition-all font-bold text-brand-primary" value={formData.grantLetterNumber || ''} placeholder="e.g. TV-ESOP-2026-001" onChange={e => setFormData({...formData, grantLetterNumber: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Grant Date</label>
                <input type="date" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-primary outline-none transition-all" value={formData.grantDate || ''} onChange={e => setFormData({...formData, grantDate: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Nominee Full Name</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-primary outline-none transition-all" value={formData.nomineeName || ''} placeholder="Nominee's Name" onChange={e => setFormData({...formData, nomineeName: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Nominee Relation</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-primary outline-none transition-all" value={formData.nomineeRelation || ''} placeholder="e.g. Spouse / Child / Parent" onChange={e => setFormData({...formData, nomineeRelation: e.target.value})} />
              </div>
              <div className="space-y-1.5 col-span-1 md:col-span-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Nominee Contact Number</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-brand-primary outline-none transition-all" value={formData.nomineeContact || ''} placeholder="Nominee contact mobile, if any" onChange={e => setFormData({...formData, nomineeContact: e.target.value})} />
              </div>

              <div className="space-y-1.5 col-span-1 md:col-span-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">Default Cliff Option</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none bg-white text-sm font-bold"
                  value={formData.cliffType}
                  onChange={e => setFormData({...formData, cliffType: e.target.value as any})}
                >
                  <option value="Quarterly">Quarterly Cliff (3 Months)</option>
                  <option value="Half Yearly">Half Yearly Cliff (6 Months)</option>
                  <option value="Annually">Annually Cliff (12 Months / Standard)</option>
                </select>
              </div>
            </div>
            <div className="p-3 bg-brand-primary/5 rounded-2xl text-[11px] text-brand-primary font-bold uppercase tracking-wider border border-brand-primary/10 flex items-center gap-2">
              <CheckCircle2 size={14} />
              An invitation email will automatically be sent to trigger initial workspace login and password setup.
            </div>
          </div>
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-text-muted hover:bg-slate-200 transition-all">Cancel</button>
            <button type="submit" className="px-8 py-2.5 bg-brand-primary text-white rounded-xl font-bold shadow-lg shadow-brand-primary/20 hover:scale-[1.02] transition-all">Create Profile</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// --- Manage Grants Modal (Stable index-based logic to avoid ID-rename crashes) ---
interface ManageGrantsProps extends ModalProps {
  employee: Employee;
  onSave: (updated: Employee) => void;
}

export const ManageGrantsModal: React.FC<ManageGrantsProps> = ({ isOpen, onClose, employee, onSave }) => {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [lastBoundEmployeeId, setLastBoundEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && employee && employee.id !== lastBoundEmployeeId) {
      setGrants([...employee.grants]);
      setLastBoundEmployeeId(employee.id);
    }
  }, [employee, isOpen, lastBoundEmployeeId]);

  const handleAddGrant = () => {
    const newGrant: Grant = {
      id: `GRT-${Math.floor(Math.random() * 9000) + 1000}`,
      grantDate: employee.joinDate || new Date().toISOString().split('T')[0],
      totalShares: 1000,
      vestedShares: 0,
      exercisedShares: 0,
      strikePrice: 1,
      currentFMV: 210,
      vestingSchedule: "Quarterly Vesting (Automated)",
      status: "Active"
    };
    setGrants([...grants, newGrant]);
  };

  const handleRemoveGrant = (idx: number) => {
    const updated = [...grants];
    updated.splice(idx, 1);
    setGrants(updated);
  };

  const handleUpdateGrant = (idx: number, field: keyof Grant, value: any) => {
    const updated = [...grants];
    if (updated[idx]) {
      updated[idx] = { ...updated[idx], [field]: value };
      setGrants(updated);
    }
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
          <div>
            <h3 className="text-xl font-bold text-text-main">Manage Equity Grants for {employee.name}</h3>
            <p className="text-xs text-text-muted font-medium">Assign, modify, or delete employee equity grants.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
        </div>
        <div className="p-8 max-h-[60vh] overflow-y-auto space-y-6">
          {grants.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <Gift size={40} className="mx-auto text-slate-300 mb-4" />
              <p className="text-sm font-bold text-text-main">No grants assigned yet</p>
              <p className="text-xs text-text-muted mt-1">Start by adding a new equity grant</p>
            </div>
          ) : (
            <div className="space-y-4">
              {grants.map((grant, idx) => (
                <div key={idx} className="p-6 rounded-2xl border border-slate-100 bg-white shadow-sm ring-1 ring-black/5">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3 w-full max-w-md">
                      <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-xs">{idx + 1}</div>
                      <div className="flex-1">
                        <label className="text-[9px] font-bold text-brand-primary uppercase tracking-widest block mb-0.5">Grant ID (Editable)</label>
                        <input 
                          type="text" 
                          className="font-bold text-lg text-text-main outline-none focus:text-brand-primary border-b border-dashed border-slate-200 focus:border-brand-primary transition-colors pb-0.5 w-full" 
                          value={grant.id} 
                          onChange={e => handleUpdateGrant(idx, 'id', e.target.value)} 
                        />
                      </div>
                    </div>
                    <button onClick={() => handleRemoveGrant(idx)} className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={18} /></button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Total Shares</label>
                      <input type="number" className="w-full bg-slate-50 px-3 py-2 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-brand-primary/10" value={grant.totalShares} onChange={e => handleUpdateGrant(idx, 'totalShares', Number(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Strike Price (INR / Unit)</label>
                      <input type="number" className="w-full bg-slate-50 px-3 py-2 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-brand-primary/10" value={grant.strikePrice} onChange={e => handleUpdateGrant(idx, 'strikePrice', Number(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Grant Date</label>
                      <input type="date" className="w-full bg-slate-50 px-3 py-2 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-brand-primary/10" value={grant.grantDate} onChange={e => handleUpdateGrant(idx, 'grantDate', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Vesting Schedule Type</label>
                      <select 
                        className="w-full bg-slate-50 px-3 py-2 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-brand-primary/10 transition-all" 
                        value={grant.vestingSchedule} 
                        onChange={e => handleUpdateGrant(idx, 'vestingSchedule', e.target.value)}
                      >
                        <option value="Quarterly Vesting (Automated)">Quarterly Vesting (Automated)</option>
                        <option value="Monthly Vesting (Automated)">Monthly Vesting (Automated)</option>
                        <option value="Immediate">Immediate Vesting</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Manual Vested override</label>
                      <input type="number" placeholder="0" className="w-full bg-slate-50 px-3 py-2 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-brand-primary/10" value={grant.vestedShares} onChange={e => handleUpdateGrant(idx, 'vestedShares', Number(e.target.value))} />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-[10px] text-brand-primary font-bold uppercase tracking-wider bg-brand-primary/5 px-3 py-1.5 rounded-lg w-fit">
                    <CheckCircle2 size={12} />
                    TeachVest Engine: Automated calculation enabled based on Employee Cliff Selection ({employee.cliffType || "Annually"})
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
        vestingSchedule: row.vestingSchedule || row.vesting_schedule || "Quarterly Vesting (Automated)",
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
        transactions: [],
        cliffType: "Annually",
        customFields: [],
        documents: [],
        password: "login123"
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
