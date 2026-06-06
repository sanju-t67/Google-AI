/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Employee, Admin, AuditLog } from '../types';
import { MOCK_ADMINS, MOCK_EMPLOYEES } from '../constants';

export interface CompanySettings {
  currentFMV: number;
  totalPool: number;
  lastUpdated: string;
  roundingMode?: "2-decimal" | "4-decimal" | "nearest_integer" | "none";
  signatoryName?: string;
  signatoryEmail?: string;
  signatoryDesignation?: string;
  grantLetterSubject?: string;
  grantLetterBodyHeader?: string;
  grantLetterBodyFooter?: string;
  grantLetterCompanyName?: string;
  grantLetterCompanyAddress?: string;
  grantLetterCompanyCIN?: string;
  defaultEsopPolicyFileName?: string;
  defaultEsopPolicyFileUrl?: string;
  googleDocUrl?: string;
  senderEmailId?: string;
  backupDriveFolderId?: string;
  backupDriveFolderName?: string;
  lastBackupDate?: string;
  employeeInviteSubject?: string;
  employeeInviteBody?: string;
  adminInviteSubject?: string;
  adminInviteBody?: string;
  vestingAlertSubject?: string;
  vestingAlertBody?: string;
  eSignReminderSubject?: string;
  eSignReminderBody?: string;
}

export interface SentEmail {
  id: string;
  recipient: string;
  name: string;
  subject: string;
  body: string;
  sentAt: string;
  role: "employee" | "admin";
  password?: string;
  sender?: string;
}

interface DatabaseSchema {
  settings: CompanySettings;
  employees: Employee[];
  admins: Admin[];
  sentEmails: SentEmail[];
  auditLogs: AuditLog[];
}

