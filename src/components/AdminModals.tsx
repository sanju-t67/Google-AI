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
  existingEmployees: Employee[];
}

export const EditEmployeeModal: React.FC<EditEmployeeProps> = ({ isOpen, onClose, employee, onSave, existingEmployees }) => {
  const [formData, setFormData] = useState<Partial<Employee>>({});
  const [lastBoundEmployeeId, setLastBoundEmployeeId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");

  // Custom Field Form state
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

  // Document upload state
  const [newDocName, setNewDocName] = useState('');
  const [newDocUrl, setNewDocUrl] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const [fileError, setFileError] = useState('');
  const [fileSuccess, setFileSuccess] = useState('');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleFileRead = (file: File) => {
    setFileError('');
    setFileSuccess('');
    
    // Automatically set document name if currently empty
    if (!newDocName.trim()) {
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setNewDocName(nameWithoutExt);
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      if (base64Url) {
        setNewDocUrl(base64Url);
        setFileSuccess(`"${file.name}" loaded successfully from local storage!`);
      } else {
        setFileError("Couldn't read file content.");
      }
    };
    reader.onerror = () => {
      setFileError("Error reading local storage file.");
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    setFileError('');
    setFileSuccess('');

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileRead(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setFileError('');
    setFileSuccess('');
    if (e.target.files && e.target.files[0]) {
      handleFileRead(e.target.files[0]);
    }
  };

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
      setError("");
    }
  }, [employee, isOpen, lastBoundEmployeeId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.id) {
      setError("Please fill out all required fields.");
      return;
    }

    const trimId = formData.id.trim();
    if (existingEmployees.some(emp => emp.id.toLowerCase().trim() === trimId.toLowerCase() && emp.id !== employee.id)) {
      setError(`Employee ID "${trimId}" is already assigned to another stakeholder. It must be unique.`);
      return;
    }

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
    setFileSuccess('');
    setFileError('');
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
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-text-main">Edit Employee Profile & Vesting Setup</h3>
            <p className="text-xs text-text-muted">Modify organizational parameters, cliff settings, custom fields, and documents.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-8 space-y-8 overflow-y-auto flex-1">
            
            {/* Core Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-brand-primary uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Profile</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Employee ID (Editable)</label>
                  <input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main focus:border-brand-primary outline-none transition-all font-bold text-brand-primary" value={formData.id || ''} onChange={e => setFormData({...formData, id: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Full Name</label>
                  <input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main focus:border-brand-primary outline-none transition-all" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Email Address</label>
                  <input type="email" required className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main focus:border-brand-primary outline-none transition-all" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Mobile Number</label>
                  <input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main focus:border-brand-primary outline-none transition-all" value={formData.mobile || ''} onChange={e => setFormData({...formData, mobile: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Department</label>
                  <input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main focus:border-brand-primary outline-none transition-all" value={formData.department || ''} onChange={e => setFormData({...formData, department: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Designation</label>
                  <input type="text" required className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main focus:border-brand-primary outline-none transition-all" value={formData.designation || ''} onChange={e => setFormData({...formData, designation: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Joining Date (Triggers Vesting)</label>
                  <input type="date" required className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main focus:border-brand-primary outline-none transition-all" value={formData.joinDate || ''} onChange={e => setFormData({...formData, joinDate: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Account Password</label>
                  <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main focus:border-brand-primary outline-none transition-all" value={formData.password || ''} placeholder="Keep current or reset" onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Grant & Nominee Details */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-brand-primary uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Grant & Nominee Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Grant Letter Number</label>
                  <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main focus:border-brand-primary outline-none transition-all font-bold text-brand-primary" value={formData.grantLetterNumber || ''} placeholder="e.g. TV-ESOP-2026-001" onChange={e => setFormData({...formData, grantLetterNumber: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Grant Date</label>
                  <input type="date" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main focus:border-brand-primary outline-none transition-all" value={formData.grantDate || ''} onChange={e => setFormData({...formData, grantDate: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Nominee Full Name</label>
                  <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main focus:border-brand-primary outline-none transition-all" value={formData.nomineeName || ''} placeholder="Nominee's Name" onChange={e => setFormData({...formData, nomineeName: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Nominee Relation</label>
                  <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main focus:border-brand-primary outline-none transition-all" value={formData.nomineeRelation || ''} placeholder="e.g. Spouse / Child / Parent" onChange={e => setFormData({...formData, nomineeRelation: e.target.value})} />
                </div>
                <div className="space-y-1.5 col-span-1 md:col-span-2">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Nominee Contact Number</label>
                  <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main focus:border-brand-primary outline-none transition-all" value={formData.nomineeContact || ''} placeholder="Nominee contact mobile, if any" onChange={e => setFormData({...formData, nomineeContact: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Vesting & Cliff Setup Selection */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-brand-primary uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Cliff Configuration</h4>
              <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-widest block">Cliff Selection Option</label>
                  <select 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main outline-none focus:border-brand-primary font-bold text-sm"
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
              <h4 className="text-sm font-bold text-brand-primary uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Custom Profile Fields</h4>
              
              {/* Render Existing Fields */}
              <div className="space-y-2">
                {(!formData.customFields || formData.customFields.length === 0) ? (
                  <p className="text-xs italic text-text-muted">No custom fields assigned to this profile.</p>
                ) : (
                  formData.customFields.map((f, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800">
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
              <div className="bg-slate-100/50 dark:bg-slate-950/40 p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Field Name</label>
                  <input type="text" placeholder="e.g. PAN Card" className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main outline-none" value={newFieldName} onChange={e => setNewFieldName(e.target.value)} />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Field Value</label>
                  <input type="text" placeholder="e.g. ABCDE1234F" className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main outline-none" value={newFieldValue} onChange={e => setNewFieldValue(e.target.value)} />
                </div>
                <button type="button" onClick={handleAddCustomField} className="bg-brand-primary text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1"><PlusCircle size={14} />Add Field</button>
              </div>
            </div>

            {/* Admin Document Upload Panel */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-brand-primary uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">Employee official documents</h4>
              
              {/* Render List */}
              <div className="space-y-3">
                {(!formData.documents || formData.documents.length === 0) ? (
                  <p className="text-xs italic text-text-muted">No documents uploaded or attached yet.</p>
                ) : (
                  formData.documents.map((d, i) => (
                    <div key={d.id || i} className="flex flex-col gap-2 p-4 bg-slate-50 dark:bg-slate-950 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Paperclip size={16} className="text-brand-primary" />
                          <span className="text-xs font-extrabold text-text-main">{d.name}</span>
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-text-muted font-bold">{d.uploadDate}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Secure checker button to view or download document correctly for both base64 & drive URLs */}
                          <button
                            type="button"
                            onClick={() => {
                              if (d.url && d.url.startsWith("data:")) {
                                const link = document.createElement("a");
                                link.href = d.url;
                                link.download = d.name;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              } else if (d.url) {
                                window.open(d.url, "_blank");
                              }
                            }}
                            className="text-xs font-extrabold text-brand-primary hover:underline"
                          >
                            Check Doc
                          </button>
                          
                          <div className="h-3 w-[1px] bg-slate-200 dark:bg-slate-700" />

                          {/* Quick Replace File Upload trigger */}
                          <label 
                            htmlFor={`replace-file-${i}`}
                            className="text-xs font-extrabold text-slate-500 hover:text-brand-primary hover:underline cursor-pointer flex items-center gap-1"
                          >
                            <Upload size={13} />
                            Replace File
                          </label>
                          <input 
                            type="file" 
                            id={`replace-file-${i}`} 
                            className="hidden" 
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                const file = e.target.files[0];
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  const base64Url = event.target?.result as string;
                                  if (base64Url) {
                                    handleReplaceDocument(i, base64Url);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />

                          <div className="h-3 w-[1px] bg-slate-200 dark:bg-slate-700" />

                          <button type="button" onClick={() => handleRemoveDocument(i)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          placeholder="Replace Document Link URL" 
                          className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-text-main border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-brand-primary"
                          value={d.url || ""}
                          onChange={e => handleReplaceDocument(i, e.target.value)}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Document Entry */}
              <div className="bg-slate-100/50 dark:bg-slate-950/40 p-5 rounded-2xl flex flex-col gap-4">
                <span className="text-xs font-extrabold text-text-main flex items-center gap-1.5">
                  <Paperclip size={14} className="text-brand-primary" />
                  Add/Attach New Legal Document
                </span>

                {/* Local Storage Device File Picker (Drag-and-Drop) */}
                <div className="space-y-2">
                  <input 
                    type="file" 
                    id="local-file-upload" 
                    className="hidden" 
                    onChange={handleFileChange} 
                  />
                  
                  <div 
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                      isDragActive 
                        ? 'border-brand-primary bg-brand-primary/10 dark:bg-brand-primary/5 scale-[1.01]' 
                        : 'border-slate-200 dark:border-slate-800 hover:border-brand-primary/50 hover:bg-slate-50 dark:hover:bg-slate-900/30'
                    }`}
                  >
                    <label htmlFor="local-file-upload" className="w-full text-center cursor-pointer flex flex-col items-center justify-center gap-1.5">
                      <div className="w-10 h-10 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center mb-1">
                        <Upload size={18} />
                      </div>
                      <span className="text-xs font-extrabold text-text-main">
                        Drag & drop a file from your computer or <span className="text-brand-primary underline">browse</span>
                      </span>
                      <span className="text-[10px] text-text-muted font-bold">
                        Supports PDF, PNG, JPG, or any official document
                      </span>
                    </label>
                  </div>

                  {fileSuccess && (
                    <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-950/20 px-3 py-2 rounded-xl border border-emerald-500/10 dark:border-emerald-800 flex items-center gap-2 leading-tight">
                      <CheckCircle2 size={14} className="flex-shrink-0" />
                      <span>{fileSuccess}</span>
                    </div>
                  )}

                  {fileError && (
                    <div className="text-[11px] font-bold text-red-600 dark:text-red-400 bg-red-500/10 dark:bg-red-950/20 px-3 py-2 rounded-xl border border-red-500/10 dark:border-red-800 flex items-center gap-2 leading-tight">
                      <AlertCircle size={14} className="flex-shrink-0" />
                      <span>{fileError}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Document Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Non Disclosure Agreement (NDA)" 
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main outline-none focus:border-brand-primary" 
                      value={newDocName} 
                      onChange={e => setNewDocName(e.target.value)} 
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Document URL (Autofilled on Upload)</label>
                    <input 
                      type="text" 
                      placeholder="https://drive.google.com/..." 
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main outline-none focus:border-brand-primary truncate" 
                      value={newDocUrl} 
                      onChange={e => setNewDocUrl(e.target.value)} 
                    />
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={handleAddDocument} 
                  disabled={!newDocName.trim()}
                  className="bg-brand-primary disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-lg self-end flex items-center gap-1 shadow-md shadow-brand-primary/10 hover:scale-[1.02] transition-all"
                >
                  <PlusCircle size={14} />
                  Attach document
                </button>
              </div>
            </div>
          </div>
          {error && (
            <div className="mx-8 mb-4 p-4 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold rounded-2xl border border-red-500/20 flex items-center gap-2">
              <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-text-muted hover:bg-slate-200 dark:hover:bg-slate-800 transition-all">Cancel</button>
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
  existingEmployees: Employee[];
}

export const AddEmployeeModal: React.FC<AddEmployeeProps> = ({ isOpen, onClose, onAdd, existingEmployees }) => {
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
  const [error, setError] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.id) {
      setError("Please fill out all required fields.");
      return;
    }

    const trimId = formData.id.trim();
    if (existingEmployees.some(emp => emp.id.toLowerCase().trim() === trimId.toLowerCase())) {
      setError(`Employee ID "${trimId}" is already assigned. It must be unique.`);
      return;
    }

    onAdd(formData as Employee);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-xl font-bold text-text-main">Add New Employee</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-text-muted"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
          <div className="p-8 space-y-6 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Employee ID (Editable)</label>
                <input required type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main focus:border-brand-primary outline-none transition-all font-bold text-brand-primary" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Full Name</label>
                <input required type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main focus:border-brand-primary outline-none transition-all" placeholder="e.g. John Doe" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Email Address</label>
                <input required type="email" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main focus:border-brand-primary outline-none transition-all" placeholder="john@teachmint.com" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Mobile Number</label>
                <input required type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main focus:border-brand-primary outline-none transition-all" placeholder="9988776655" value={formData.mobile || ''} onChange={e => setFormData({...formData, mobile: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Department</label>
                <input required type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main focus:border-brand-primary outline-none transition-all" placeholder="e.g. Engineering" value={formData.department || ''} onChange={e => setFormData({...formData, department: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Designation</label>
                <input required type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main focus:border-brand-primary outline-none transition-all" placeholder="e.g. Senior Dev" value={formData.designation || ''} onChange={e => setFormData({...formData, designation: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Joining Date (Triggers Vesting)</label>
                <input required type="date" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main focus:border-brand-primary outline-none transition-all" value={formData.joinDate} onChange={e => setFormData({...formData, joinDate: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Account Password</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main focus:border-brand-primary outline-none transition-all" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>

              {/* Grant & Nominee Details */}
              <div className="space-y-1.5 col-span-1 md:col-span-2">
                <h4 className="text-xs font-bold text-brand-primary uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-1 mt-4">Grant & Nominee Details</h4>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Grant Letter Number</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main focus:border-brand-primary outline-none transition-all font-bold text-brand-primary" value={formData.grantLetterNumber || ''} placeholder="e.g. TV-ESOP-2026-001" onChange={e => setFormData({...formData, grantLetterNumber: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Grant Date</label>
                <input type="date" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main focus:border-brand-primary outline-none transition-all" value={formData.grantDate || ''} onChange={e => setFormData({...formData, grantDate: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Nominee Full Name</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main focus:border-brand-primary outline-none transition-all" value={formData.nomineeName || ''} placeholder="Nominee's Name" onChange={e => setFormData({...formData, nomineeName: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Nominee Relation</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main focus:border-brand-primary outline-none transition-all" value={formData.nomineeRelation || ''} placeholder="e.g. Spouse / Child / Parent" onChange={e => setFormData({...formData, nomineeRelation: e.target.value})} />
              </div>
              <div className="space-y-1.5 col-span-1 md:col-span-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Nominee Contact Number</label>
                <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main focus:border-brand-primary outline-none transition-all" value={formData.nomineeContact || ''} placeholder="Nominee contact mobile, if any" onChange={e => setFormData({...formData, nomineeContact: e.target.value})} />
              </div>

              <div className="space-y-1.5 col-span-1 md:col-span-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">Default Cliff Option</label>
                <select 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main outline-none text-sm font-bold"
                  value={formData.cliffType}
                  onChange={e => setFormData({...formData, cliffType: e.target.value as any})}
                >
                  <option value="Quarterly">Quarterly Cliff (3 Months)</option>
                  <option value="Half Yearly">Half Yearly Cliff (6 Months)</option>
                  <option value="Annually">Annually Cliff (12 Months / Standard)</option>
                </select>
              </div>
            </div>
            {error && (
              <div className="p-4 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold rounded-2xl border border-red-500/20 flex items-center gap-2">
                <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="p-3 bg-brand-primary/5 rounded-2xl text-[11px] text-brand-primary font-bold uppercase tracking-wider border border-brand-primary/10 flex items-center gap-2">
              <CheckCircle2 size={14} />
              An invitation email will automatically be sent to trigger initial workspace login and password setup.
            </div>
          </div>
          <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-text-muted hover:bg-slate-200 dark:hover:bg-slate-800 transition-all">Cancel</button>
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
  existingEmployees: Employee[];
}

export const ManageGrantsModal: React.FC<ManageGrantsProps> = ({ isOpen, onClose, employee, onSave, existingEmployees }) => {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [lastBoundEmployeeId, setLastBoundEmployeeId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (isOpen && employee && employee.id !== lastBoundEmployeeId) {
      setGrants([...employee.grants]);
      setLastBoundEmployeeId(employee.id);
      setError("");
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
    // 1. Check for empty Grant ID
    if (grants.some(g => !g.id || !g.id.trim())) {
      setError("Each grant must have a valid, non-empty Grant ID.");
      return;
    }

    // 2. Check for duplicate Grant ID within this employee's list itself
    const localGrantIds = grants.map(g => g.id.toLowerCase().trim());
    if (localGrantIds.some((id, index) => localGrantIds.indexOf(id) !== index)) {
      setError("Duplicate Grant ID detected in this list. Each Grant ID must be unique.");
      return;
    }

    // 3. Check for uniqueness across ALL other employees' grants
    for (const grant of grants) {
      const targetGrantId = grant.id.toLowerCase().trim();
      for (const emp of existingEmployees) {
        if (emp.id === employee.id) continue;
        const employeeHasDuplicate = emp.grants && emp.grants.some(g => g.id.toLowerCase().trim() === targetGrantId);
        if (employeeHasDuplicate) {
          setError(`Grant ID "${grant.id}" is already assigned to employee "${emp.name}" (ID: ${emp.id}). Each Grant ID must be globally unique.`);
          return;
        }
      }
    }

    onSave({ ...employee, grants });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-text-main">Manage Equity Grants for {employee.name}</h3>
            <p className="text-xs text-text-muted font-medium">Assign, modify, or delete employee equity grants.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-text-muted"><X size={20} /></button>
        </div>
        <div className="p-8 max-h-[60vh] overflow-y-auto space-y-6">
          {grants.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 dark:bg-slate-950 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
              <Gift size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
              <p className="text-sm font-bold text-text-main">No grants assigned yet</p>
              <p className="text-xs text-text-muted mt-1">Start by adding a new equity grant</p>
            </div>
          ) : (
            <div className="space-y-4">
              {grants.map((grant, idx) => (
                <div key={idx} className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-sm ring-1 ring-black/5 dark:ring-white/5">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3 w-full max-w-md">
                      <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-xs">{idx + 1}</div>
                      <div className="flex-1">
                        <label className="text-[9px] font-bold text-brand-primary uppercase tracking-widest block mb-0.5">Grant ID (Editable)</label>
                        <input 
                          type="text" 
                          className="font-bold text-lg text-text-main bg-transparent outline-none focus:text-brand-primary border-b border-dashed border-slate-200 focus:border-brand-primary transition-colors pb-0.5 w-full" 
                          value={grant.id} 
                          onChange={e => handleUpdateGrant(idx, 'id', e.target.value)} 
                        />
                      </div>
                    </div>
                    <button onClick={() => handleRemoveGrant(idx)} className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all"><Trash2 size={18} /></button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Total Shares</label>
                      <input type="number" className="w-full bg-slate-50 dark:bg-slate-800 text-text-main px-3 py-2 rounded-lg text-sm font-bold outline-none border border-transparent dark:border-slate-700 focus:ring-2 focus:ring-brand-primary/10" value={grant.totalShares} onChange={e => handleUpdateGrant(idx, 'totalShares', Number(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Strike Price (INR / Unit)</label>
                      <input type="number" className="w-full bg-slate-50 dark:bg-slate-800 text-text-main px-3 py-2 rounded-lg text-sm font-bold outline-none border border-transparent dark:border-slate-700 focus:ring-2 focus:ring-brand-primary/10" value={grant.strikePrice} onChange={e => handleUpdateGrant(idx, 'strikePrice', Number(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Grant Date</label>
                      <input type="date" className="w-full bg-slate-50 dark:bg-slate-800 text-text-main px-3 py-2 rounded-lg text-sm font-bold outline-none border border-transparent dark:border-slate-700 focus:ring-2 focus:ring-brand-primary/10" value={grant.grantDate} onChange={e => handleUpdateGrant(idx, 'grantDate', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Vesting Schedule Type</label>
                      <select 
                        className="w-full bg-slate-50 dark:bg-slate-800 text-text-main px-3 py-2 rounded-lg text-sm font-bold outline-none border border-transparent dark:border-slate-700 focus:ring-2 focus:ring-brand-primary/10 transition-all" 
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
                      <input type="number" placeholder="0" className="w-full bg-slate-50 dark:bg-slate-800 text-text-main px-3 py-2 rounded-lg text-sm font-bold outline-none border border-transparent dark:border-slate-700 focus:ring-2 focus:ring-brand-primary/10" value={grant.vestedShares} onChange={e => handleUpdateGrant(idx, 'vestedShares', Number(e.target.value))} />
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
          <button onClick={handleAddGrant} className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-slate-950 hover:border-brand-primary/30 hover:text-brand-primary transition-all flex items-center justify-center gap-2"><Plus size={20} />Add New Grant Allocation</button>
        </div>
        {error && (
          <div className="mx-8 mb-4 p-4 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold rounded-2xl border border-red-500/20 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-text-muted hover:bg-slate-200 dark:hover:bg-slate-800 transition-all">Cancel</button>
          <button onClick={handleSave} className="px-8 py-2.5 bg-brand-primary text-white rounded-xl font-bold shadow-lg shadow-brand-primary/20 transition-all">Save All Changes</button>
        </div>
      </motion.div>
    </div>
  );
};

interface BulkUploadProps extends ModalProps {
  onSuccess: (employees: Employee[]) => void;
  existingEmployees?: Employee[];
}

export const BulkUploadModal: React.FC<BulkUploadProps> = ({ isOpen, onClose, onSuccess, existingEmployees = [] }) => {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');

  const handleDownloadSampleCSV = () => {
    const headers = [
      "Employee-ID",
      "Employee Name",
      "Employee Email",
      "Department",
      "Designation",
      "Joining Date",
      "Grant ID",
      "Grant Date",
      "Value of Options Granted",
      "Total Options",
      "Date of 1st Vesting",
      "Options - 1st Vesting",
      "Date of 2nd Vesting",
      "Options - 2nd Vesting",
      "Date of 3rd Vesting",
      "Options - 3rd Vesting",
      "Date of 4th Vesting",
      "Options - 4th Vesting",
      "Date of 5th Vesting",
      "Options - 5th Vesting",
      "Date of 6th Vesting",
      "Options - 6th Vesting",
      "Date of 7th Vesting",
      "Options - 7th Vesting",
      "Date of 8th Vesting",
      "Options - 8th Vesting",
      "Date of 9thVesting",
      "Options - 9th Vesting",
      "Date of 10th Vesting",
      "Options - 10th Vesting",
      "Date of 11th Vesting",
      "Options - 11th Vesting",
      "Date of 12th Vesting",
      "Options - 12th Vesting",
      "Date of 13th Vesting",
      "Options - 13th Vesting"
    ];

    const sampleRows = [
      [
        "TE-1259",
        "Sanju T",
        "sanju.ts@teachmint.com",
        "Human Resources & Security",
        "Associate Vice President - Human Resources & CISO",
        "2024-06-03",
        "GR-2025-01",
        "2025-04-01",
        "1000000",
        "13000",
        // Vesting milestones 1 to 13
        "25-07-01", "1000",
        "25-10-01", "1000",
        "26-01-01", "1000",
        "26-04-01", "1000",
        "26-07-01", "1000",
        "26-10-01", "1000",
        "27-01-01", "1000",
        "27-04-01", "1000",
        "27-07-01", "1000",
        "27-10-01", "1000",
        "28-01-01", "1000",
        "28-04-01", "1000",
        "28-07-01", "1000"
      ],
      [
        "TE-1260",
        "Mihir Gupta",
        "mihir.gupta@teachmint.com",
        "Executive Office",
        "Co-Founder & CEO",
        "2020-04-01",
        "GR-2025-02",
        "2025-04-01",
        "5000000",
        "65000",
        // Vesting milestones 1 to 13
        "25-07-01", "5000",
        "25-10-01", "5000",
        "26-01-01", "5000",
        "26-04-01", "5000",
        "26-07-01", "5000",
        "26-10-01", "5000",
        "27-01-01", "5000",
        "27-04-01", "5000",
        "27-07-01", "5000",
        "27-10-01", "5000",
        "28-01-01", "5000",
        "28-04-01", "5000",
        "28-07-01", "5000"
      ]
    ];

    const csvContent = [
      headers.join(","),
      ...sampleRows.map(row => row.map(v => {
        const str = String(v);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "Teachmint_ESOP_Bulk_Import_Template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  const getFieldInsensitive = (row: any, keys: string[]): string => {
    const objKeys = Object.keys(row);
    for (const k of keys) {
      const normalizedK = k.toLowerCase().replace(/[^a-z0-9]/g, "");
      for (const ok of objKeys) {
        const normalizedOk = ok.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (normalizedK === normalizedOk) {
          return (row[ok] !== undefined && row[ok] !== null ? row[ok] : "").toString().trim();
        }
      }
    }
    return "";
  };

  const processImport = () => {
    try {
      setError(null);

      // Track local maps for duplicates inside the current file import list itself
      const seenGrantIds = new Set<string>();

      const importedEmployees: Employee[] = [];

      const getVal = (row: any, keys: string[], defaultVal: string = ""): string => {
        return getFieldInsensitive(row, keys) || defaultVal;
      };

      for (let idx = 0; idx < data.length; idx++) {
        const row = data[idx];
        if (!row) continue;
        
        const rawEmpId = getVal(row, ["Employee-ID", "Emp-ID", "id", "employeeId", "emp_id"]);
        const name = getVal(row, ["Employee Name", "Emp Name", "name", "employee_name"]) || "Unknown";
        const grantId = getVal(row, ["Grant ID", "grantId", "grant_id"]);

        // Skip completely empty lines
        if (!rawEmpId && !name && !grantId) {
          continue;
        }

        const empId = rawEmpId || `EMP${Math.floor(Math.random() * 9000) + 1000 + idx}`;
        const designation = getVal(row, ["Designation", "designation"]) || "N/A";
        
        let email = getVal(row, ["Employee Email", "Email", "official_email", "mail"]);
        if (!email) {
          const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, "");
          email = `${safeName || "user"}${empId.toLowerCase()}@teachmint.com`;
        }
        
        const department = getVal(row, ["Department", "department"]) || "Operations";
        const joinDate = getVal(row, ["Joining Date", "joining_date", "joinDate", "join_date", "Grant Date", "grant_date"]) || new Date().toISOString().split('T')[0];
        
        // 1. Grant ID Unique checks
        if (grantId) {
          const lowerGrantId = grantId.toLowerCase();
          if (seenGrantIds.has(lowerGrantId)) {
            setError(`Import Aborted: Duplicate Grant ID "${grantId}" detected multiple times in the upload sheet.`);
            return;
          }
          
          // Check against other active employees in database
          for (const emp of existingEmployees) {
            if (emp.id.toLowerCase().trim() !== empId.toLowerCase().trim()) {
              if (emp.grants && emp.grants.some(g => g.id.toLowerCase().trim() === lowerGrantId)) {
                setError(`Import Aborted: Grant ID "${grantId}" is already assigned to another stakeholder "${emp.name}" (ID: ${emp.id}) in the database. Grant IDs must be completely unique.`);
                return;
              }
            }
          }
          seenGrantIds.add(lowerGrantId);
        }

        // 2. Extract custom vesting milestones if present (1st to 13th Vesting)
        const customVestingEvents: { date: string; shares: number }[] = [];
        const vestingSuffixes = [
          "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th", "13th"
        ];

        vestingSuffixes.forEach((suffix) => {
          const dateKey = `Date of ${suffix} Vesting`;
          const optionsKey = `Options - ${suffix} Vesting`;
          
          // Flexible key variations lookup
          let vDate = getVal(row, [dateKey, `Date of ${suffix}Vesting`, `Date ${suffix} Vesting`]);
          let vOptionsStr = getVal(row, [optionsKey, `Options ${suffix} Vesting`, `Options-${suffix} Vesting`]);

          if (vDate && vOptionsStr) {
            try {
              const parsedDate = new Date(vDate);
              if (!isNaN(parsedDate.getTime())) {
                vDate = parsedDate.toISOString().split('T')[0];
              }
            } catch (e) {}

            const vOptions = Number(vOptionsStr);
            if (!isNaN(vOptions) && vOptions > 0) {
              customVestingEvents.push({
                date: vDate,
                shares: vOptions
              });
            }
          }
        });

        const totalSharesVal = getVal(row, ["Total Options", "totalShares", "total_shares", "shares", "total_options"]);
        const totalShares = totalSharesVal ? Number(totalSharesVal) : 0;
        const valueOfOptions = Number(getVal(row, ["Value of Options Granted", "value_options", "valueOfOptions"]) || 0);

        // Default strike price is 1 unless mapped or computed
        const strikePrice = Number(getVal(row, ["strike_price", "strikePrice", "price"]) || 1);

        const vestingScheduleName = customVestingEvents.length > 0
          ? `Custom Milestones (${customVestingEvents.length} Vestings)`
          : "Quarterly Vesting (Automated)";

        // Check if employee is already being imported in this current session
        const targetEmpIdx = importedEmployees.findIndex(emp => emp.id.toLowerCase().trim() === empId.toLowerCase().trim());
        
        if (targetEmpIdx >= 0) {
          // Employee already in import array - merge additional grants
          const existingImported = importedEmployees[targetEmpIdx];
          
          if (name !== "Unknown") {
            existingImported.name = name;
          }
          if (email) {
            existingImported.email = email;
          }
          if (designation !== "N/A") {
            existingImported.designation = designation;
          }
          if (department) {
            existingImported.department = department;
          }
          if (joinDate) {
            existingImported.joinDate = joinDate;
          }

          if (grantId) {
            if (!existingImported.grants) {
              existingImported.grants = [];
            }
            const existingGrantIdx = existingImported.grants.findIndex(g => g.id.toLowerCase().trim() === grantId.toLowerCase().trim());
            const newGrant: Grant = {
              id: grantId,
              grantDate: getVal(row, ["Grant Date", "grantDate", "grant_date"]) || new Date().toISOString().split('T')[0],
              totalShares: totalShares,
              vestedShares: existingGrantIdx >= 0 ? existingImported.grants[existingGrantIdx].vestedShares : 0,
              exercisedShares: existingGrantIdx >= 0 ? existingImported.grants[existingGrantIdx].exercisedShares : 0,
              strikePrice: strikePrice,
              currentFMV: 210,
              vestingSchedule: vestingScheduleName,
              status: existingGrantIdx >= 0 ? existingImported.grants[existingGrantIdx].status : "Active",
              workflowStatus: existingGrantIdx >= 0 ? existingImported.grants[existingGrantIdx].workflowStatus : "Draft",
              customVestingEvents: customVestingEvents.length > 0 ? customVestingEvents : (existingGrantIdx >= 0 ? existingImported.grants[existingGrantIdx].customVestingEvents : undefined)
            };

            if (existingGrantIdx >= 0) {
              existingImported.grants[existingGrantIdx] = newGrant;
            } else {
              existingImported.grants.push(newGrant);
            }
          }

          if (valueOfOptions > 0) {
            const valStr = valueOfOptions.toString();
            if (!existingImported.customFields) {
              existingImported.customFields = [];
            }
            const valFieldIdx = existingImported.customFields.findIndex(f => f.key === "Value of Options Granted");
            if (valFieldIdx >= 0) {
              existingImported.customFields[valFieldIdx] = { ...existingImported.customFields[valFieldIdx], value: valStr };
            } else {
              existingImported.customFields.push({ key: "Value of Options Granted", value: valStr });
            }
          }
        } else {
          // Check if employee already exists in the database
          const existingEmp = existingEmployees.find(emp => emp.id.toLowerCase().trim() === empId.toLowerCase().trim());
          if (existingEmp) {
            // Clone existing employee to preserve everything
            const updatedEmp: Employee = {
              ...existingEmp,
              name: name !== "Unknown" ? name : existingEmp.name,
              email: email || existingEmp.email,
              designation: designation !== "N/A" ? designation : existingEmp.designation,
              department: department || existingEmp.department,
              joinDate: joinDate || existingEmp.joinDate,
              grants: existingEmp.grants ? [...existingEmp.grants] : [],
              customFields: existingEmp.customFields ? [...existingEmp.customFields] : []
            };

            if (grantId) {
              const existingGrantIdx = updatedEmp.grants.findIndex(g => g.id.toLowerCase().trim() === grantId.toLowerCase().trim());
              const newGrant: Grant = {
                id: grantId,
                grantDate: getVal(row, ["Grant Date", "grantDate", "grant_date"]) || new Date().toISOString().split('T')[0],
                totalShares: totalShares,
                vestedShares: existingGrantIdx >= 0 ? updatedEmp.grants[existingGrantIdx].vestedShares : 0,
                exercisedShares: existingGrantIdx >= 0 ? updatedEmp.grants[existingGrantIdx].exercisedShares : 0,
                strikePrice: strikePrice,
                currentFMV: 210,
                vestingSchedule: vestingScheduleName,
                status: existingGrantIdx >= 0 ? updatedEmp.grants[existingGrantIdx].status : "Active",
                workflowStatus: existingGrantIdx >= 0 ? updatedEmp.grants[existingGrantIdx].workflowStatus : "Draft",
                customVestingEvents: customVestingEvents.length > 0 ? customVestingEvents : (existingGrantIdx >= 0 ? updatedEmp.grants[existingGrantIdx].customVestingEvents : undefined)
              };

              if (existingGrantIdx >= 0) {
                updatedEmp.grants[existingGrantIdx] = newGrant;
              } else {
                updatedEmp.grants.push(newGrant);
              }
            }

            if (valueOfOptions > 0) {
              const valStr = valueOfOptions.toString();
              const valFieldIdx = updatedEmp.customFields.findIndex(f => f.key === "Value of Options Granted");
              if (valFieldIdx >= 0) {
                updatedEmp.customFields[valFieldIdx] = { ...updatedEmp.customFields[valFieldIdx], value: valStr };
              } else {
                updatedEmp.customFields.push({ key: "Value of Options Granted", value: valStr });
              }
            }

            importedEmployees.push(updatedEmp);
          } else {
            // Completely new employee logic
            const grants: Grant[] = grantId ? [{
              id: grantId,
              grantDate: getVal(row, ["Grant Date", "grantDate", "grant_date"]) || new Date().toISOString().split('T')[0],
              totalShares: totalShares,
              vestedShares: 0,
              exercisedShares: 0,
              strikePrice: strikePrice,
              currentFMV: 210,
              vestingSchedule: vestingScheduleName,
              status: "Active",
              workflowStatus: "Draft",
              customVestingEvents: customVestingEvents.length > 0 ? customVestingEvents : undefined
            }] : [];

            importedEmployees.push({
              id: empId,
              name,
              email,
              mobile: getVal(row, ["mobile", "phone"]) || "",
              department: department,
              designation: designation,
              joinDate: joinDate,
              grantDate: getVal(row, ["Grant Date", "grantDate", "grant_date"]) || new Date().toISOString().split('T')[0],
              grants: grants,
              transactions: [],
              cliffType: "Annually",
              customFields: valueOfOptions > 0 ? [{ key: "Value of Options Granted", value: valueOfOptions.toString() }] : [],
              documents: [],
              password: "login123",
              grantLetterNumber: ""
            });
          }
        }
      }

      onSuccess(importedEmployees);
      onClose();
    } catch (e: any) {
      setError("Import Failed: " + (e.message || "An unexpected error occurred during processing. Please verify file format."));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center"><Upload size={20} /></div>
             <div><h3 className="text-xl font-bold text-text-main">Bulk Upload Data</h3><p className="text-xs text-text-muted font-medium">Import employees or grants via CSV/JSON</p></div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-text-muted"><X size={20} /></button>
        </div>
        <div className="p-10 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-start gap-3 text-red-700 dark:text-red-400 text-xs font-semibold animate-pulse">
              <AlertCircle className="shrink-0 text-red-500 mt-0.5" size={16} />
              <div className="flex-1">
                <span className="font-extrabold block mb-1 text-sm">Upload & Import Error</span>
                <p className="leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {step === 'upload' ? (
            <div className="space-y-8">
              <div className="bg-blue-50 dark:bg-slate-950 p-6 rounded-2xl border border-blue-100 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-bold text-brand-primary mb-1 uppercase tracking-wider flex items-center gap-2">
                      <AlertCircle size={16} />
                      Enterprise CSV Upload Format
                    </h4>
                    <p className="text-xs text-text-muted font-medium">For successful import, make sure your CSV contains the exact headers from our offical template:</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadSampleCSV}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-primary/25 hover:bg-brand-primary/95 hover:scale-[1.02] active:scale-95 transition-all self-start sm:self-center shrink-0 cursor-pointer"
                  >
                    <Download size={14} />
                    Download Sample CSV Template
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[200px] overflow-y-auto p-4 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-blue-100/50 dark:border-slate-800">
                  <div className="space-y-1.5 text-xs">
                    <div className="font-bold text-text-main uppercase tracking-wider text-[10px] text-brand-primary flex items-center gap-1">🏢 Shareholder & Grant Info (10 columns)</div>
                    <ul className="list-disc list-inside space-y-1 text-text-muted text-[11px] font-mono">
                      <li>Employee-ID</li>
                      <li>Employee Name</li>
                      <li>Employee Email</li>
                      <li>Department</li>
                      <li>Designation</li>
                      <li>Joining Date</li>
                      <li>Grant ID <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">(Unique Key)</span></li>
                      <li>Grant Date</li>
                      <li>Value of Options Granted</li>
                      <li>Total Options</li>
                    </ul>
                  </div>
                  <div className="space-y-1.5 text-xs border-l border-slate-200 pl-4">
                    <div className="font-bold text-text-main uppercase tracking-wider text-[10px] text-emerald-600 flex items-center gap-1">📅 13-Vesting Milestone Blocks (26 columns)</div>
                    <ul className="list-disc list-inside space-y-1 text-text-muted text-[11px] font-mono leading-relaxed max-h-[140px] overflow-y-auto">
                      <li>Date of 1st Vesting / Options - 1st Vesting</li>
                      <li>Date of 2nd Vesting / Options - 2nd Vesting</li>
                      <li>Date of 3rd Vesting / Options - 3rd Vesting</li>
                      <li>Date of 4th Vesting / Options - 4th Vesting</li>
                      <li>Date of 5th Vesting / Options - 5th Vesting</li>
                      <li>Date of 6th Vesting / Options - 6th Vesting</li>
                      <li>Date of 7th Vesting / Options - 7th Vesting</li>
                      <li>Date of 8th Vesting / Options - 8th Vesting</li>
                      <li>Date of 9thVesting / Options - 9th Vesting</li>
                      <li>Date of 10th Vesting / Options - 10th Vesting</li>
                      <li>Date of 11th Vesting / Options - 11th Vesting</li>
                      <li>Date of 12th Vesting / Options - 12th Vesting</li>
                      <li>Date of 13th Vesting / Options - 13th Vesting</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 bg-slate-50/50 dark:bg-slate-950/20 hover:bg-brand-secondary/30 transition-all group relative">
                <input type="file" accept=".csv,.json" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} />
                <div className="flex flex-col items-center gap-4"><div className="w-20 h-20 rounded-full bg-white dark:bg-slate-800 shadow-xl flex items-center justify-center text-slate-300 dark:text-slate-600 group-hover:text-brand-primary transition-colors">{parsing ? <Loader2 className="animate-spin" size={40} /> : <Upload size={40} />}</div><div><p className="text-lg font-bold text-text-main">Click or drag file to upload</p><p className="text-sm text-text-muted">Supports .csv and .json formats</p></div></div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between"><p className="text-sm font-bold text-text-main">Previewing <span className="text-brand-primary">{data.length}</span> records detected in the import sheet</p><button onClick={() => setStep('upload')} className="text-xs font-bold text-text-muted hover:text-brand-primary underline transition-colors">Change File</button></div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-auto max-h-[400px] max-w-full shadow-inner bg-slate-50/30">
                <table className="min-w-max w-full text-left text-xs table-auto">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 z-10">
                    <tr>
                      {Object.keys(data[0] || {}).map(k => (
                        <th key={k} className="px-5 py-3.5 font-bold text-text-main/80 uppercase tracking-wider text-[10px] bg-slate-100 dark:bg-slate-950 border-r border-slate-200/50 dark:border-slate-800/50 min-w-[120px] whitespace-nowrap">
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {data.slice(0, 10).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                        {Object.keys(data[0] || {}).map((key, j) => (
                          <td key={j} className="px-5 py-3 text-text-muted truncate max-w-[200px] border-r border-slate-100 dark:border-slate-800/20 font-mono text-[11px] whitespace-nowrap" title={String(row[key] ?? "")}>
                            {String(row[key] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {data.length > 10 && (
                      <tr className="bg-slate-50/30 dark:bg-slate-950/10">
                        <td colSpan={Object.keys(data[0] || {}).length} className="px-5 py-4 text-center text-text-muted font-bold italic tracking-wide">
                          + {data.length - 10} more rows pending import...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <div className="p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-text-muted hover:bg-slate-200 dark:hover:bg-slate-800 transition-all">Cancel</button>
          <button disabled={step === 'upload' || parsing} onClick={processImport} className="px-8 py-2.5 bg-brand-primary text-white rounded-xl font-bold shadow-lg shadow-brand-primary/20 hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 transition-all">Import {data.length} Records</button>
        </div>
      </motion.div>
    </div>
  );
}
