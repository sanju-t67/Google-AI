import express from "express";
import path from "path";
import fs from "fs";
import { MOCK_ADMINS, MOCK_EMPLOYEES } from "./src/constants";
import { Employee, Admin, AuditLog } from "./src/types";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const DB_FILE = path.join(process.cwd(), "db_storage.json");

  interface SentEmail {
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
    settings: {
      currentFMV: number;
      totalPool: number;
      lastUpdated: string;
    };
    employees: Employee[];
    admins: Admin[];
    sentEmails: SentEmail[];
    auditLogs: AuditLog[];
  }

  // Ensure the db_storage.json file is initialized
  function getDb(): DatabaseSchema {
    if (!fs.existsSync(DB_FILE)) {
      const initialDb: DatabaseSchema = {
        settings: {
          currentFMV: 210,
          totalPool: 10000000,
          lastUpdated: new Date().toISOString()
        },
        employees: JSON.parse(JSON.stringify(MOCK_EMPLOYEES)),
        admins: [
          ...JSON.parse(JSON.stringify(MOCK_ADMINS)),
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
        ],
        sentEmails: [],
        auditLogs: [
          {
            id: "LOG-000001",
            timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
            adminEmail: "sanju@sanju-t.com",
            action: "System Initialisation",
            details: "TeachVest Platform Cap-Table initialized with 10,000,000 Pool Shares and current Fair Market Value (FMV) of INR 210.00."
          },
          {
            id: "LOG-000002",
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            adminEmail: "sanju@sanju-t.com",
            action: "Employee Seed",
            details: "Imported core team members: Aanya Sharma, Vikram Malhotra, Rohan Gupta & Sneha Iyer."
          }
        ]
      };
      saveDb(initialDb);
      return initialDb;
    }
    try {
      const raw = fs.readFileSync(DB_FILE, "utf-8");
      const db = JSON.parse(raw);
      if (!db.sentEmails) {
        db.sentEmails = [];
      }
      if (!db.auditLogs) {
        db.auditLogs = [];
      }
      return db;
    } catch (err) {
      console.error("Error reading database file, re-initializing:", err);
      const initialDb: DatabaseSchema = {
        settings: {
          currentFMV: 210,
          totalPool: 10000000,
          lastUpdated: new Date().toISOString()
        },
        employees: JSON.parse(JSON.stringify(MOCK_EMPLOYEES)),
        admins: [
          ...JSON.parse(JSON.stringify(MOCK_ADMINS)),
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
        ],
        sentEmails: [],
        auditLogs: []
      };
      saveDb(initialDb);
      return initialDb;
    }
  }

  function saveDb(db: DatabaseSchema) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  }

  function recordLog(db_data: DatabaseSchema, req: express.Request, action: string, details: string) {
    if (!db_data.auditLogs) {
      db_data.auditLogs = [];
    }
    const adminEmail = (req.headers["x-admin-email"] as string) || "sanju@sanju-t.com";
    db_data.auditLogs.unshift({
      id: `LOG-${Math.floor(Math.random() * 900000) + 100000}`,
      timestamp: new Date().toISOString(),
      adminEmail,
      action,
      details
    });
  }

  // API Routes
  app.get("/api/settings", (req, res) => {
    try {
      const db_data = getDb();
      res.json(db_data.settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/settings", (req, res) => {
    try {
      const db_data = getDb();
      const oldSettings = { ...db_data.settings };
      db_data.settings = {
        ...db_data.settings,
        ...req.body,
        lastUpdated: new Date().toISOString()
      };
      // Also sync currentFMV into all active employee grants as currentFMV
      if (req.body.currentFMV !== undefined) {
        const newFMV = parseFloat(req.body.currentFMV);
        db_data.employees.forEach(emp => {
          if (emp.grants) {
            emp.grants.forEach(g => {
              g.currentFMV = newFMV;
            });
          }
        });
      }
      
      const changes: string[] = [];
      if (req.body.currentFMV !== undefined && req.body.currentFMV !== oldSettings.currentFMV) {
        changes.push(`FMV changed from INR ${oldSettings.currentFMV} to INR ${req.body.currentFMV}`);
      }
      if (req.body.totalPool !== undefined && req.body.totalPool !== oldSettings.totalPool) {
        changes.push(`Total Pool changed from ${oldSettings.totalPool.toLocaleString()} to ${req.body.totalPool.toLocaleString()}`);
      }
      const detailsMsg = changes.length > 0 ? `Updated Company Settings: ${changes.join(", ")}` : "Updated Company Settings";
      
      recordLog(db_data, req, "Update Settings", detailsMsg);
      saveDb(db_data);
      res.json(db_data.settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/employees", (req, res) => {
    try {
      const db_data = getDb();
      res.json(db_data.employees);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/employees/by-email", (req, res) => {
    try {
      const email = (req.query.email as string || '').toLowerCase();
      const db_data = getDb();
      // Find by email or mobile
      const employee = db_data.employees.find(
        emp => emp.email.toLowerCase() === email || emp.mobile === email
      );
      if (employee) {
        res.json(employee);
      } else {
        res.status(404).json({ error: "Employee not found" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/employees/:id", (req, res) => {
    try {
      const db_data = getDb();
      const employee = db_data.employees.find(emp => emp.id === req.params.id);
      if (employee) {
        res.json(employee);
      } else {
        res.status(404).json({ error: "Employee not found" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/employees", (req, res) => {
    try {
      const db_data = getDb();
      const newEmp = req.body as Employee;
      const index = db_data.employees.findIndex(emp => emp.id === newEmp.id);
      if (index !== -1) {
        db_data.employees[index] = { ...db_data.employees[index], ...newEmp };
        recordLog(db_data, req, "Update Employee", `Updated core profile info for employee ${newEmp.name} (${newEmp.email})`);
      } else {
        db_data.employees.push(newEmp);
        // Create an invitation email!
        const emailId = `MSG-${Math.floor(Math.random() * 900000) + 100000}`;
        const inviteEmail: SentEmail = {
          id: emailId,
          recipient: newEmp.email,
          name: newEmp.name,
          subject: "TeachVest Invitation: Access Your Employee ESOP Dashboard",
          body: `
            <div style="font-family: sans-serif; padding: 24px; color: #1e293b; background: #f8fafc; border-radius: 12px; max-width: 600px; border: 1px solid #e2e8f0;">
              <h2 style="color: #0052ff; margin-bottom: 8px; font-weight: 800; letter-spacing: -0.02em;">Welcome to TeachVest, ${newEmp.name}!</h2>
              <p style="font-size: 14px; line-height: 1.5; color: #475569;">An official employee profile has been created for you on the TeachVest platform by your company administrator.</p>
              
              <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                <p style="margin: 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.1em;">Your Login Credentials</p>
                <div style="height: 1px; background: #f1f5f9; margin: 8px 0;"></div>
                <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Login Username:</strong> ${newEmp.email}</p>
                <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Temporary Password:</strong> ${newEmp.password || 'login123'}</p>
                <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Employee Designation:</strong> ${newEmp.designation} (${newEmp.department})</p>
                ${newEmp.grantLetterNumber ? `<p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Grant Letter Ref:</strong> ${newEmp.grantLetterNumber}</p>` : ''}
              </div>

              <p style="font-size: 14px; line-height: 1.5; color: #475569;">To securely inspect, monitor and exercise your vesting ESOP shares, please log in to your employee dashboard using the button below:</p>
              
              <div style="text-align: center; margin: 25px 0;">
                <a href="/?role=employee&email=${encodeURIComponent(newEmp.email)}" style="display: inline-block; background: #0052ff; color: white; padding: 14px 28px; border-radius: 12px; font-weight: bold; text-decoration: none; font-size: 14px; box-shadow: 0 10px 15px -3px rgba(0, 82, 255, 0.2);">Enter TeachVest Portal</a>
              </div>

              <p style="font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 20px; line-height: 1.4;">
                Security Policy: This is an automated security mail dispatch. If you did not expect these credentials or have security questions, please contact your TeachVest Cap-Table HR administrator immediately.
              </p>
            </div>
          `.trim().replace(/\n\s+/g, '\n'),
          sentAt: new Date().toISOString(),
          role: "employee",
          password: newEmp.password || "login123"
        };
        db_data.sentEmails.push(inviteEmail);
        recordLog(db_data, req, "Create Employee", `Created employee profile for ${newEmp.name} (${newEmp.email}) representing ${newEmp.grants?.[0]?.totalShares?.toLocaleString() || 0} initial options.`);
      }
      saveDb(db_data);
      res.json(newEmp);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/employees/:id", (req, res) => {
    try {
      const db_data = getDb();
      const index = db_data.employees.findIndex(emp => emp.id === req.params.id);
      if (index !== -1) {
        const original = db_data.employees[index];
        db_data.employees[index] = { ...db_data.employees[index], ...req.body };
        
        // Formulate a descriptive details string based on changes
        const changes: string[] = [];
        if (req.body.name && req.body.name !== original.name) changes.push(`Name changed to "${req.body.name}"`);
        if (req.body.department && req.body.department !== original.department) changes.push(`Department changed to "${req.body.department}"`);
        if (req.body.designation && req.body.designation !== original.designation) changes.push(`Designation changed to "${req.body.designation}"`);
        if (req.body.grants && JSON.stringify(req.body.grants) !== JSON.stringify(original.grants)) {
          changes.push(`Grants or Vesting edited`);
        }
        if (req.body.documents && req.body.documents.length !== (original.documents || []).length) {
          const originalDocs = original.documents || [];
          if (req.body.documents.length > originalDocs.length) {
            changes.push(`Uploaded legal document "${req.body.documents[req.body.documents.length - 1].name}"`);
          } else {
            changes.push(`Removed document`);
          }
        }
        const detailsMsg = changes.length > 0 ? `Modified profile for ${original.name}: ${changes.join(", ")}` : `Updated fields for ${original.name}`;
        
        recordLog(db_data, req, "Edit Employee", detailsMsg);
        saveDb(db_data);
        res.json(db_data.employees[index]);
      } else {
        res.status(404).json({ error: "Employee not found" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/employees/:id", (req, res) => {
    try {
      const db_data = getDb();
      const target = db_data.employees.find(emp => emp.id === req.params.id);
      db_data.employees = db_data.employees.filter(emp => emp.id !== req.params.id);
      if (target) {
        recordLog(db_data, req, "Delete Employee", `Removed employee profile and cap-table entry for ${target.name} (${target.email})`);
      }
      saveDb(db_data);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admins", (req, res) => {
    try {
      const db_data = getDb();
      res.json(db_data.admins);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admins/by-email", (req, res) => {
    try {
      const email = (req.query.email as string || '').toLowerCase();
      const db_data = getDb();
      const admin = db_data.admins.find(adm => adm.email.toLowerCase() === email);
      if (admin) {
        res.json(admin);
      } else {
        res.status(404).json({ error: "Admin not found" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/emails", (req, res) => {
    try {
      const db_data = getDb();
      res.json(db_data.sentEmails || []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admins", (req, res) => {
    try {
      const db_data = getDb();
      const newAdmin = req.body as Admin;
      const index = db_data.admins.findIndex(adm => adm.email.toLowerCase() === newAdmin.email.toLowerCase());
      if (index !== -1) {
        db_data.admins[index] = { ...db_data.admins[index], ...newAdmin };
        recordLog(db_data, req, "Update Administrator", `Updated permission layout or info for administrator ${newAdmin.name} (${newAdmin.email})`);
      } else {
        db_data.admins.push(newAdmin);
        // Create an invitation email!
        const emailId = `MSG-${Math.floor(Math.random() * 900000) + 100000}`;
        const inviteEmail: SentEmail = {
          id: emailId,
          recipient: newAdmin.email,
          name: newAdmin.name,
          subject: "TeachVest Invitation: Administrator Access Granted",
          body: `
            <div style="font-family: sans-serif; padding: 24px; color: #1e293b; background: #f8fafc; border-radius: 12px; max-width: 600px; border: 1px solid #e2e8f0;">
              <h2 style="color: #0052ff; margin-bottom: 8px; font-weight: 800; letter-spacing: -0.02em;">TeachVest Administrator Access Activated</h2>
              <p style="font-size: 14px; line-height: 1.5; color: #475569;">You have been granted official Administrator privileges on the TeachVest Capital Cap-Table and ESOP Management System.</p>
              
              <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                <p style="margin: 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.1em;">Your Administrator Credentials</p>
                <div style="height: 1px; background: #f1f5f9; margin: 8px 0;"></div>
                <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Login Username:</strong> ${newAdmin.email}</p>
                <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Temporary Password:</strong> ${newAdmin.password || 'admin123'}</p>
                <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Assigned Access Role:</strong> Platform Administrator / Board Observer</p>
              </div>

              <p style="font-size: 14px; line-height: 1.5; color: #475569;">Use corporate administrator portal access to define stock metrics, edit employee grants, attach critical legal documents and supervise active vestings.</p>
              
              <div style="text-align: center; margin: 25px 0;">
                <a href="/?role=admin&email=${encodeURIComponent(newAdmin.email)}" style="display: inline-block; background: #0052ff; color: white; padding: 14px 28px; border-radius: 12px; font-weight: bold; text-decoration: none; font-size: 14px; box-shadow: 0 10px 15px -3px rgba(0, 82, 255, 0.2);">Enter Admin Dashboard</a>
              </div>

              <p style="font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 20px; line-height: 1.4;">
                Security Alert: Keep these credentials stored securely. Do not share your login details with any unverified accounts. All access sessions are logged for audit compliance.
              </p>
            </div>
          `.trim().replace(/\n\s+/g, '\n'),
          sentAt: new Date().toISOString(),
          role: "admin",
          password: newAdmin.password || "admin123"
        };
        db_data.sentEmails.push(inviteEmail);
        recordLog(db_data, req, "Create Administrator", `Provisioned system administrator privileges for ${newAdmin.name} (${newAdmin.email})`);
      }
      saveDb(db_data);
      res.json(newAdmin);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admins/:email", (req, res) => {
    try {
      const db_data = getDb();
      const email = req.params.email.toLowerCase();
      const target = db_data.admins.find(adm => adm.email.toLowerCase() === email);
      db_data.admins = db_data.admins.filter(adm => adm.email.toLowerCase() !== email);
      if (target) {
        recordLog(db_data, req, "Delete Administrator", `Revoked system administrator credentials for ${target.name} (${target.email})`);
      }
      saveDb(db_data);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/audit-logs", (req, res) => {
    try {
      const db_data = getDb();
      res.json(db_data.auditLogs || []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/audit-logs", (req, res) => {
    try {
      const db_data = getDb();
      const { action, details } = req.body;
      recordLog(db_data, req, action, details || "");
      saveDb(db_data);
      res.json({ success: true, logs: db_data.auditLogs });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