const DEFAULT_SETTINGS: CompanySettings = {
  currentFMV: 210,
  totalPool: 10000000,
  lastUpdated: new Date().toISOString(),
  signatoryName: "Mihir Gupta",
  signatoryEmail: "mihir.gupta@teachmint.com",
  signatoryDesignation: "Co-Founder & CEO",
  grantLetterSubject: "Letter of Grant under Employees’ Stock Option Plan 2020 (“ESOP 2020”)",
  grantLetterBodyHeader: "LETTER OF GRANT\n\n\nDate: {{GRANT_DATE}}\n\n\nTo,\n{{STAKEHOLDER_NAME}}\nEmp ID - {{EMPLOYEE_ID}}\n\n\nDear {{STAKEHOLDER_NAME}},\n\n\nThe Committee of Teachmint ESOP 2020 has the pleasure in inviting you to participate in the Employees’ Stock Option Plan 2020(“ESOP 2020”) of {{COMPANY_NAME}}, a private limited company incorporated under the provisions of the Companies Act, 2013 and having its registered office at {{COMPANY_ADDRESS}}, having corporate identification number as {{COMPANY_CIN}}.\n\n\nBy virtue of the ESOP 2020, you are being offered the Options convertible into equity shares.\n\n\nThe details of number of Options granted, vesting date, exercise date, exercise price and manner of exercising the Options and other terms and conditions are given in Form I.\n\n\nThe offer shall lapse if not accepted on or before the closing date mentioned in Form I. If the offer is acceptable to you, kindly sign the Acceptance Form (enclosed as Form II) in token of your acceptance.\n\n\nYou are requested to study the same carefully and familiarize yourself with the scheme enclosed. Thanking you,\nYours faithfully,\n\n\nFor {{COMPANY_NAME}},\n  \n\nSignee: {{SIGNATORY_NAME}}\nDate: Wed May 28 13:26:58 IST 2025\n\n\n{{SIGNATORY_NAME}} Encl: As above\nForm I\n\n\nName in Full: {{STAKEHOLDER_NAME}}\n\t\n\n\tI. Grant Details\n\tTotal Options Granted\n\t{{SHARES_QUANTITY}}\n\tDate of Grant\n\t{{GRANT_DATE}}\n\tExercise Price per Share\n\t{{STRIKE_PRICE}}\n\tII. Vesting Details\n\tVesting\n\t{{SHARES_QUANTITY}} number of Options will vest as per the schedule below:\n\t\n\nPlease find below the vesting schedule corresponding to this grant:\n\n{{VESTING_SCHEDULE_TABLE}}",
  grantLetterBodyFooter: "Terms a nd conditions:\n\n\n1. Hereinafter, the employees to whom this Letter of Grant is issued shall be referred to as “Option Grantee”.\n\n\n2. The Options granted are personal to the Option Grantee and cannot be transferred in any manner whatsoever.\n\n\n3. Each Option will entitle the participant to one equity share of the Company and Options issued to the Option Grantee shall always be convertible into equity shares only.\n\n\n4. Unless otherwise expressly defined in this Letter of Grant, all capitalised terms shall have the same meaning assigned to it in the ESOP 2020.\n\n\n5. Option Grantee, who wishes to accept an offer made must deliver duly filled Acceptance Form (enclosed as Form II) at the registered office of the Company addressed to The ESOP Committee on or before 14 days from the Date of Grant. Further, Option Grantee shall mention his/her name and address precisely in the Acceptance Form.\n\n\n6. Option Grantee, who fails to return the Acceptance Form on or before the closing date is deemed to have rejected the offer and Acceptance Form received after the closing date shall not be valid unless the Board determines otherwise.\n\n\n7. Options granted shall vest as per the vesting details set forth above.\n\n\n8. The Option Grantee shall not have right to receive any dividend or to vote or in any manner or enjoy the benefits of a shareholder in respect of Options granted to him, till shares are issued on Exercise of the Option.\n\n\n9. For the purpose of Exercise, Option Grantee must deliver duly filled Exercise Form (enclosed as Form III) in writing along with exercise price of {{STRIKE_PRICE}} per Option by enclosing cheque in favour of {{COMPANY_NAME}} on or before aforementioned at the time of Exercise addressed to The ESOP Committee at the registered office of the Company or a demand draft drawn in favor of the Company or in such other manner as the Board may decide.\n\n\n10. The Committee shall verify and accordingly communicate to the Option Grantee about valid Exercise.\n\n\n11. The Option Grantee may nominate any Beneficiary to whom any benefit under the ESOP 2020 is to be delivered in case of Option Grantee’s death or Permanent Incapacitation, before he or she receives all of such benefit by delivering Nomination Form (enclosed as Form IV) to the Company at the registered office of the Company addressed to The ESOP Committee.\n\n\n12. For other terms and conditions relating to eligibility of employees, administration of the ESOP 2020, granting of Options, method of acceptance, vesting of Options, exercise price, exercise of Options (including exercise period), termination of employment, notices and correspondence, nomination, non-transferability of Options, corporate action, arbitration, regulatory approvals, miscellaneous provisions, modification of the ESOP 2020 and term of the ESOP 2020, the Option Grantee is requested to study and familiarize with the ESOP 2020 enclosed.\n\n\n13. Any Options granted hereunder is subject to the condition that the Option Grantee remains employed by the Company from the time of the grant through the end of the Vesting Period, unless as otherwise provided herein. However, neither such condition nor the grant of Options shall impose upon the Company any obligation to retain the Option Grantee in its employment for any given period or upon any specific terms of employment.\n\n\nForm II ACCEPTANCE FORM\n\n\n\n\nFrom: {{STAKEHOLDER_NAME}}\n\n\nTo,\nThe ESOP Committee,\nEmployees’ Stock Option Plan 2020, {{COMPANY_NAME}},\n{{COMPANY_ADDRESS}}.\n\n\nThis is with reference to the Letter of Grant dated {{GRANT_DATE}} issued under the Employees’ Stock Option Plan 2020 (“ESOP 2020”) of {{COMPANY_NAME}}.\n\n\nI have read the terms and conditions stipulated in the Letter of Grant and the ESOP 2020 and wish to subscribe to {{SHARES_QUANTITY}} Options granted to me.\n\n\nI undertake to be bound by the terms and conditions of the ESOP 2020 which I confirm to have understood fully.\n\n\nYours faithfully,\n  \n\nSignee: {{STAKEHOLDER_NAME}}\nDate: Fri May 30 11:18:16 IST 2025\n\n\n{{STAKEHOLDER_NAME}}",
  grantLetterCompanyName: "Teachmint Technologies Private Limited",
  grantLetterCompanyAddress: "5th Floor, North Wing, SJR The HUB, Survey No. 8/2 & 9, Sarjapur Road, Bengaluru, Karnataka - 560103",
  grantLetterCompanyCIN: "U62099KA2020PTC135305",
  defaultEsopPolicyFileName: "Teachmint_Global_ESOP_Policy_2025.pdf",
  defaultEsopPolicyFileUrl: "data:text/plain;base64,VEVBQ0hNSU5UIEdMT0JBTCBFU09QIFBPTElDWSAyMDI1CgpUaGlzIGlzIHRoZSBvZmZpY2lhbCBUZWFjaG1pbnQgR2xvYmFsIEVTT1AgUG9saWN5IGZvciAyMDI1LiBBbGwgZW1wbG95ZWVzIGFyZSBzdWJqZWN0IHRvIHRoZSBndWlkZWxpbmVzLCBjbGlmZiByZXMtc3RyYXRlZ2llcywgYW5kIGV4ZXJjaXNlIHBlcmlvZHMgZGVmaW5lZCBoZXJlaW4u",
  googleDocUrl: "https://docs.google.com/document/d/1Q396bGnmJ84f-duN7KHdoGlL4aTUkAemM1GDT71ucgA/edit?usp=sharing",
  senderEmailId: "hr@teachmint.com",
  backupDriveFolderId: "",
  backupDriveFolderName: "",
  lastBackupDate: ""
};

