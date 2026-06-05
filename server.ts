import express from "express";
import path from "path";
import fs from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, getDocs, setDoc, deleteDoc, updateDoc, collection } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";
import { MOCK_ADMINS, MOCK_EMPLOYEES } from "./src/constants";
import { Employee, Admin, AuditLog } from "./src/types";
import { generateVestingSchedule } from "./src/lib/utils";

// Initialize Firebase SDK
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, (firebaseConfig as any).firestoreDatabaseId);

interface SentEmail {
  id: string;
  recipient: string;
  name: string;
  subject: string;
  body: string;
  sentAt: string;
  role: "employee" | "admin";
  password?: string;
  milestoneId?: string;
  sender?: string;
}

const DEFAULT_SETTINGS = {
  currentFMV: 210,
  totalPool: 10000000,
  roundingMode: "2-decimal" as const,
  signatoryName: "Mihir Gupta",
  signatoryEmail: "mihir.gupta@teachmint.com",
  signatoryDesignation: "Co-Founder & CEO",
  grantLetterSubject: "Letter of Grant under Employees’ Stock Option Plan 2020 (“ESOP 2020”)",
  grantLetterBodyHeader: "LETTER OF GRANT\n\n\nDate: {{GRANT_DATE}}\n\n\nTo,\n{{STAKEHOLDER_NAME}}\nEmp ID - {{EMPLOYEE_ID}}\n\n\nDear {{STAKEHOLDER_NAME}},\n\n\nThe Committee of Teachmint ESOP 2020 has the pleasure in inviting you to participate in the Employees’ Stock Option Plan 2020(“ESOP 2020”) of {{COMPANY_NAME}}, a private limited company incorporated under the provisions of the Companies Act, 2013 and having its registered office at {{COMPANY_ADDRESS}}, having corporate identification number as {{COMPANY_CIN}}.\n\n\nBy virtue of the ESOP 2020, you are being offered the Options convertible into equity shares.\n\n\nThe details of number of Options granted, vesting date, exercise date, exercise price and manner of exercising the Options and other terms and conditions are given in Form I.\n\n\nThe offer shall lapse if not accepted on or before the closing date mentioned in Form I. If the offer is acceptable to you, kindly sign the Acceptance Form (enclosed as Form II) in token of your acceptance.\n\n\nYou are requested to study the same carefully and familiarize yourself with the scheme enclosed. Thanking you,\nYours faithfully,\n\n\nFor {{COMPANY_NAME}},\n  \n\nCaptured via Leegality.com (01JV5DYQGH8MRXGTFWYAQM6BFW) {{SIGNATORY_NAME}}\nDate: Wed May 28 13:26:58 IST 2025\n\n\n{{SIGNATORY_NAME}} Encl: As above\nForm I\n\n\nName in Full: {{STAKEHOLDER_NAME}}\n\t\n\n\tI. Grant Details\n\tTotal Options Granted\n\t{{SHARES_QUANTITY}}\n\tDate of Grant\n\t{{GRANT_DATE}}\n\tExercise Price per Share\n\t{{STRIKE_PRICE}}\n\tII. Vesting Details\n\tVesting\n\t{{SHARES_QUANTITY}} number of Options will vest as per the schedule below:\n\t\n\nPlease find below the vesting schedule corresponding to this grant:\n\n{{VESTING_SCHEDULE_TABLE}}",
  grantLetterBodyFooter: "Terms a nd conditions:\n\n\n1. Hereinafter, the employees to whom this Letter of Grant is issued shall be referred to as “Option Grantee”.\n\n\n2. The Options granted are personal to the Option Grantee and cannot be transferred in any manner whatsoever.\n\n\n3. Each Option will entitle the participant to one equity share of the Company and Options issued to the Option Grantee shall always be convertible into equity shares only.\n\n\n4. Unless otherwise expressly defined in this Letter of Grant, all capitalised terms shall have the same meaning assigned to it in the ESOP 2020.\n\n\n5. Option Grantee, who wishes to accept an offer made must deliver duly filled Acceptance Form (enclosed as Form II) at the registered office of the Company addressed to The ESOP Committee on or before 14 days from the Date of Grant. Further, Option Grantee shall mention his/her name and address precisely in the Acceptance Form.\n\n\n6. Option Grantee, who fails to return the Acceptance Form on or before the closing date is deemed to have rejected the offer and Acceptance Form received after the closing date shall not be valid unless the Board determines otherwise.\n\n\n7. Options granted shall vest as per the vesting details set forth above.\n\n\n8. The Option Grantee shall not have right to receive any dividend or to vote or in any manner or enjoy the benefits of a shareholder in respect of Options granted to him, till shares are issued on Exercise of the Option.\n\n\n9. For the purpose of Exercise, Option Grantee must deliver duly filled Exercise Form (enclosed as Form III) in writing along with exercise price of {{STRIKE_PRICE}} per Option by enclosing cheque in favour of {{COMPANY_NAME}} on or before aforementioned at the time of Exercise addressed to The ESOP Committee at the registered office of the Company or a demand draft drawn in favor of the Company or in such other manner as the Board may decide.\n\n\n10. The Committee shall verify and accordingly communicate to the Option Grantee about valid Exercise.\n\n\n11. The Option Grantee may nominate any Beneficiary to whom any benefit under the ESOP 2020 is to be delivered in case of Option Grantee’s death or Permanent Incapacitation, before he or she receives all of such benefit by delivering Nomination Form (enclosed as Form IV) to the Company at the registered office of the Company addressed to The ESOP Committee.\n\n\n12. For other terms and conditions relating to eligibility of employees, administration of the ESOP 2020, granting of Options, method of acceptance, vesting of Options, exercise price, exercise of Options (including exercise period), termination of employment, notices and correspondence, nomination, non-transferability of Options, corporate action, arbitration, regulatory approvals, miscellaneous provisions, modification of the ESOP 2020 and term of the ESOP 2020, the Option Grantee is requested to study and familiarize with the ESOP 2020 enclosed.\n\n\n13. Any Options granted hereunder is subject to the condition that the Option Grantee remains employed by the Company from the time of the grant through the end of the Vesting Period, unless as otherwise provided herein. However, neither such condition nor the grant of Options shall impose upon the Company any obligation to retain the Option Grantee in its employment for any given period or upon any specific terms of employment.\n\n\nForm II ACCEPTANCE FORM\n\n\n\n\nFrom: {{STAKEHOLDER_NAME}}\n\n\nTo,\nThe ESOP Committee,\nEmployees’ Stock Option Plan 2020, {{COMPANY_NAME}},\n{{COMPANY_ADDRESS}}.\n\n\nThis is with reference to the Letter of Grant dated {{GRANT_DATE}} issued under the Employees’ Stock Option Plan 2020 (“ESOP 2020”) of {{COMPANY_NAME}}.\n\n\nI have read the terms and conditions stipulated in the Letter of Grant and the ESOP 2020 and wish to subscribe to {{SHARES_QUANTITY}} Options granted to me.\n\n\nI undertake to be bound by the terms and conditions of the ESOP 2020 which I confirm to have understood fully.\n\n\nYours faithfully,\n  \n\nCaptured via Leegality.com (01JV5DYQGH8MRXGTFWYAQM6BFW) {{STAKEHOLDER_NAME}}\nDate: Fri May 30 11:18:16 IST 2025\n\n\n{{STAKEHOLDER_NAME}}",
  grantLetterCompanyName: "Teachmint Technologies Private Limited",
  grantLetterCompanyAddress: "5th Floor, North Wing, SJR The HUB, Survey No. 8/2 & 9, Sarjapur Road, Bengaluru, Karnataka - 560103",
  grantLetterCompanyCIN: "U62099KA2020PTC135305",
  defaultEsopPolicyFileName: "Teachmint_Global_ESOP_Policy_2025.pdf",
  defaultEsopPolicyFileUrl: "data:text/plain;base64,VEVBQ0hNSU5UIEdMT0JBTCBFU09QIFBPTElDWSAyMDI1CgpUaGlzIGlzIHRoZSBvZmZpY2lhbCBUZWFjaG1pbnQgR2xvYmFsIEVTT1AgUG9saWN5IGZvciAyMDI1LiBBbGwgZW1wbG95ZWVzIGFyZSBzdWJqZWN0IHRvIHRoZSBndWlkZWxpbmVzLCBjbGlmZiByZXMtc3RyYXRlZ2llcywgYW5kIGV4ZXJjaXNlIHBlcmlvZHMgZGVmaW5lZCBoZXJlaW4u",
  googleDocUrl: "https://docs.google.com/document/d/1Q396bGnmJ84f-duN7KHdoGlL4aTUkAemM1GDT71ucgA/edit?usp=sharing",
  senderEmailId: "hr@teachmint.com",
  backupDriveFolderId: "",
  backupDriveFolderName: "",
  lastBackupDate: "",
  lastUpdated: new Date().toISOString(),
  emailTemplateWelcomeSubject: "TeachVest Invitation: Access Your Employee ESOP Dashboard",
  emailTemplateWelcomeBody: `<div style="font-family: sans-serif; padding: 24px; color: #1e293b; background: #eef2ff; border-radius: 12px; max-width: 600px; border: 1px solid #e0e7ff;">
  <h2 style="color: #0052ff; margin-bottom: 8px; font-weight: 800; letter-spacing: -0.02em;">Welcome to TeachVest, {{STAKEHOLDER_NAME}}!</h2>
  <p style="font-size: 14px; line-height: 1.5; color: #475569;">An official employee profile has been created for you on the TeachVest platform by your company administrator.</p>
  
  <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
    <p style="margin: 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.1em;">Your Login Credentials</p>
    <div style="height: 1px; background: #f1f5f9; margin: 8px 0;"></div>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Login Username:</strong> {{EMPLOYEE_EMAIL}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Temporary Password:</strong> {{PASSWORD}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Employee Designation:</strong> {{DESIGNATION}} ({{DEPARTMENT}})</p>
  </div>

  <p style="font-size: 14px; line-height: 1.5; color: #475569;">To securely inspect, monitor and exercise your vesting ESOP shares, please log in to your employee dashboard using the button below:</p>
  
  <div style="text-align: center; margin: 25px 0;">
    <a href="{{PORTAL_URL}}" style="display: inline-block; background: #0052ff; color: white; padding: 14px 28px; border-radius: 12px; font-weight: bold; text-decoration: none; font-size: 14px; box-shadow: 0 10px 15px -3px rgba(0, 82, 255, 0.2);">Enter TeachVest Portal</a>
  </div>

  <p style="font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 20px; line-height: 1.4;">
    Security Policy: This is an automated security mail dispatch. If you did not expect these credentials or have security questions, please contact your TeachVest Cap-Table HR administrator immediately.
  </p>
</div>`,
  emailTemplateReminderSubject: "Urgent Action Required: Teachmint ESOP Grant E-Signature Request",
  emailTemplateReminderBody: `<div style="font-family: sans-serif; padding: 24px; color: #1e293b; background: #fffbeb; border-radius: 12px; max-width: 600px; border: 1px solid #fef3c7;">
  <h2 style="color: #b45309; margin-bottom: 8px; font-weight: 800; letter-spacing: -0.02em;">Digital Signature Outstanding</h2>
  <p style="font-size: 14px; line-height: 1.5; color: #475569;">Hello {{STAKEHOLDER_NAME}}, your ESOP Options Allocation Offer <strong>{{GRANT_ID}}</strong> representing <strong>{{SHARES_QUANTITY}} Options</strong> is awaiting your e-signature execution.</p>
  
  <div style="background: white; border: 1px solid #fef3c7; border-radius: 12px; padding: 18px; margin: 20px 0;">
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Grant Reference:</strong> {{GRANT_ID}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Strike Option Price:</strong> INR {{STRIKE_PRICE}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Sign-off Status:</strong> Pending Stakeholder Signature</p>
  </div>

  <p style="font-size: 14px; line-height: 1.5; color: #475569;">Please log in securely to complete signing and execute your digital ESOP Grant Certificate contract:</p>
  
  <div style="text-align: center; margin: 25px 0;">
    <a href="{{PORTAL_URL}}" style="display: inline-block; background: #0052ff; color: white; padding: 14px 28px; border-radius: 12px; font-weight: bold; text-decoration: none; font-size: 14px; box-shadow: 0 10px 15px -3px rgba(0, 82, 255, 0.2);">Review & E-Sign Offer Letter</a>
  </div>
</div>`,
  emailTemplateVestingSubject: "Teachmint options vested today! ({{VESTED_DATE}})",
  emailTemplateVestingBody: `<div style="font-family: sans-serif; padding: 24px; color: #1e293b; background: #eef2ff; border-radius: 12px; max-width: 600px; border: 1px solid #e0e7ff;">
  <h3 style="color: #6366f1; margin-bottom: 12px; font-weight: 800; font-family: sans-serif;">Automated Option Vesting Notification</h3>
  <p style="font-size: 14px; line-height: 1.6; color: #475569; font-family: sans-serif;">
    Hi <strong>{{STAKEHOLDER_NAME}}</strong>,
  </p>
  <p style="font-size: 14px; line-height: 1.6; color: #475569; font-family: sans-serif;">
    We are happy to inform you that <strong>{{VESTED_SHARES}}</strong> options got vested on <strong>{{VESTED_DATE}}</strong> for your grant under <strong>Teachmint Technologies Private Limited Employees’ Stock Option Plan 2020</strong>.
  </p>
  <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
    <p style="margin: 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.1em;">Vesting Milestone Stats</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Milestone Date:</strong> {{VESTED_DATE}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Newly Vested Options:</strong> {{VESTED_SHARES}} units</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Cumulative Vested Options:</strong> {{CUMULATIVE_VESTED_SHARES}} units</p>
  </div>
  <div style="text-align: center; margin: 25px 0;">
    <a href="{{PORTAL_URL}}" style="display: inline-block; background: #0052ff; color: white; padding: 12px 24px; border-radius: 10px; font-weight: bold; text-decoration: none; font-size: 13px; font-family: sans-serif;">Login to TeachVest Dashboard</a>
  </div>
  <p style="font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 20px; font-family: sans-serif;">
    Regards,<br/>
    <strong>Teachmint HR Operations</strong>
  </p>
</div>`,
  emailTemplateAdminSubject: "TeachVest Invitation: Administrator Access Granted",
  emailTemplateAdminBody: `<div style="font-family: sans-serif; padding: 24px; color: #1e293b; background: #f8fafc; border-radius: 12px; max-width: 600px; border: 1px solid #e2e8f0;">
  <h2 style="color: #0052ff; margin-bottom: 8px; font-weight: 800; letter-spacing: -0.02em;">TeachVest Administrator Access Activated</h2>
  <p style="font-size: 14px; line-height: 1.5; color: #475569;">You have been granted official Administrator privileges on the TeachVest Capital Cap-Table and ESOP Management System.</p>
  
  <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
    <p style="margin: 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.1em;">Your Administrator Credentials</p>
    <div style="height: 1px; background: #f1f5f9; margin: 8px 0;"></div>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Login Username:</strong> {{ADMIN_EMAIL}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Temporary Password:</strong> {{PASSWORD}}</p>
    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Assigned Access Role:</strong> Platform Administrator / Board Observer</p>
  </div>

  <p style="font-size: 14px; line-height: 1.5; color: #475569;">Use corporate administrator portal access to define stock metrics, edit employee grants, attach critical legal documents and supervise active vestings.</p>
  
  <div style="text-align: center; margin: 25px 0;">
    <a href="{{PORTAL_URL}}" style="display: inline-block; background: #0052ff; color: white; padding: 14px 28px; border-radius: 12px; font-weight: bold; text-decoration: none; font-size: 14px; box-shadow: 0 10px 15px -3px rgba(0, 82, 255, 0.2);">Enter Admin Dashboard</a>
  </div>

  <p style="font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 20px; line-height: 1.4;">
    Security Alert: Keep these credentials stored securely. Do not share your login details with any unverified accounts. All access sessions are logged for audit compliance.
  </p>
</div>`
};

