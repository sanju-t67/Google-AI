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
  lastUpdated: new Date().toISOString()
};

const DEFAULT_ADMINS: Admin[] = [
  ...MOCK_ADMINS,
  {
    email: "sanju@sanju-t.com",
    password: "admin123",
    name: "Sanju",
    role: "admin"
  },
  {
    email: "sanju.ts@teachmint.com",
    password: "admin123",
    name: "Sanju",
    role: "admin"
  }
];

function getLocalDb(): DatabaseSchema {
  const raw = localStorage.getItem("ts_local_db");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.settings && Array.isArray(parsed.employees) && Array.isArray(parsed.admins)) {
        if (!parsed.auditLogs) {
          parsed.auditLogs = [];
        }
        return parsed;
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

function saveLocalDb(db: DatabaseSchema) {
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
          <h2 style="color: #0052ff; margin-bottom: 8px; font-weight: 800; letter-spacing: -0.02em;">Welcome to TeachVest, ${employee.name}!</h2>
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
          <h2 style="color: #0052ff; margin-bottom: 8px; font-weight: 800; letter-spacing: -0.02em;">TeachVest Administrator Access Activated</h2>
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
    adminEmail: adminEmail || 'sanju@sanju-t.com',
    action,
    details
  });
  saveLocalDb(db);
};

export const initializeAndSeedDatabase = async () => {
  console.log('Database initialization and seeding fallback is ready!');
};