const DEFAULT_ADMINS: Admin[] = [
  ...MOCK_ADMINS
];

export function getLocalDb(): DatabaseSchema {
  const raw = localStorage.getItem("ts_local_db");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.settings && Array.isArray(parsed.employees) && Array.isArray(parsed.admins)) {
        // Automatically check if the cached local DB contains old-template employees (like Alice, Bob, etc.)
        const validEmails = new Set(MOCK_EMPLOYEES.map(e => e.email.toLowerCase()));
        const hasStale = parsed.employees.some((emp: any) => !validEmails.has(emp.email.toLowerCase())) ||
                          parsed.employees.length < MOCK_EMPLOYEES.length ||
                          parsed.admins.length < MOCK_ADMINS.length;

        if (hasStale) {
          console.log("Stale local storage database data detected. Resetting database caches...");
          localStorage.removeItem("ts_local_db");
        } else {
          if (!parsed.auditLogs) {
            parsed.auditLogs = [];
          }
          return parsed;
        }
      }
    } catch (e) {
      // ignore
    }
  }
  const db: DatabaseSchema = {
    settings: DEFAULT_SETTINGS,
    employees: JSON.parse(JSON.stringify(MOCK_EMPLOYEES)),
    admins: JSON.parse(JSON.stringify(DEFAULT_ADMINS)),
    sentEmails: [],
    auditLogs: []
  };
  saveLocalDb(db);
  return db;
}

export function saveLocalDb(db: DatabaseSchema) {
  localStorage.setItem("ts_local_db", JSON.stringify(db));
}

// Check if a response is a valid JSON response
async function checkResponseJson(res: Response): Promise<any> {
  if (!res.ok) {
    throw new Error(`HTTP error ${res.status}`);
  }
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("Response is not JSON");
  }
  return await res.json();
}

// Subscriptions implemented with clean, efficient polling and robust client-side storage fallbacks

export const subscribeToCompanySettings = (callback: (settings: CompanySettings) => void) => {
  let active = true;
  const poll = async () => {
    try {
      const res = await fetch('/api/settings');
      if (active) {
        const data = await checkResponseJson(res);
        callback(data as CompanySettings);
      }
    } catch (err) {
      if (active) {
        const db = getLocalDb();
        callback(db.settings);
      }
    }
  };
  poll();
  const interval = setInterval(poll, 3000);
  return () => {
    active = false;
    clearInterval(interval);
  };
};