function replaceTokens(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escapedKey, 'g'), value || '');
  }
  return result;
}

async function seedDatabaseIfEmpty() {
  try {
    console.log("Checking Firestore status for database auto-seeding...");
    
    // Seed settings
    const settingsRef = doc(db, "settings", "company");
    const settingsSnap = await getDoc(settingsRef);
    const docData = settingsSnap.exists() ? settingsSnap.data() : null;
    const needsMigration = !docData || !docData.grantLetterBodyHeader || !docData.grantLetterBodyHeader.includes("{{VESTING_SCHEDULE_TABLE}}");
    if (needsMigration) {
      console.log("Seeding/Migrating global company settings to the new Google Doc template...");
      await setDoc(settingsRef, DEFAULT_SETTINGS);
    }

    // Sync/Seed admins
    console.log("Synchronizing latest administrators with Cloud Firestore...");
    const seedAdmins = [
      ...JSON.parse(JSON.stringify(MOCK_ADMINS)),
      {
        email: "ashutosh@teachmint.com",
        password: "ashu123", // sync with the latest specified password
        name: "Ashutosh Unhale",
        role: "admin"
      },
      {
         email: "hr@teachmint.com",
         password: "hr123",
         name: "HR",
         role: "admin"
      },
      {
        email: "sanju.ts@teachmint.com",
        password: "admin123",
        name: "Sanju T",
        role: "admin"
      },
      {
        email: "preeta@teachmint.com",
        password: "admin123",
        name: "Preeta Saxena",
        role: "admin"
      }
    ];
    // Deduplicate by email
    const uniqueAdminsMap = new Map<string, any>();
    for (const admin of seedAdmins) {
      uniqueAdminsMap.set(admin.email.toLowerCase(), admin);
    }
    for (const admin of uniqueAdminsMap.values()) {
      const adminId = admin.email.toLowerCase().replace(/[^a-z0-9]/g, "_");
      await setDoc(doc(db, "admins", adminId), admin);
    }

    // Sync/Seed employees
    console.log("Synchronizing core employees with Cloud Firestore...");
    const currentMockIds = new Set(MOCK_EMPLOYEES.map(emp => emp.id));
    const employeesSnap = await getDocs(collection(db, "employees"));
    
    // Clear out-of-date mockup employee profiles from Firestore
    for (const empDoc of employeesSnap.docs) {
      const empId = empDoc.id;
      if (empId.startsWith("EMP") && !currentMockIds.has(empId)) {
        console.log(`Deleting outdated mockup employee ${empId} from Cloud Firestore...`);
        await deleteDoc(doc(db, "employees", empId));
      }
    }

    // Seed current mock employees to Cloud Firestore only if they don't already exist
    for (const emp of MOCK_EMPLOYEES) {
      const empRef = doc(db, "employees", emp.id);
      const empSnap = await getDoc(empRef);
      if (!empSnap.exists()) {
        console.log(`Syncing/Seeding Cloud database for employee ${emp.id} (${emp.name})...`);
        await setDoc(empRef, emp);
      } else {
        console.log(`Employee ${emp.id} (${emp.name}) already exists. Preserving custom fields, vesting details, and documents.`);
      }
    }
    
    // Seed initial logs if auditLogs is empty
    const logsSnap = await getDocs(collection(db, "auditLogs"));
    if (logsSnap.empty) {
      console.log("Seeding core system event telemetry logs to cloud...");
      const initialLogs = [
        {
          id: "LOG-000001",
          timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
          adminEmail: "ashutosh@teachmint.com",
          action: "System Initialisation",
          details: "TeachVest Platform Cap-Table initialized with 10,000,000 Pool Shares and current Fair Market Value (FMV) of INR 210.00."
        },
        {
          id: "LOG-000002",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          adminEmail: "ashutosh@teachmint.com",
          action: "Employee Seed",
          details: "Imported core team members: Ashutosh Unhale, Neeraj Kumar, Vinay Bansal & Chinnappa C M."
        }
      ];
      for (const log of initialLogs) {
        await setDoc(doc(db, "auditLogs", log.id), log);
      }
    }
    console.log("Firestore cloud database connected and seed checks completed!");
  } catch (error) {
    console.error("Failed to seed cloud Firestore on server start:", error);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Wait for Firestore to be checked and seeded asynchronously
  await seedDatabaseIfEmpty();

  async function checkAndTriggerVestingEmails() {
    try {
      console.log("[AUTOMATION] Running Automated Vesting Email Sweeper check...");
      
      const settingsRef = doc(db, "settings", "company");
      const settingsSnap = await getDoc(settingsRef);
      const settingsData = settingsSnap.exists() ? settingsSnap.data() : { ...DEFAULT_SETTINGS };

      const fromAddress = settingsData.senderEmailId || "hr@teachmint.com";

      const employeesSnap = await getDocs(collection(db, "employees"));
      const employees = employeesSnap.docs.map(dec => dec.data() as Employee);

      // Check already sent emails to deduplicate
      const sentEmailsSnap = await getDocs(collection(db, "sentEmails"));
      const dispatchedMilestones = new Set<string>();
      sentEmailsSnap.forEach(eDoc => {
        const item = eDoc.data() as SentEmail;
        if (item.milestoneId) {
          dispatchedMilestones.add(item.milestoneId);
        }
      });

      const now = new Date();
      // IST conversion (GMT + 5.30)
      const istDate = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
      const todayStr = istDate.toISOString().split("T")[0];

      let sentCount = 0;

      for (const emp of employees) {
        if (!emp.grants || emp.grants.length === 0) continue;

        for (const grant of emp.grants) {
          const schedule = generateVestingSchedule(
            emp.joinDate || grant.grantDate,
            grant.totalShares,
            emp.cliffType,
            todayStr,
            grant as any,
            settingsData.roundingMode || "2-decimal"
          );

          // Find milestones with status "Vested" (vested today or in the past)
          const vestedMilestones = schedule.filter(m => m.status === "Vested");

          for (const event of vestedMilestones) {
            const milestoneId = `${emp.id}_${grant.id}_${event.date}`;

            if (!dispatchedMilestones.has(milestoneId)) {
              // Trigger automated email dispatch
              const emailId = `MSG-${Math.floor(Math.random() * 900000) + 100000}`;
              
              const variables = {
                "{{STAKEHOLDER_NAME}}": emp.name,
                "{{VESTED_DATE}}": event.date,
                "{{VESTED_SHARES}}": event.toVest.toLocaleString("en-IN"),
                "{{CUMULATIVE_VESTED_SHARES}}": event.totalVested.toLocaleString("en-IN"),
                "{{PORTAL_URL}}": `/?role=employee&email=${encodeURIComponent(emp.email)}`
              };
              const rawSub = settingsData.emailTemplateVestingSubject || `Teachmint options vested today! ({{VESTED_DATE}})`;
              const rawBody = settingsData.emailTemplateVestingBody || `
                <div style="font-family: sans-serif; padding: 24px; color: #1e293b; background: #eef2ff; border-radius: 12px; max-width: 600px; border: 1px solid #e0e7ff;">
                  <h3 style="color: #6366f1; margin-bottom: 12px; font-weight: 800; font-family: sans-serif;">Automated Option Vesting Notification</h3>
                  <p style="font-size: 14px; line-height: 1.6; color: #475569; font-family: sans-serif;">
                    Hi <strong>{{STAKEHOLDER_NAME}}</strong>,
                  </p>
                  <p style="font-size: 14px; line-height: 1.6; color: #475569; font-family: sans-serif;">
                    We are happy to inform you that <strong>{{VESTED_SHARES}}</strong> options got vested on <strong>{{VESTED_DATE}}</strong> for your grant under <strong>Teachmint Technologies Private Limited Employees’ Stock Option Plan 2020</strong>.
                  </p>
                  <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                    <p style="margin: 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.1em;">Vesting Milestone Stats</p>
                    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Milestone Date:</strong> {{VESTED_DATE}}</p>
                    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Newly Vested Options:</strong> {{VESTED_SHARES}} units</p>
                    <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Cumulative Vested Options:</strong> {{CUMULATIVE_VESTED_SHARES}} units</p>
                  </div>
                  <div style="text-align: center; margin: 25px 0;">
                    <a href="{{PORTAL_URL}}" style="display: inline-block; background: #0052ff; color: white; padding: 12px 24px; border-radius: 10px; font-weight: bold; text-decoration: none; font-size: 13px; font-family: sans-serif;">Login to TeachVest Dashboard</a>
                  </div>
                  <p style="font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 20px; font-family: sans-serif;">
                    Regards,<br/>
                    <strong>Teachmint HR Operations</strong>
                  </p>
                </div>
              `;
              const emailSubject = replaceTokens(rawSub, variables);
              const emailBody = replaceTokens(rawBody, variables).trim().replace(/\n\s+/g, '\n');

              const inviteEmail: SentEmail = {
                id: emailId,
                recipient: emp.email,
                name: emp.name,
                subject: emailSubject,
                body: emailBody,
                sentAt: new Date().toISOString(),
                role: "employee",
                password: emp.password || "login123",
                milestoneId: milestoneId,
                sender: fromAddress
              };

              await setDoc(doc(db, "sentEmails", emailId), inviteEmail);

              // Log system event telemetry
              const logId = `LOG-${Math.floor(Math.random() * 900000) + 100000}`;
              const autoLog = {
                id: logId,
                timestamp: new Date().toISOString(),
                adminEmail: "automation@teachmint.com",
                action: "Vesting Auto Notification",
                details: `Automated ESOP vesting alert triggered for stakeholder ${emp.name} (${emp.email}). Dispatched alert representing ${event.toVest.toLocaleString("en-IN")} newly vested options on milestone date ${event.date}.`
              };
              await setDoc(doc(db, "auditLogs", logId), autoLog);

              dispatchedMilestones.add(milestoneId);
              sentCount++;
            }
          }
        }
      }

      if (sentCount > 0) {
        console.log(`[AUTOMATION] Vesting email sweeper complete. Dispatched ${sentCount} new notifications.`);
      } else {
        console.log("[AUTOMATION] Vesting email sweeper complete. No new pending notifications found.");
      }
    } catch (error) {
      console.error("[AUTOMATION] Vesting email sweeper failed:", error);
    }
  }

  // Setup Automated Background Clock running check every 60 seconds
  let lastCheckedHour = -1;
  let lastCheckedDate = "";

  setInterval(async () => {
    try {
      const now = new Date();
      // IST conversion (GMT + 5.30)
      const istDate = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
      const currentHourIST = istDate.getUTCHours(); // IST hours
      const currentDateISTStr = istDate.toISOString().split("T")[0];

      // Automatically trigger on the 9:00 AM block
      if (currentHourIST === 9 && (lastCheckedHour !== 9 || lastCheckedDate !== currentDateISTStr)) {
        console.log(`[AUTOMATION] Background scheduler matched 9:00 AM IST on date ${currentDateISTStr}. Launching sweeper...`);
        lastCheckedHour = 9;
        lastCheckedDate = currentDateISTStr;
        await checkAndTriggerVestingEmails();
      } else if (currentHourIST !== 9) {
        // Track normal hour changes
        lastCheckedHour = currentHourIST;
      }
    } catch (err) {
      console.error("[AUTOMATION] Scheduler ticks failed:", err);
    }
  }, 60000); // Ticks every 60 seconds

  async function recordLog(req: express.Request, action: string, details: string) {
    try {
      const adminEmail = (req.headers["x-admin-email"] as string) || "ashutosh@teachmint.com";
      const logId = `LOG-${Math.floor(Math.random() * 900000) + 100000}`;
      const newLog = {
        id: logId,
        timestamp: new Date().toISOString(),
        adminEmail,
        action,
        details
      };
      await setDoc(doc(db, "auditLogs", logId), newLog);
    } catch (error) {
      console.error("Failed to write audit log to cloud:", error);
    }
  }

  // API Routes
  app.post("/api/fetch-google-doc", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: "Google Doc URL is required" });
      }

      const match = url.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
      if (!match || !match[1]) {
        return res.status(400).json({ error: "Could not extract Document ID from URL. Make sure it is a valid Google Docs document sharing link." });
      }

      const docId = match[1];
      const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
      
      const fetchRes = await fetch(exportUrl);
      if (!fetchRes.ok) {
        throw new Error(`Google Docs responded with status code ${fetchRes.status}`);
      }

      const text = await fetchRes.text();
      res.json({ text });
    } catch (error: any) {
      console.error("Error fetching Google Doc:", error);
      res.status(500).json({ error: error.message || "Failed to fetch Google Doc text." });
    }
  });

  app.post("/api/trigger-vesting-emails", async (req, res) => {
    try {
      await checkAndTriggerVestingEmails();
      res.json({ success: true, message: "Manual check check sweep executed successfully!" });
    } catch (error: any) {
      console.error("Error running manual sweep:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/settings", async (req, res) => {
    try {
      const docRef = doc(db, "settings", "company");
      const docSnap = await getDoc(docRef);
      let settingsData = docSnap.exists() ? docSnap.data() : { ...DEFAULT_SETTINGS };
      
      // If chunked, DO NOT load all chunks in standard poll (saves massive bandwidth & prevents lag!),
      // instead, expose the api download endpoint as the file url!
      if (settingsData.defaultEsopPolicyFileUrl === "CHUNKER_MANAGED") {
        settingsData.defaultEsopPolicyFileUrl = "/api/settings/policy-download";
      }
      res.json(settingsData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Dedicated endpoint to download the chunked corporate policy file
  app.get("/api/settings/policy-download", async (req, res) => {
    try {
      const docRef = doc(db, "settings", "company");
      const docSnap = await getDoc(docRef);
      const settingsData = docSnap.exists() ? docSnap.data() : { ...DEFAULT_SETTINGS };

      let fullUrl = "";
      if (settingsData.defaultEsopPolicyFileUrl === "CHUNKER_MANAGED" && settingsData.policyChunksCount) {
        for (let i = 0; i < settingsData.policyChunksCount; i++) {
          const chunkSnap = await getDoc(doc(db, "policy_chunks", `chunk_${i}`));
          if (chunkSnap.exists()) {
            fullUrl += chunkSnap.data().content || "";
          }
        }
      } else {
        fullUrl = settingsData.defaultEsopPolicyFileUrl || "";
      }

      if (fullUrl.startsWith("data:")) {
        const match = fullUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          const mimeType = match[1];
          const base64Data = match[2];
          const buffer = Buffer.from(base64Data, 'base64');
          res.setHeader('Content-Type', mimeType);
          res.setHeader('Content-Disposition', `attachment; filename="${settingsData.defaultEsopPolicyFileName || 'ESOP_Policy.pdf'}"`);
          return res.send(buffer);
        }
      }

      // Fallback
      res.redirect(fullUrl || "/");
    } catch (error: any) {
      console.error("Error downloading policy:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Dedicated chunked upload endpoint to bypass the Nginx 1MB body limit & Firestore 1MB doc limit
  app.post("/api/settings/policy-chunk", async (req, res) => {
    try {
      const { fileName, chunk, index, total } = req.body;
      if (fileName === undefined || chunk === undefined || index === undefined || total === undefined) {
        return res.status(400).json({ error: "Missing required chunk arguments" });
      }

      // Delete old chunks if writing the first chunk
      if (index === 0) {
        const docRef = doc(db, "settings", "company");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const oldSettings = docSnap.data();
          const oldChunksCount = oldSettings.policyChunksCount || 0;
          for (let i = 0; i < oldChunksCount; i++) {
            try {
              await deleteDoc(doc(db, "policy_chunks", `chunk_${i}`));
            } catch (e) {}
          }
        }
      }

      // Save this chunk
      await setDoc(doc(db, "policy_chunks", `chunk_${index}`), {
        content: chunk,
        index: index,
        total: total
      });

      // If it's the last chunk, assemble settings doc
      if (index === total - 1) {
        const docRef = doc(db, "settings", "company");
        const docSnap = await getDoc(docRef);
        const oldSettings = docSnap.exists() ? docSnap.data() : { ...DEFAULT_SETTINGS };

        const newSettings = {
          ...oldSettings,
          defaultEsopPolicyFileName: fileName,
          defaultEsopPolicyFileUrl: "CHUNKER_MANAGED",
          policyChunksCount: total,
          lastUpdated: new Date().toISOString()
        };

        await setDoc(docRef, newSettings);
        await recordLog(req, "Update Global Policy", `Admin uploaded and published a global ESOP policy file: "${fileName}" (~${Math.round((total * 500) / 100) / 10} MB).`);
        return res.json({ success: true, finished: true });
      }

      res.json({ success: true, finished: false });
    } catch (error: any) {
      console.error("Error writing policy chunk:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const docRef = doc(db, "settings", "company");
      const docSnap = await getDoc(docRef);
      const oldSettings = docSnap.exists() ? docSnap.data() as typeof DEFAULT_SETTINGS : { ...DEFAULT_SETTINGS };
      
      const newSettings = {
        ...oldSettings,
        ...req.body,
        lastUpdated: new Date().toISOString()
      };

      // Chunk large policy document storage to circumvent 1MB Firestore document limit
      const CHUNK_SIZE = 700000; // 700KB chunks
      if (req.body.defaultEsopPolicyFileUrl !== undefined) {
        const policyUrl = req.body.defaultEsopPolicyFileUrl;
        
        // Always delete old chunks
        const oldChunksCount = (oldSettings as any).policyChunksCount || 0;
        for (let i = 0; i < oldChunksCount; i++) {
          try {
            await deleteDoc(doc(db, "policy_chunks", `chunk_${i}`));
          } catch (e) {}
        }

        if (policyUrl && policyUrl !== "CHUNKER_MANAGED") {
          const chunks: string[] = [];
          for (let i = 0; i < policyUrl.length; i += CHUNK_SIZE) {
            chunks.push(policyUrl.substring(i, i + CHUNK_SIZE));
          }
          
          for (let i = 0; i < chunks.length; i++) {
            await setDoc(doc(db, "policy_chunks", `chunk_${i}`), {
              content: chunks[i],
              index: i,
              total: chunks.length
            });
          }
          
          newSettings.defaultEsopPolicyFileUrl = "CHUNKER_MANAGED";
          (newSettings as any).policyChunksCount = chunks.length;
        } else if (policyUrl === "") {
          // Reset to default
          newSettings.defaultEsopPolicyFileName = DEFAULT_SETTINGS.defaultEsopPolicyFileName;
          newSettings.defaultEsopPolicyFileUrl = DEFAULT_SETTINGS.defaultEsopPolicyFileUrl;
          (newSettings as any).policyChunksCount = 0;
        }
      }
      
      await setDoc(docRef, newSettings);

      // Also sync currentFMV into all active employee grants as currentFMV
      if (req.body.currentFMV !== undefined) {
        const newFMV = parseFloat(req.body.currentFMV);
        const empQuerySnap = await getDocs(collection(db, "employees"));
        for (const empDoc of empQuerySnap.docs) {
          const empData = empDoc.data() as Employee;
          if (empData.grants) {
            let updated = false;
            const updatedGrants = empData.grants.map((g: any) => {
              if (g.currentFMV !== newFMV) {
                updated = true;
                return { ...g, currentFMV: newFMV };
              }
              return g;
            });
            if (updated) {
              await updateDoc(doc(db, "employees", empDoc.id), { grants: updatedGrants });
            }
          }
        }
      }
      
      const changes: string[] = [];
      if (req.body.currentFMV !== undefined && req.body.currentFMV !== oldSettings.currentFMV) {
        changes.push(`FMV changed from INR ${oldSettings.currentFMV} to INR ${req.body.currentFMV}`);
      }
      if (req.body.totalPool !== undefined && req.body.totalPool !== oldSettings.totalPool) {
        changes.push(`Total Pool changed from ${oldSettings.totalPool.toLocaleString()} to ${req.body.totalPool.toLocaleString()}`);
      }
      const detailsMsg = changes.length > 0 ? `Updated Company Settings: ${changes.join(", ")}` : "Updated Company Settings";
      
      await recordLog(req, "Update Settings", detailsMsg);
      res.json(newSettings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/employees", async (req, res) => {
    try {
      const snap = await getDocs(collection(db, "employees"));
      const employees = snap.docs.map(d => d.data());
      res.json(employees);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/employees/by-email", async (req, res) => {
    try {
      const email = (req.query.email as string || '').toLowerCase();
      const snap = await getDocs(collection(db, "employees"));
      const employees = snap.docs.map(d => d.data() as Employee);
      const employee = employees.find(
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

  app.get("/api/employees/:id", async (req, res) => {
    try {
      const docRef = doc(db, "employees", req.params.id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        res.json(snap.data());
      } else {
        res.status(404).json({ error: "Employee not found" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/employees", async (req, res) => {
    try {
      const newEmp = req.body as Employee;
      const docRef = doc(db, "employees", newEmp.id);
      const snap = await getDoc(docRef);
      
      if (snap.exists()) {
        const merged = { ...snap.data(), ...newEmp };
        await setDoc(docRef, merged);
        await recordLog(req, "Update Employee", `Updated core profile info for employee ${newEmp.name} (${newEmp.email})`);
      } else {
        await setDoc(docRef, newEmp);
        // Create an invitation email!
        const settingsSnap = await getDoc(doc(db, "settings", "company"));
        const settingsData = settingsSnap.exists() ? settingsSnap.data() : { ...DEFAULT_SETTINGS };
        const fromAddress = settingsData.senderEmailId || "hr@teachmint.com";

        const emailId = `MSG-${Math.floor(Math.random() * 900000) + 100000}`;
        const variables = {
          "{{STAKEHOLDER_NAME}}": newEmp.name,
          "{{EMPLOYEE_EMAIL}}": newEmp.email,
          "{{PASSWORD}}": newEmp.password || "login123",
          "{{DESIGNATION}}": newEmp.designation || "",
          "{{DEPARTMENT}}": newEmp.department || "",
          "{{PORTAL_URL}}": `/?role=employee&email=${encodeURIComponent(newEmp.email)}`
        };

        const rawSub = settingsData.emailTemplateWelcomeSubject || "TeachVest Invitation: Access Your Employee ESOP Dashboard";
        const rawBody = settingsData.emailTemplateWelcomeBody || `
          <div style="font-family: sans-serif; padding: 24px; color: #1e293b; background: #eef2ff; border-radius: 12px; max-width: 600px; border: 1px solid #e0e7ff;">
            <h2 style="color: #0052ff; margin-bottom: 8px; font-weight: 800; letter-spacing: -0.02em;">Welcome to TeachVest, {{STAKEHOLDER_NAME}}!</h2>
            <p style="font-size: 14px; line-height: 1.5; color: #475569;">An official employee profile has been created for you on the TeachVest platform by your company administrator.</p>
            
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
              <p style="margin: 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.1em;">Your Login Credentials</p>
              <div style="height: 1px; background: #f1f5f9; margin: 8px 0;"></div>
              <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Login Username:</strong> {{EMPLOYEE_EMAIL}}</p>
              <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Temporary Password:</strong> {{PASSWORD}}</p>
              <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Employee Designation:</strong> {{DESIGNATION}} ({{DEPARTMENT}})</p>
            </div>

            <p style="font-size: 14px; line-height: 1.5; color: #475569;">To securely inspect, monitor and exercise your vesting ESOP shares, please log in to your employee dashboard using the button below:</p>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="{{PORTAL_URL}}" style="display: inline-block; background: #0052ff; color: white; padding: 14px 28px; border-radius: 12px; font-weight: bold; text-decoration: none; font-size: 14px; box-shadow: 0 10px 15px -3px rgba(0, 82, 255, 0.2);">Enter TeachVest Portal</a>
            </div>

            <p style="font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 20px; line-height: 1.4;">
              Security Policy: This is an automated security mail dispatch. If you did not expect these credentials or have security questions, please contact your TeachVest Cap-Table HR administrator immediately.
            </p>
          </div>
        `;

        const inviteEmail: SentEmail = {
          id: emailId,
          recipient: newEmp.email,
          name: newEmp.name,
          subject: replaceTokens(rawSub, variables),
          body: replaceTokens(rawBody, variables).trim().replace(/\n\s+/g, '\n'),
          sentAt: new Date().toISOString(),
          role: "employee",
          password: newEmp.password || "login123",
          sender: fromAddress
        };
        await setDoc(doc(db, "sentEmails", emailId), inviteEmail);
        await recordLog(req, "Create Employee", `Created employee profile for ${newEmp.name} (${newEmp.email}) representing ${newEmp.grants?.[0]?.totalShares?.toLocaleString() || 0} initial options.`);
      }
      res.json(newEmp);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/employees/:id", async (req, res) => {
    try {
      const docRef = doc(db, "employees", req.params.id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const original = snap.data() as Employee;
        const updated = { ...original, ...req.body };
        await setDoc(docRef, updated);
        
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
        
        await recordLog(req, "Edit Employee", detailsMsg);
        res.json(updated);
      } else {
        res.status(404).json({ error: "Employee not found" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/employees/:id", async (req, res) => {
    try {
      const docRef = doc(db, "employees", req.params.id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const target = snap.data() as Employee;
        await deleteDoc(docRef);
        await recordLog(req, "Delete Employee", `Removed employee profile and cap-table entry for ${target.name} (${target.email})`);
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Employee not found" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admins", async (req, res) => {
    try {
      const snap = await getDocs(collection(db, "admins"));
      const admins = snap.docs.map(d => d.data());
      res.json(admins);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admins/by-email", async (req, res) => {
    try {
      const email = (req.query.email as string || '').toLowerCase();
      const snap = await getDocs(collection(db, "admins"));
      const admins = snap.docs.map(d => d.data() as Admin);
      const admin = admins.find(adm => adm.email.toLowerCase() === email);
      if (admin) {
        res.json(admin);
      } else {
        res.status(404).json({ error: "Admin not found" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/emails", async (req, res) => {
    try {
      const snap = await getDocs(collection(db, "sentEmails"));
      const emails = snap.docs.map(d => d.data());
      res.json(emails);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/emails", async (req, res) => {
    try {
      const newEmail = req.body as SentEmail;
      if (!newEmail.id) {
        newEmail.id = `MSG-${Math.floor(Math.random() * 900000) + 100000}`;
      }
      if (!newEmail.sentAt) {
        newEmail.sentAt = new Date().toISOString();
      }
      await setDoc(doc(db, "sentEmails", newEmail.id), newEmail);
      res.json({ success: true, email: newEmail });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admins", async (req, res) => {
    try {
      const newAdmin = req.body as Admin;
      const adminId = newAdmin.email.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const docRef = doc(db, "admins", adminId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        await setDoc(docRef, { ...snap.data(), ...newAdmin });
        await recordLog(req, "Update Administrator", `Updated permission layout or info for administrator ${newAdmin.name} (${newAdmin.email})`);
      } else {
        await setDoc(docRef, newAdmin);
        // Create an invitation email!
        const settingsSnap = await getDoc(doc(db, "settings", "company"));
        const settingsData = settingsSnap.exists() ? settingsSnap.data() : { ...DEFAULT_SETTINGS };
        const fromAddress = settingsData.senderEmailId || "hr@teachmint.com";

        const emailId = `MSG-${Math.floor(Math.random() * 900000) + 100000}`;
        const variables = {
          "{{ADMIN_NAME}}": newAdmin.name,
          "{{ADMIN_EMAIL}}": newAdmin.email,
          "{{PASSWORD}}": newAdmin.password || "admin123",
          "{{PORTAL_URL}}": `/?role=admin&email=${encodeURIComponent(newAdmin.email)}`
        };

        const rawSub = settingsData.emailTemplateAdminSubject || "TeachVest Invitation: Administrator Access Granted";
        const rawBody = settingsData.emailTemplateAdminBody || `
          <div style="font-family: sans-serif; padding: 24px; color: #1e293b; background: #f8fafc; border-radius: 12px; max-width: 600px; border: 1px solid #e2e8f0;">
            <h2 style="color: #0052ff; margin-bottom: 8px; font-weight: 800; letter-spacing: -0.02em;">TeachVest Administrator Access Activated</h2>
            <p style="font-size: 14px; line-height: 1.5; color: #475569;">You have been granted official Administrator privileges on the TeachVest Capital Cap-Table and ESOP Management System.</p>
            
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
              <p style="margin: 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.1em;">Your Administrator Credentials</p>
              <div style="height: 1px; background: #f1f5f9; margin: 8px 0;"></div>
              <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Login Username:</strong> {{ADMIN_EMAIL}}</p>
              <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Temporary Password:</strong> {{PASSWORD}}</p>
              <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Assigned Access Role:</strong> Platform Administrator / Board Observer</p>
            </div>

            <p style="font-size: 14px; line-height: 1.5; color: #475569;">Use corporate administrator portal access to define stock metrics, edit employee grants, attach critical legal documents and supervise active vestings.</p>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="{{PORTAL_URL}}" style="display: inline-block; background: #0052ff; color: white; padding: 14px 28px; border-radius: 12px; font-weight: bold; text-decoration: none; font-size: 14px; box-shadow: 0 10px 15px -3px rgba(0, 82, 255, 0.2);">Enter Admin Dashboard</a>
            </div>

            <p style="font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 20px; line-height: 1.4;">
              Security Alert: Keep these credentials stored securely. Do not share your login details with any unverified accounts. All access sessions are logged for audit compliance.
            </p>
          </div>
        `;

        const inviteEmail: SentEmail = {
          id: emailId,
          recipient: newAdmin.email,
          name: newAdmin.name,
          subject: replaceTokens(rawSub, variables),
          body: replaceTokens(rawBody, variables).trim().replace(/\n\s+/g, '\n'),
          sentAt: new Date().toISOString(),
          role: "admin",
          password: newAdmin.password || "admin123",
          sender: fromAddress
        };
        await setDoc(doc(db, "sentEmails", emailId), inviteEmail);
        await recordLog(req, "Create Administrator", `Provisioned system administrator privileges for ${newAdmin.name} (${newAdmin.email})`);
      }
      res.json(newAdmin);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admins/:email", async (req, res) => {
    try {
      const email = req.params.email.toLowerCase();
      const adminId = email.replace(/[^a-z0-9]/g, "_");
      const docRef = doc(db, "admins", adminId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const target = snap.data() as Admin;
        await deleteDoc(docRef);
        await recordLog(req, "Delete Administrator", `Revoked system administrator credentials for ${target.name} (${target.email})`);
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Admin not found" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/audit-logs", async (req, res) => {
    try {
      const snap = await getDocs(collection(db, "auditLogs"));
      const logs = snap.docs.map(d => d.data());
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/audit-logs", async (req, res) => {
    try {
      const { action, details } = req.body;
      await recordLog(req, action, details || "");
      
      const snap = await getDocs(collection(db, "auditLogs"));
      const logs = snap.docs.map(d => d.data());
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      res.json({ success: true, logs });
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