export const updateCompanySettings = async (settings: Partial<CompanySettings>, adminEmail?: string) => {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminEmail) {
      headers['X-Admin-Email'] = adminEmail;
    }
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers,
      body: JSON.stringify(settings)
    });
    if (res.ok && (res.headers.get("content-type") || "").includes("application/json")) {
      return;
    }
  } catch (err) {
    // fall through
  }
  // Local Database Fallback
  const db = getLocalDb();
  db.settings = {
    ...db.settings,
    ...settings,
    lastUpdated: new Date().toISOString()
  };
  if (settings.currentFMV !== undefined) {
    const newFMV = Number(settings.currentFMV);
    db.employees.forEach(emp => {
      if (emp.grants) {
        emp.grants.forEach(g => {
          g.currentFMV = newFMV;
        });
      }
    });
  }
  saveLocalDb(db);
};

export const uploadChunkedPolicy = async (
  fileName: string,
  fileDataUrl: string,
  adminEmail?: string,
  onProgress?: (percent: number) => void
) => {
  const CHUNK_SIZE = 500000; // 500KB chunks
  const totalChunks = Math.ceil(fileDataUrl.length / CHUNK_SIZE);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, fileDataUrl.length);
    const chunkContent = fileDataUrl.substring(start, end);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminEmail) {
      headers['X-Admin-Email'] = adminEmail;
    }

    const res = await fetch('/api/settings/policy-chunk', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fileName,
        chunk: chunkContent,
        index: i,
        total: totalChunks
      })
    });

    if (!res.ok) {
      throw new Error(`Failed to upload policy chunk ${i + 1}/${totalChunks}. Server returned status ${res.status}`);
    }

    if (onProgress) {
      onProgress(Math.round(((i + 1) / totalChunks) * 100));
    }
  }

  // Also sync locally
  const db = getLocalDb();
  db.settings = {
    ...db.settings,
    defaultEsopPolicyFileName: fileName,
    defaultEsopPolicyFileUrl: "/api/settings/policy-download",
    lastUpdated: new Date().toISOString()
  };
  saveLocalDb(db);
};

export const subscribeToEmployees = (callback: (employees: Employee[]) => void) => {
  let active = true;
  const poll = async () => {
    try {
      const res = await fetch('/api/employees');
      if (active) {
        const data = await checkResponseJson(res);
        callback(data as Employee[]);
      }
    } catch (err) {
      if (active) {
        const db = getLocalDb();
        callback(db.employees);
      }
    }
  };
  poll();
  const interval = setInterval(poll, 3000);
  return () => {
    active = false;
    clearInterval(interval);
  };
};

export const subscribeToEmployee = (employeeId: string, callback: (employee: Employee | null) => void) => {
  let active = true;
  const poll = async () => {
    try {
      const res = await fetch(`/api/employees/${employeeId}`);
      if (active) {
        if (res.status === 404) {
          callback(null);
          return;
        }
        const data = await checkResponseJson(res);
        callback(data as Employee);
      }
    } catch (err) {
      if (active) {
        const db = getLocalDb();
        const employee = db.employees.find(emp => emp.id === employeeId) || null;
        callback(employee);
      }
    }
  };
  poll();
  const interval = setInterval(poll, 3000);
  return () => {
    active = false;
    clearInterval(interval);
  };
};

export const updateEmployeeData = async (employeeId: string, data: Partial<Employee>, adminEmail?: string) => {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminEmail) {
      headers['X-Admin-Email'] = adminEmail;
    }
    const res = await fetch(`/api/employees/${employeeId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    });
    if (res.ok && (res.headers.get("content-type") || "").includes("application/json")) {
      return;
    }
  } catch (err) {
    // fall through
  }
  // Local Database Fallback
  const db = getLocalDb();
  const idx = db.employees.findIndex(emp => emp.id === employeeId);
  if (idx !== -1) {
    db.employees[idx] = { ...db.employees[idx], ...data };
    saveLocalDb(db);
  }
};

export const deleteEmployee = async (employeeId: string, adminEmail?: string) => {
  try {
    const headers: Record<string, string> = {};
    if (adminEmail) {
      headers['X-Admin-Email'] = adminEmail;
    }
    const res = await fetch(`/api/employees/${employeeId}`, {
      method: 'DELETE',
      headers
    });
    if (res.ok) {
      return;
    }
  } catch (err) {
    // fall through
  }
  // Local Database Fallback
  const db = getLocalDb();
  db.employees = db.employees.filter(emp => emp.id !== employeeId);
  saveLocalDb(db);
};

export const createEmployee = async (employee: Employee, adminEmail?: string) => {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminEmail) {
      headers['X-Admin-Email'] = adminEmail;
    }
    const res = await fetch('/api/employees', {
      method: 'POST',
      headers,
      body: JSON.stringify(employee)
    });
    if (res.ok && (res.headers.get("content-type") || "").includes("application/json")) {
      return;
    }
  } catch (err) {
    // fall through
  }
  // Local Database Fallback
  const db = getLocalDb();
  const idx = db.employees.findIndex(emp => emp.id === employee.id);
  if (idx !== -1) {
    db.employees[idx] = { ...db.employees[idx], ...employee };
  } else {
    db.employees.push(employee);
    // Create an invitation email!
    const emailId = `MSG-${Math.floor(Math.random() * 900000) + 100000}`;
    const inviteEmail: SentEmail = {
      id: emailId,
      recipient: employee.email,
      name: employee.name,
      subject: "TeachVest Invitation: Access Your Employee ESOP Dashboard",
      body: `
        <div style="font-family: sans-serif; padding: 24px; color: #1e293b; background: #f8fafc; border-radius: 12px; max-width: 600px; border: 1px solid #e2e8f0;">
          <h2 style="color: #0a52f7; margin-bottom: 8px; font-weight: 800; letter-spacing: -0.02em;">Welcome to TeachVest, ${employee.name}!</h2>
          <p style="font-size: 14px; line-height: 1.5; color: #475569;">An official employee profile has been created for you on the TeachVest platform.</p>
          <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Login Username:</strong> ${employee.email}</p>
          <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Temporary Password:</strong> ${employee.password || 'login123'}</p>
        </div>
      `.trim(),
      sentAt: new Date().toISOString(),
      role: "employee",
      password: employee.password || "login123"
    };
    db.sentEmails.push(inviteEmail);
  }
  saveLocalDb(db);
};

export const createAdmin = async (admin: Admin, adminId?: string, adminEmail?: string) => {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminEmail) {
      headers['X-Admin-Email'] = adminEmail;
    }
    const res = await fetch('/api/admins', {
      method: 'POST',
      headers,
      body: JSON.stringify(admin)
    });
    if (res.ok && (res.headers.get("content-type") || "").includes("application/json")) {
      return;
    }
  } catch (err) {
    // fall through
  }
  // Local Database Fallback
  const db = getLocalDb();
  const idx = db.admins.findIndex(adm => adm.email.toLowerCase() === admin.email.toLowerCase());
  if (idx !== -1) {
    db.admins[idx] = { ...db.admins[idx], ...admin };
  } else {
    db.admins.push(admin);
    const emailId = `MSG-${Math.floor(Math.random() * 900000) + 100000}`;
    const inviteEmail: SentEmail = {
      id: emailId,
      recipient: admin.email,
      name: admin.name,
      subject: "TeachVest Invitation: Administrator Access Granted",
      body: `
        <div style="font-family: sans-serif; padding: 24px; color: #1e293b; background: #f8fafc; border-radius: 12px; max-width: 600px; border: 1px solid #e2e8f0;">
          <h2 style="color: #0a52f7; margin-bottom: 8px; font-weight: 800; letter-spacing: -0.02em;">TeachVest Administrator Access Activated</h2>
          <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Login Username:</strong> ${admin.email}</p>
          <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Temporary Password:</strong> ${admin.password || 'admin123'}</p>
        </div>
      `.trim(),
      sentAt: new Date().toISOString(),
      role: "admin",
      password: admin.password || "admin123"
    };
    db.sentEmails.push(inviteEmail);
  }
  saveLocalDb(db);
};

export const deleteAdmin = async (email: string, adminEmail?: string) => {
  try {
    const headers: Record<string, string> = {};
    if (adminEmail) {
      headers['X-Admin-Email'] = adminEmail;
    }
    const res = await fetch(`/api/admins/${encodeURIComponent(email)}`, {
      method: 'DELETE',
      headers
    });
    if (res.ok) {
      return;
    }
  } catch (err) {
    // fall through
  }
  // Local Database Fallback
  const db = getLocalDb();
  db.admins = db.admins.filter(adm => adm.email.toLowerCase() !== email.toLowerCase());
  saveLocalDb(db);
};

export const getEmployeeByEmail = async (email: string): Promise<Employee | null> => {
  try {
    const res = await fetch(`/api/employees/by-email?email=${encodeURIComponent(email)}`);
    const data = await checkResponseJson(res);
    return data as Employee;
  } catch (error) {
    // Local Database Fallback
    const db = getLocalDb();
    const mail = email.toLowerCase();
    const found = db.employees.find(emp => emp.email.toLowerCase() === mail || emp.mobile === email);
    return found || null;
  }
};

export const getAdminByEmail = async (email: string): Promise<Admin | null> => {
  try {
    const res = await fetch(`/api/admins/by-email?email=${encodeURIComponent(email)}`);
    const data = await checkResponseJson(res);
    return data as Admin;
  } catch (error) {
    // Local Database Fallback
    const db = getLocalDb();
    const mail = email.toLowerCase();
    const found = db.admins.find(adm => adm.email.toLowerCase() === mail);
    return found || null;
  }
};

export const subscribeToAdmins = (callback: (admins: Admin[]) => void) => {
  let active = true;
  const poll = async () => {
    try {
      const res = await fetch('/api/admins');
      if (active) {
        const data = await checkResponseJson(res);
        callback(data as Admin[]);
      }
    } catch (err) {
      if (active) {
        const db = getLocalDb();
        callback(db.admins);
      }
    }
  };
  poll();
  const interval = setInterval(poll, 3000);
  return () => {
    active = false;
    clearInterval(interval);
  };
};

export const subscribeToEmails = (callback: (emails: SentEmail[]) => void) => {
  let active = true;
  const poll = async () => {
    try {
      const res = await fetch('/api/emails');
      if (active) {
        const data = await checkResponseJson(res);
        callback(data as SentEmail[]);
      }
    } catch (err) {
      if (active) {
        const db = getLocalDb();
        callback(db.sentEmails || []);
      }
    }
  };
  poll();
  const interval = setInterval(poll, 3000);
  return () => {
    active = false;
    clearInterval(interval);
  };
};

export const sendSystemEmail = async (email: Omit<SentEmail, 'id' | 'sentAt'>) => {
  const newEmail: SentEmail = {
    ...email,
    id: `MSG-${Math.floor(Math.random() * 900000) + 100000}`,
    sentAt: new Date().toISOString()
  };
  try {
    const res = await fetch('/api/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEmail)
    });
    if (res.ok) return;
  } catch (err) {}
  
  // Local Database Fallback
  const db = getLocalDb();
  if (!db.sentEmails) db.sentEmails = [];
  db.sentEmails.push(newEmail);
  saveLocalDb(db);
};

export const subscribeToAuditLogs = (callback: (logs: AuditLog[]) => void, adminEmail?: string) => {
  let active = true;
  const poll = async () => {
    try {
      const headers: Record<string, string> = {};
      if (adminEmail) {
        headers['X-Admin-Email'] = adminEmail;
      }
      const res = await fetch('/api/audit-logs', { headers });
      if (active) {
        const data = await checkResponseJson(res);
        callback(data as AuditLog[]);
      }
    } catch (err) {
      if (active) {
        const db = getLocalDb();
        callback(db.auditLogs || []);
      }
    }
  };
  poll();
  const interval = setInterval(poll, 3000);
  return () => {
    active = false;
    clearInterval(interval);
  };
};

export const createAuditLog = async (action: string, details: string, adminEmail?: string) => {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminEmail) {
      headers['X-Admin-Email'] = adminEmail;
    }
    const res = await fetch('/api/audit-logs', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action, details })
    });
    if (res.ok) {
      return;
    }
  } catch (err) {
    // fall through
  }
  
  // local fallback
  const db = getLocalDb();
  if (!db.auditLogs) {
    db.auditLogs = [];
  }
  db.auditLogs.unshift({
    id: `LOG-${Math.floor(Math.random() * 900000) + 100000}`,
    timestamp: new Date().toISOString(),
    adminEmail: adminEmail || 'ashutosh@teachmint.com',
    action,
    details
  });
  saveLocalDb(db);
};

export const initializeAndSeedDatabase = async () => {
  console.log('Database initialization and seeding fallback is ready!');
};
