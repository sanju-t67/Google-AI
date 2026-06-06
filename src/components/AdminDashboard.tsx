/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
const logoUrl =
  "https://lh3.googleusercontent.com/d/1Lj5Gm67qUfIYizVoGVdPsXwC6yt-WxgB";
const otherLogoUrl =
  "https://lh3.googleusercontent.com/d/1FeJm6poQPXmoYKLJd94gGnqdJmkwhiHL";
import { motion, AnimatePresence } from "motion/react";
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
  History,
  User,
  FileText,
  Check,
  Lock,
  PlusCircle,
  FileDown,
  Send,
  PenTool,
  CheckSquare,
  Sliders,
  Cloud,
  FolderOpen,
  RefreshCw,
} from "lucide-react";
import { Admin, Employee, Grant, AuditLog } from "../types";
import { Avatar, StatusBadge } from "./ui/Shared";
import { MetricCard } from "./ui/MetricCard";
import { VestingBar } from "./ui/VestingBar";
import {
  calcPortfolioValue,
  calcTotalVested,
  calcTotalGranted,
  calcPotentialGain,
  fmtCurrency,
  fmt,
  fmtDate,
  pct,
  calculateLiveVested,
  replaceLetterPlaceholders,
  generateVestingScheduleTableHtml,
  generateVestingSchedule,
} from "../lib/utils";
import {
  AddEmployeeModal,
  EditEmployeeModal,
  BulkUploadModal,
  ManageGrantsModal,
} from "./AdminModals";
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
  subscribeToAuditLogs,
  createAuditLog,
  sendSystemEmail,
  uploadChunkedPolicy,
} from "../services/dataService";
import Papa from "papaparse";
import { auth, googleProvider } from "../lib/firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";

interface Props {
  user: Admin;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<Props> = ({
  user: initialUser,
  onLogout,
}) => {
  const [user, setUser] = useState<Admin>(initialUser);

  const [googleAuthToken, setGoogleAuthToken] = useState<string | null>(null);
  const [googleUserEmail, setGoogleUserEmail] = useState<string | null>(null);
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [isPerformingBackup, setIsPerformingBackup] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);
  const [gmailStatusMsg, setGmailStatusMsg] = useState<string | null>(null);

  const formatDateTimeSafe = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleString();
      }
    } catch (e) {}
    return dateStr;
  };

  const formatDateSafe = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString();
      }
    } catch (e) {}
    return dateStr;
  };

  const formatTimeSafe = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString();
      }
    } catch (e) {}
    return dateStr;
  };
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null,
  );
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
    lastUpdated: new Date().toISOString(),
  });

  // Draft inputs for Settings tab to prevent polling overrides while typing
  const [totalPoolInput, setTotalPoolInput] = useState<string>("");
  const [currentFMVInput, setCurrentFMVInput] = useState<string>("");

  // Custom template and authorised signatory inputs
  const [grantLetterSubjectInput, setGrantLetterSubjectInput] =
    useState<string>("");
  const [grantLetterCompanyNameInput, setGrantLetterCompanyNameInput] =
    useState<string>("");
  const [grantLetterCompanyAddressInput, setGrantLetterCompanyAddressInput] =
    useState<string>("");
  const [grantLetterCompanyCINInput, setGrantLetterCompanyCINInput] =
    useState<string>("");
  const [grantLetterBodyHeaderInput, setGrantLetterBodyHeaderInput] =
    useState<string>("");
  const [grantLetterBodyFooterInput, setGrantLetterBodyFooterInput] =
    useState<string>("");

  const [signatoryNameInput, setSignatoryNameInput] = useState<string>("");
  const [signatoryEmailInput, setSignatoryEmailInput] = useState<string>("");
  const [signatoryDesignationInput, setSignatoryDesignationInput] =
    useState<string>("");

  const [defaultEsopPolicyFileNameInput, setDefaultEsopPolicyFileNameInput] =
    useState<string>("");
  const [defaultEsopPolicyFileUrlInput, setDefaultEsopPolicyFileUrlInput] =
    useState<string>("");

  const [employeeInviteSubjectInput, setEmployeeInviteSubjectInput] = useState<string>("");
  const [employeeInviteBodyInput, setEmployeeInviteBodyInput] = useState<string>("");
  const [adminInviteSubjectInput, setAdminInviteSubjectInput] = useState<string>("");
  const [adminInviteBodyInput, setAdminInviteBodyInput] = useState<string>("");
  const [eSignReminderSubjectInput, setESignReminderSubjectInput] = useState<string>("");
  const [eSignReminderBodyInput, setESignReminderBodyInput] = useState<string>("");
  const [vestingAlertSubjectInput, setVestingAlertSubjectInput] = useState<string>("");
  const [vestingAlertBodyInput, setVestingAlertBodyInput] = useState<string>("");

  const [googleDocUrlInput, setGoogleDocUrlInput] = useState<string>("");
  const [isSyncingGoogleDoc, setIsSyncingGoogleDoc] = useState<boolean>(false);

  // High-fidelity local PDF template editor states
  const [pdfEditorSection, setPdfEditorSection] = useState<
    "header" | "content" | "footer"
  >("content");
  const [pdfActiveHighlight, setPdfActiveHighlight] = useState<
    "company" | "subject" | "body_header" | "body_footer" | "signatory" | null
  >(null);

  const [hasInitializedInputs, setHasInitializedInputs] = React.useState(false);

  React.useEffect(() => {
    if (companySettings && !hasInitializedInputs) {
      setTotalPoolInput(companySettings.totalPool?.toString() || "10000000");
      setCurrentFMVInput(companySettings.currentFMV?.toString() || "210");
      setGrantLetterSubjectInput(
        companySettings.grantLetterSubject ||
          "Option offering under Employees’ Stock Option Plan 2020 (ESOP 2020)",
      );
      setGoogleDocUrlInput(
        companySettings.googleDocUrl ||
          "https://docs.google.com/document/d/1Q396bGnmJ84f-duN7KHdoGlL4aTUkAemM1GDT71ucgA/edit?usp=sharing",
      );
      setGrantLetterCompanyNameInput(
        companySettings.grantLetterCompanyName ||
          "Teachmint Technologies Private Limited",
      );
      setGrantLetterCompanyAddressInput(
        companySettings.grantLetterCompanyAddress ||
          "Regd Office: Bangalore, Landmark Tower, Sector 3A, India",
      );
      setGrantLetterCompanyCINInput(
        companySettings.grantLetterCompanyCIN || "CIN: U72900KA2020PTC139045",
      );
      setGrantLetterBodyHeaderInput(
        companySettings.grantLetterBodyHeader ||
          "On behalf of Teachmint Technologies Private Limited, we are pleased to offer you options under the Teachmint ESOP Plan 2020. Below are the core parameters of your grant:",
      );
      setGrantLetterBodyFooterInput(
        companySettings.grantLetterBodyFooter ||
          "This offer and your participation in the ESOP Plan 2025 are subject to the terms and rules set out by Teachmint and the board of directors. By e-signing this offer letter below, you acknowledge and agree to abide by all the general guidelines of Teachmint.",
      );
      setSignatoryNameInput(companySettings.signatoryName || "Sanju T");
      setSignatoryEmailInput(
        companySettings.signatoryEmail || "sanju@sanju-t.com",
      );
      setSignatoryDesignationInput(
        companySettings.signatoryDesignation ||
          "Associate Vice President - Human Resources & CISO",
      );
      if (companySettings.defaultEsopPolicyFileName) {
        setDefaultEsopPolicyFileNameInput(
          companySettings.defaultEsopPolicyFileName,
        );
      }
      if (companySettings.defaultEsopPolicyFileUrl) {
        setDefaultEsopPolicyFileUrlInput(
          companySettings.defaultEsopPolicyFileUrl,
        );
      }
      if (companySettings.employeeInviteSubject) {
        setEmployeeInviteSubjectInput(companySettings.employeeInviteSubject);
      }
      if (companySettings.employeeInviteBody) {
        setEmployeeInviteBodyInput(companySettings.employeeInviteBody);
      }
      if (companySettings.adminInviteSubject) {
        setAdminInviteSubjectInput(companySettings.adminInviteSubject);
      }
      if (companySettings.adminInviteBody) {
        setAdminInviteBodyInput(companySettings.adminInviteBody);
      }
      if (companySettings.eSignReminderSubject) {
        setESignReminderSubjectInput(companySettings.eSignReminderSubject);
      }
      if (companySettings.eSignReminderBody) {
        setESignReminderBodyInput(companySettings.eSignReminderBody);
      }
      if (companySettings.vestingAlertSubject) {
        setVestingAlertSubjectInput(companySettings.vestingAlertSubject);
      }
      if (companySettings.vestingAlertBody) {
        setVestingAlertBodyInput(companySettings.vestingAlertBody);
      }

      if (companySettings.totalPool && companySettings.currentFMV) {
        setHasInitializedInputs(true);
      }
    }
  }, [companySettings, hasInitializedInputs]);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isGrantsModalOpen, setIsGrantsModalOpen] = useState(false);

  // Selected Employee Sub-navigation tab
  const [employeeSubTab, setEmployeeSubTab] = useState<
    "profile" | "grants" | "documents"
  >("profile");

  // Corporate settings sub-navigation tab
  const [settingsSubTab, setSettingsSubTab] = useState<
    "general" | "template" | "signatory" | "policy" | "approvals" | "emails" | "email_templates" | "integrations"
  >("general");

  // Grant pause/shift editing states
  const [expandedGrantId, setExpandedGrantId] = useState<string | null>(null);
  const [grantFormStates, setGrantFormStates] = useState<Record<string, any>>(
    {},
  );
  const [grantFormSaveSuccess, setGrantFormSaveSuccess] = useState<
    string | null
  >(null);

  React.useEffect(() => {
    if (selectedEmployee) {
      setEmployeeSubTab("profile");
    }
  }, [selectedEmployee?.id]);

  // Deletion and alert confirmation states
  const [deleteEmployeeConfirmId, setDeleteEmployeeConfirmId] = useState<
    string | null
  >(null);
  const [deleteAdminConfirmEmail, setDeleteAdminConfirmEmail] = useState<
    string | null
  >(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Email Outbox logs states
  const [emails, setEmails] = useState<SentEmail[]>([]);
  const [selectedMail, setSelectedMail] = useState<SentEmail | null>(null);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  React.useEffect(() => {
    // Seed current admin first to establish isAdmin status in Firestore
    const currentUid = auth.currentUser?.uid;
    if (currentUid && user.role === "admin") {
      createAdmin(user, currentUid).catch(console.error);
    }

    const unsubEmployees = subscribeToEmployees((data) => {
      setLoading(false);
      setEmployees(data);
      // Instant real-time view update
      setSelectedEmployee((prev) => {
        if (!prev) return null;
        const updated = data.find((emp) => emp.id === prev.id);
        return updated || null;
      });
    });

    const unsubSettings = subscribeToCompanySettings((settings) => {
      setCompanySettings(settings);
      if (settings.defaultEsopPolicyFileName) {
        setDefaultEsopPolicyFileNameInput(settings.defaultEsopPolicyFileName);
      }
      if (settings.defaultEsopPolicyFileUrl) {
        setDefaultEsopPolicyFileUrlInput(settings.defaultEsopPolicyFileUrl);
      } else {
        setDefaultEsopPolicyFileUrlInput("");
      }
    });

    const unsubAdmins = subscribeToAdmins((data) => {
      setAdminsList(data);
      // Keep active admin user object updated as well if it changes in database
      const latestMe = data.find(
        (adm) => adm.email.toLowerCase() === user.email.toLowerCase(),
      );
      if (latestMe) {
        setUser(latestMe);
      }
    });

    const unsubEmails = subscribeToEmails((data) => {
      // Sort emails in descending chronological order
      const sorted = [...data].sort(
        (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
      );
      setEmails(sorted);
    });

    const unsubAuditLogs = subscribeToAuditLogs((data) => {
      const sorted = [...data].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
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

  // Automatic Daily Backup schedule trigger inside active admin dashboard session
  React.useEffect(() => {
    if (googleAuthToken && companySettings?.backupDriveFolderId) {
      const lastBackup = companySettings.lastBackupDate;
      const today = new Date().toISOString().split("T")[0];
      const folderId = companySettings.backupDriveFolderId;
      const folderName = companySettings.backupDriveFolderName || "Selected Folder";

      const shouldBackup = !lastBackup || !lastBackup.startsWith(today);
      if (shouldBackup) {
        console.log("Triggering silent daily backup snapshot to Google Drive folder:", folderName);
        executeBackupToDrive(googleAuthToken, folderId, folderName).catch((err) => {
          console.error("Automated check failed:", err);
        });
      }
    }
  }, [googleAuthToken, companySettings?.backupDriveFolderId, companySettings?.lastBackupDate]);

  const handleUpdatePool = async () => {
    setSettingsSuccess("");
    setSettingsError("");
    const numericPool = Number(totalPoolInput);
    if (isNaN(numericPool) || numericPool <= 0) {
      setSettingsError("Please enter a valid pool amount.");
      return;
    }
    try {
      await updateCompanySettings({ totalPool: numericPool }, user.email);
      setSettingsSuccess("ESOP Liquidity Pool successfully updated!");
    } catch (err: any) {
      setSettingsError(err.message || "Failed to update ESOP Liquidity Pool.");
    }
  };

  const handleUpdateFMV = async () => {
    setSettingsSuccess("");
    setSettingsError("");
    const numericFMV = Number(currentFMVInput);
    if (isNaN(numericFMV) || numericFMV <= 0) {
      setSettingsError("Please enter a valid valuation price.");
      return;
    }
    try {
      await updateCompanySettings({ currentFMV: numericFMV }, user.email);
      setSettingsSuccess(
        "Current Market Valuation successfully broadcasted and synchronized with all active grants!",
      );
    } catch (err: any) {
      setSettingsError(err.message || "Failed to broadcast valuation update.");
    }
  };

  const insertTextAtCursor = (
    textareaId: string,
    beforeText: string,
    afterText: string = "",
  ) => {
    const textarea = document.getElementById(textareaId) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const replacement = beforeText + selectedText + afterText;

    const newValue =
      text.substring(0, start) + replacement + text.substring(end);

    if (textareaId === "settings-grant-body-header") {
      setGrantLetterBodyHeaderInput(newValue);
    } else if (textareaId === "settings-grant-body-footer") {
      setGrantLetterBodyFooterInput(newValue);
    } else if (textareaId === "settings-grant-subject") {
      setGrantLetterSubjectInput(newValue);
    }

    // Restore focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + beforeText.length,
        start + beforeText.length + selectedText.length,
      );
    }, 0);
  };

  const renderWordToolbar = (textareaId: string) => {
    const variables = [
      { name: "Stakeholder", code: "{{STAKEHOLDER_NAME}}" },
      { name: "Shares", code: "{{SHARES_QUANTITY}}" },
      { name: "Strike Price", code: "{{STRIKE_PRICE}}" },
      { name: "Schedule", code: "{{VESTING_SCHEDULE}}" },
      { name: "Company", code: "{{COMPANY_NAME}}" },
      { name: "Date", code: "{{GRANT_DATE}}" },
      { name: "Signer Name", code: "{{SIGNATORY_NAME}}" },
      { name: "Signer Role", code: "{{SIGNATORY_DESIGNATION}}" },
    ];

    return (
      <div className="flex flex-col gap-2 p-3.5 bg-slate-100 dark:bg-slate-800 rounded-t-[16px] border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => insertTextAtCursor(textareaId, "<b>", "</b>")}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-black shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-text-main select-none outline-none"
            title="Bold Text"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor(textareaId, "<i>", "</i>")}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-sans italic shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-text-main select-none outline-none"
            title="Italic Text"
          >
            I
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor(textareaId, "<u>", "</u>")}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs underline shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-text-main select-none outline-none"
            title="Underline Text"
          >
            U
          </button>
          <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-700 mx-1" />
          <button
            type="button"
            onClick={() => insertTextAtCursor(textareaId, "<h2>", "</h2>")}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-extrabold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-text-main select-none outline-none"
            title="Subheading"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor(textareaId, "<li>", "</li>")}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-text-main select-none outline-none"
            title="Bullet List Item"
          >
            • Bullets
          </button>
          <button
            type="button"
            onClick={() => insertTextAtCursor(textareaId, "<u><b>", "</b></u>")}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-black underline shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-text-main select-none outline-none"
            title="Heading Underline"
          >
            BU
          </button>
          <div className="w-[1px] h-5 bg-slate-200 dark:bg-slate-705 mx-1" />
          <button
            type="button"
            onClick={() => {
              if (textareaId === "settings-grant-body-header") {
                setGrantLetterBodyHeaderInput(
                  "On behalf of <b>{{COMPANY_NAME}}</b>, we are extremely pleased to offer you <b>{{SHARES_QUANTITY}}</b> options under the <b>{{COMPANY_NAME}} Employees’ Stock Option Plan 2020</b>.\n\nBelow are some core parameters of your grant offerings:",
                );
              } else if (textareaId === "settings-grant-body-footer") {
                setGrantLetterBodyFooterInput(
                  "This official offer and your participation in the plan are subject to approval by <b>{{SIGNATORY_NAME}}</b> ({{SIGNATORY_DESIGNATION}}) and the Board.\n\nBy e-signing this document directly below, you agree to these corporate guidelines.",
                );
              }
            }}
            className="px-3 py-1.5 bg-brand-primary/10 hover:bg-brand-primary/15 text-brand-primary rounded-lg text-[10px] font-black tracking-tight select-none cursor-pointer outline-none transition-all"
            title="Import Standard MS Word Corporate Template Layout"
          >
            ⚡ MS Word Template
          </button>
        </div>

        <div className="flex flex-col gap-1.5 mt-1.5 pt-1.5 border-t border-slate-200/50 dark:border-slate-700/50">
          <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider">
            Word Merge Fields (Click to Insert at Cursor):
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {variables.map((v, i) => (
              <button
                key={i}
                type="button"
                onClick={() => insertTextAtCursor(textareaId, v.code)}
                className="px-2 py-1 bg-white hover:bg-brand-primary/5 dark:bg-slate-900 dark:hover:bg-brand-primary/10 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-mono font-bold text-brand-primary cursor-pointer active:scale-95 transition-all select-none outline-none"
                title={`Insert ${v.name} variable`}
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const handleSyncGoogleDoc = async () => {
    setSettingsSuccess("");
    setSettingsError("");
    setIsSyncingGoogleDoc(true);
    try {
      if (!googleDocUrlInput) {
        throw new Error("Google Docs text URL or sharing URL is required.");
      }

      const response = await fetch("/api/fetch-google-doc", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: googleDocUrlInput }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          result.error ||
            "Failed to retrieve document content from Google Docs.",
        );
      }

      let fetchedText = result.text || "";

      // Ensure the table insertion placeholder is parsed properly
      if (
        fetchedText.includes(
          "Please find below the vesting schedule corresponding to this grant:",
        )
      ) {
        if (!fetchedText.includes("{{VESTING_SCHEDULE_TABLE}}")) {
          fetchedText = fetchedText.replace(
            "Please find below the vesting schedule corresponding to this grant:",
            "Please find below the vesting schedule corresponding to this grant:\n\n{{VESTING_SCHEDULE_TABLE}}",
          );
        }
      }

      // Convert critical demo values into global ESOP placeholders
      let parametrizedText = fetchedText
        .replace(/Sanju T/g, "{{STAKEHOLDER_NAME}}")
        .replace(/Emp ID - TE-1259/g, "Emp ID - {{EMPLOYEE_ID}}")
        .replace(/TE-1259/g, "{{EMPLOYEE_ID}}")
        .replace(/April 01, 2025/g, "{{GRANT_DATE}}")
        .replace(/2\.11/g, "{{SHARES_QUANTITY}}")
        .replace(/INR 1\/- \(Indian Rupees One only\)/g, "{{STRIKE_PRICE}}")
        .replace(/INR 1\/- \(Indian Rupee One only\)/g, "{{STRIKE_PRICE}}")
        .replace(/U62099KA2020PTC135305/g, "{{COMPANY_CIN}}");

      // Save into persistence settings
      await updateCompanySettings(
        {
          googleDocUrl: googleDocUrlInput,
          grantLetterBodyHeader: parametrizedText,
          grantLetterBodyFooter: "", // clear footer as the document holds everything
          grantLetterCompanyName: "Teachmint Technologies Private Limited",
          grantLetterCompanyAddress:
            "5th Floor, North Wing, SJR The HUB, Survey No. 8/2 & 9, Sarjapur Road, Bengaluru, Karnataka - 560103",
          grantLetterCompanyCIN: "U62099KA2020PTC135305",
        },
        user.email,
      );

      setGrantLetterBodyHeaderInput(parametrizedText);
      setGrantLetterBodyFooterInput("");
      setSettingsSuccess(
        "ESOP Grant Letter Template successfully integrated & synchronized from the live Google Doc!",
      );
      await createAuditLog(
        "Sync Grant Letter via Google Doc",
        `Admin synchronized live layout from Google Doc URL: ${googleDocUrlInput}`,
        user.email,
      );
    } catch (err: any) {
      setSettingsError(
        err.message ||
          "Failed to synchronize custom grant template from Google Docs.",
      );
    } finally {
      setIsSyncingGoogleDoc(false);
    }
  };

  const handleUpdateTemplate = async () => {
    setSettingsSuccess("");
    setSettingsError("");
    try {
      await updateCompanySettings(
        {
          grantLetterSubject: grantLetterSubjectInput,
          grantLetterCompanyName: grantLetterCompanyNameInput,
          grantLetterCompanyAddress: grantLetterCompanyAddressInput,
          grantLetterCompanyCIN: grantLetterCompanyCINInput,
          grantLetterBodyHeader: grantLetterBodyHeaderInput,
          grantLetterBodyFooter: grantLetterBodyFooterInput,
        },
        user.email,
      );
      setSettingsSuccess("ESOP Grant Letter Template successfully updated!");
      await createAuditLog(
        "Update Grant Letter Template",
        "Admin modified parameters of the global ESOP Offering Grant Letter layout.",
        user.email,
      );
    } catch (err: any) {
      setSettingsError(
        err.message || "Failed to update custom grant template.",
      );
    }
  };

  const handleUpdateSignatory = async (provisionAsAdmin: boolean = false) => {
    setSettingsSuccess("");
    setSettingsError("");
    if (
      !signatoryNameInput ||
      !signatoryEmailInput ||
      !signatoryDesignationInput
    ) {
      setSettingsError("All signatory informational fields are required.");
      return;
    }
    try {
      await updateCompanySettings(
        {
          signatoryName: signatoryNameInput,
          signatoryEmail: signatoryEmailInput,
          signatoryDesignation: signatoryDesignationInput,
        },
        user.email,
      );

      let logDetail = `Updated corporate Authorised Signatory details: ${signatoryNameInput} (${signatoryDesignationInput}).`;

      if (provisionAsAdmin) {
        // Also provision this signatory as a Platform Admin so they can log in
        const existingAdmin = adminsList.find(
          (a) => a.email.toLowerCase() === signatoryEmailInput.toLowerCase(),
        );
        if (!existingAdmin) {
          await createAdmin(
            {
              email: signatoryEmailInput,
              password: "signatory123",
              name: signatoryNameInput,
              role: "admin",
            },
            signatoryEmailInput.toLowerCase().replace(/[^a-z0-9]/g, "_"),
            user.email,
          );
          logDetail +=
            " Also provisioned platform administrator account for the signatory with password 'signatory123'.";
        } else {
          logDetail +=
            " Signatory already had an active administrator profile.";
        }
      }

      setSettingsSuccess("Authorised Signatory settings updated successfully!");
      await createAuditLog(
        "Update Authorised Signatory",
        logDetail,
        user.email,
      );
    } catch (err: any) {
      setSettingsError(
        err.message || "Failed to edit Authorized Signatory configuration.",
      );
    }
  };

  const handleUpdatePolicy = async (fileName: string, fileDataUrl: string) => {
    setSettingsSuccess("");
    setSettingsError("");
    try {
      if (fileDataUrl && fileDataUrl !== "") {
        setSettingsSuccess("Initializing secure chunk-based upload...");
        await uploadChunkedPolicy(
          fileName,
          fileDataUrl,
          user.email,
          (percent) => {
            setSettingsSuccess(
              `Uploading policy document ... ${percent}% completed`,
            );
          },
        );
        setDefaultEsopPolicyFileNameInput(fileName);
        setDefaultEsopPolicyFileUrlInput("/api/settings/policy-download");
        setSettingsSuccess(
          `Global ESOP Policy Document (${fileName}) uploaded and published successfully for all employees!`,
        );
      } else {
        await updateCompanySettings(
          {
            defaultEsopPolicyFileName: fileName,
            defaultEsopPolicyFileUrl: "",
          },
          user.email,
        );
        setDefaultEsopPolicyFileNameInput(fileName);
        setDefaultEsopPolicyFileUrlInput("");
        setSettingsSuccess(
          `Global ESOP Policy reset to default blueprint template successfully!`,
        );
        await createAuditLog(
          "Update Global Policy",
          `Admin reset the global ESOP policy back to default blueprint template.`,
          user.email,
        );
      }
    } catch (err: any) {
      setSettingsError(err.message || "Failed to publish custom ESOP policy.");
    }
  };

  const buildRawEmail = (to: string, from: string, subject: string, bodyHtml: string) => {
    const mailLines = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=utf-8`,
      ``,
      bodyHtml
    ];
    const email = mailLines.join("\r\n");
    // Secure Base64 encode supporting multi-byte unicode strings safely in standard browsers
    return btoa(unescape(encodeURIComponent(email)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  };

  const sendEmailWithOptionalGmail = async (
    recipient: string,
    name: string,
    role: "employee" | "admin",
    subject: string,
    body: string,
    password?: string
  ) => {
    let sentReal = false;
    if (googleAuthToken) {
      try {
        const fromAddress = googleUserEmail || companySettings.senderEmailId || user.email;
        const rawEmail = buildRawEmail(recipient, fromAddress, subject, body);
        const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${googleAuthToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ raw: rawEmail })
        });
        if (res.ok) {
          sentReal = true;
          console.log(`Dispatched real email to ${recipient} via Gmail API.`);
        } else {
          const errText = await res.text();
          console.warn("Gmail send API failed, using standard DB logging as backup fallback:", errText);
        }
      } catch (err) {
        console.error("Gmail background proxy failed:", err);
      }
    }

    // Standard database system log
    await sendSystemEmail({
      recipient,
      name,
      role,
      subject,
      body,
      password,
      sender: companySettings.senderEmailId || googleUserEmail || "System alerts"
    });

    return sentReal;
  };

  const fetchFolders = async (token: string) => {
    setLoadingFolders(true);
    try {
      const res = await fetch(
        "https://www.googleapis.com/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.folder%27%20and%20trashed%3Dfalse&fields=files(id,name)",
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      if (res.ok) {
        const data = await res.json();
        setFolders(data.files || []);
      }
    } catch (err) {
      console.error("Error loading folders from Drive API:", err);
    } finally {
      setLoadingFolders(false);
    }
  };

  const handleConnectGoogleWorkspace = async () => {
    try {
      setBackupError(null);
      setBackupSuccess(null);
      const provider = new GoogleAuthProvider();
      provider.addScope("https://www.googleapis.com/auth/gmail.send");
      provider.addScope("https://www.googleapis.com/auth/drive.file");
      provider.addScope("https://www.googleapis.com/auth/drive.metadata.readonly");

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      if (token) {
        setGoogleAuthToken(token);
        setGoogleUserEmail(result.user.email);
        setBackupSuccess("Google Workspace connected successfully!");
        fetchFolders(token);
      } else {
        setBackupError("Could not obtain access privileges from sign-in outcome.");
      }
    } catch (err: any) {
      console.error(err);
      setBackupError(`Google login authorization failed: ${err.message || err}`);
    }
  };

  const handleCreateBackupFolder = async () => {
    if (!googleAuthToken) return;
    try {
      setBackupError(null);
      setBackupSuccess("Creating folder 'TeachVest Backups'...");
      const res = await fetch("https://www.googleapis.com/drive/v3/files", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${googleAuthToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: "TeachVest Backups",
          mimeType: "application/vnd.google-apps.folder"
        })
      });
      if (res.ok) {
        const folder = await res.json();
        setBackupSuccess("Backup folder created successfully!");
        await fetchFolders(googleAuthToken);
        await updateCompanySettings({
          backupDriveFolderId: folder.id,
          backupDriveFolderName: "TeachVest Backups"
        }, user.email);
      } else {
        const errText = await res.text();
        setBackupError(`Failed to create Drive folder: ${errText}`);
      }
    } catch (err: any) {
      console.error(err);
      setBackupError(`Folder creation error: ${err.message}`);
    }
  };

  const executeBackupToDrive = async (token: string, folderId: string, folderName: string) => {
    setIsPerformingBackup(true);
    setBackupSuccess(null);
    setBackupError(null);
    try {
      const backupPayload = {
        backupTimestamp: new Date().toISOString(),
        companySettings,
        employees,
        sentEmails: emails,
        auditLogs
      };

      const content = JSON.stringify(backupPayload, null, 2);
      const today = new Date().toISOString().split("T")[0];
      const filename = `TeachVest_Backup_${today}.json`;

      const metaRes = await fetch("https://www.googleapis.com/drive/v3/files", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: filename,
          parents: [folderId],
          mimeType: "application/json"
        })
      });

      if (!metaRes.ok) {
        const errText = await metaRes.text();
        throw new Error(`Failed to initialize backup manifest: ${errText}`);
      }

      const fileInfo = await metaRes.json();
      if (!fileInfo || !fileInfo.id) {
        throw new Error("Invalid descriptor returned by Drive client.");
      }

      const mediaRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileInfo.id}?uploadType=media`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: content
      });

      if (!mediaRes.ok) {
        const errText = await mediaRes.text();
        throw new Error(`Drive write aborted: ${errText}`);
      }

      await updateCompanySettings({
        lastBackupDate: new Date().toISOString()
      }, user.email);

      await createAuditLog(
        "Google Drive Backup",
        `Created daily DB backup manifest "${filename}" inside Google Drive folder "${folderName}"`,
        user.email
      );

      setBackupSuccess(`Backup snapshot completed! File "${filename}" saved successfully standard in "${folderName}".`);
      return true;
    } catch (err: any) {
      console.error(err);
      setBackupError(`Backup session failed: ${err.message || err}`);
      return false;
    } finally {
      setIsPerformingBackup(false);
    }
  };

  const handleTriggerIndividualEmail = async (
    emp: Employee,
    emailType: "welcome" | "esign_reminder",
  ) => {
    try {
      let subject = "";
      let body = "";

      const grant = emp.grants?.[0];
      const grantId = grant?.id || "N/A";
      const totalSharesFormatted = grant
        ? grant.totalShares.toLocaleString()
        : "0";

      if (emailType === "welcome") {
        subject = `TeachVest Invitation: Access Your Employee ESOP Dashboard`;
        body = `
          <div style="font-family: sans-serif; padding: 24px; color: #1e293b; background: #eef2ff; border-radius: 12px; max-width: 600px; border: 1px solid #e0e7ff;">
            <h2 style="color: #0a52f7; margin-bottom: 8px; font-weight: 800; letter-spacing: -0.02em;">Welcome to TeachVest, ${emp.name}!</h2>
            <p style="font-size: 14px; line-height: 1.5; color: #475569;">An official employee profile has been created for you on the TeachVest platform by your company administrator.</p>
            
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
               <p style="margin: 0; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.1em;">Your Login Credentials</p>
               <div style="height: 1px; background: #f1f5f9; margin: 8px 0;"></div>
               <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Login Username:</strong> ${emp.email}</p>
               <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Temporary Password:</strong> ${emp.password || "login123"}</p>
               <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Employee Designation:</strong> ${emp.designation} (${emp.department})</p>
            </div>

            <p style="font-size: 14px; line-height: 1.5; color: #475569;">To securely inspect, monitor and manage your vesting ESOP shares, please log in to your employee dashboard:</p>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="/?role=employee&email=${encodeURIComponent(emp.email)}" style="display: inline-block; background: #0a52f7; color: white; padding: 14px 28px; border-radius: 12px; font-weight: bold; text-decoration: none; font-size: 14px; box-shadow: 0 10px 15px -3px rgba(10, 82, 247, 0.2);">Enter TeachVest Portal</a>
            </div>
          </div>
        `.trim();
      } else {
        subject = `Urgent Action Required: Teachmint ESOP Grant E-Signature Request`;
        body = `
          <div style="font-family: sans-serif; padding: 24px; color: #1e293b; background: #fffbeb; border-radius: 12px; max-width: 600px; border: 1px solid #fef3c7;">
            <h2 style="color: #b45309; margin-bottom: 8px; font-weight: 800; letter-spacing: -0.02em;">Digital Signature Outstanding</h2>
            <p style="font-size: 14px; line-height: 1.5; color: #475569;">Hello ${emp.name}, your ESOP Options Allocation Offer <strong>${grantId}</strong> representing <strong>${totalSharesFormatted} Options</strong> is awaiting your e-signature execution.</p>
            
            <div style="background: white; border: 1px solid #fef3c7; border-radius: 12px; padding: 18px; margin: 20px 0;">
              <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Grant Reference:</strong> ${grantId}</p>
              <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Strike Option Price:</strong> INR ${grant?.strikePrice || 10}</p>
              <p style="margin: 6px 0; font-size: 14px; color: #334155;"><strong>Sign-off Status:</strong> Pending Stakeholder Signature</p>
            </div>

            <p style="font-size: 14px; line-height: 1.5; color: #475569;">Please log in securely to complete signing and execute your digital ESOP Grant Certificate contract:</p>
            
            <div style="text-align: center; margin: 25px 0;">
              <a href="/?role=employee&email=${encodeURIComponent(emp.email)}" style="display: inline-block; background: #0a52f7; color: white; padding: 14px 28px; border-radius: 12px; font-weight: bold; text-decoration: none; font-size: 14px; box-shadow: 0 10px 15px -3px rgba(10, 82, 247, 0.2);">Review & E-Sign Offer Letter</a>
            </div>
          </div>
        `.trim();
      }

      await sendEmailWithOptionalGmail(
        emp.email,
        emp.name,
        "employee",
        subject,
        body,
        emp.password
      );

      await createAuditLog(
        "Manual Email Trigger",
        `Admin manually dispatched individual ${emailType === "welcome" ? "Credential Welcome" : "E-Sign Outstanding Reminder"} email to ${emp.name} (${emp.email}).`,
        user.email,
      );

      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const [bulkDispatching, setBulkDispatching] = useState(false);
  const [bulkDispatchSuccess, setBulkDispatchSuccess] = useState<string | null>(
    null,
  );

  const handleBulkDispatchEmails = async (
    emailType: "welcome" | "esign_reminder",
  ) => {
    setBulkDispatching(true);
    setBulkDispatchSuccess(null);
    let successCount = 0;

    // Choose employees that are applicable (welcome to everyone, remainder to those that haven't signed yet)
    const targets = employees.filter((emp) => {
      if (emailType === "welcome") return true;
      // Remainder only to those whose grant status is not fully signed
      const grant = emp.grants?.[0];
      return grant && grant.workflowStatus === "Pending Employee Signature";
    });

    for (const emp of targets) {
      const ok = await handleTriggerIndividualEmail(emp, emailType);
      if (ok) successCount++;
    }

    setBulkDispatchSuccess(
      `Successfully bulk-dispatched ${successCount} ${emailType === "welcome" ? "Welcome" : "ESOP E-Signature Reminder"} notifications!`,
    );
    await createAuditLog(
      "Bulk Email Broadcast",
      `Dispatched bulk campaigns of ${emailType} alert notifications to ${successCount} stakeholders.`,
      user.email,
    );
    setBulkDispatching(false);
    setTimeout(() => setBulkDispatchSuccess(null), 5000);
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

  const departments = [
    "All",
    ...Array.from(new Set(employees.map((e) => e.department))),
  ];

  const filteredEmployees = employees.filter(
    (e) =>
      (deptFilter === "All" || e.department === deptFilter) &&
      (e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.email.toLowerCase().includes(search.toLowerCase())),
  );

  const stats = {
    totalEmployees: employees.length,
    totalPortfolio: employees.reduce(
      (s, e) =>
        s +
        calcPortfolioValue(
          e.grants,
          companySettings.currentFMV,
          e.joinDate,
          e.cliffType,
          companySettings.roundingMode,
        ),
      0,
    ),
    totalGranted: employees.reduce((s, e) => s + calcTotalGranted(e.grants), 0),
    totalVested: employees.reduce(
      (s, e) =>
        s +
        calcTotalVested(
          e.grants,
          e.joinDate,
          e.cliffType,
          companySettings.roundingMode,
        ),
      0,
    ),
    totalExercised: employees.reduce(
      (s, e) => s + e.grants.reduce((sum, g) => sum + g.exercisedShares, 0),
      0,
    ),
  };

  const handleExportCSV = () => {
    const rows: any[] = [];

    employees.forEach((e) => {
      // If employee has grants, export a row for each grant
      if (e.grants && e.grants.length > 0) {
        e.grants.forEach((g) => {
          // get custom fields value of options granted
          const valField = e.customFields?.find(
            (f) => f.key === "Value of Options Granted",
          )?.value;
          const valOpts = valField
            ? Number(valField)
            : g.totalShares * (companySettings.currentFMV || 210);

          // Get or generate vesting schedule
          let schedule: any[] = [];
          if (g.customVestingEvents && g.customVestingEvents.length > 0) {
            schedule = g.customVestingEvents.map((ev) => ({
              date: ev.date,
              toVest: ev.shares,
            }));
          } else {
            // we import helper function to run schedule
            schedule = generateVestingSchedule(
              e.joinDate || g.grantDate,
              g.totalShares,
              e.cliffType,
              undefined,
              g,
              companySettings.roundingMode,
            );
          }

          const exportRow: any = {
            "Employee-ID": e.id,
            "Employee Name": e.name,
            "Employee Email": e.email,
            Department: e.department,
            Designation: e.designation,
            "Joining Date": e.joinDate,
            "Grant ID": g.id,
            "Grant Date": g.grantDate,
            "Value of Options Granted": valOpts,
            "Total Options": g.totalShares,
          };

          const vestingSuffixes = [
            "1st",
            "2nd",
            "3rd",
            "4th",
            "5th",
            "6th",
            "7th",
            "8th",
            "9th",
            "10th",
            "11th",
            "12th",
            "13th",
          ];

          vestingSuffixes.forEach((suffix, idx) => {
            const dateKey =
              suffix === "9th"
                ? "Date of 9thVesting"
                : `Date of ${suffix} Vesting`;
            const optionsKey = `Options - ${suffix} Vesting`;

            exportRow[dateKey] = schedule[idx]?.date || "";
            exportRow[optionsKey] =
              schedule[idx]?.toVest !== undefined ? schedule[idx]?.toVest : "";
          });

          rows.push(exportRow);
        });
      } else {
        // No grants, export metadata row only
        const exportRow: any = {
          "Employee-ID": e.id,
          "Employee Name": e.name,
          "Employee Email": e.email,
          Department: e.department,
          Designation: e.designation,
          "Joining Date": e.joinDate,
          "Grant ID": "",
          "Grant Date": "",
          "Value of Options Granted": "",
          "Total Options": "",
        };

        const vestingSuffixes = [
          "1st",
          "2nd",
          "3rd",
          "4th",
          "5th",
          "6th",
          "7th",
          "8th",
          "9th",
          "10th",
          "11th",
          "12th",
          "13th",
        ];

        vestingSuffixes.forEach((suffix) => {
          const dateKey =
            suffix === "9th"
              ? "Date of 9thVesting"
              : `Date of ${suffix} Vesting`;
          const optionsKey = `Options - ${suffix} Vesting`;

          exportRow[dateKey] = "";
          exportRow[optionsKey] = "";
        });

        rows.push(exportRow);
      }
    });

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `TeachVest_Employee_Holders_Export_${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
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
        <div className="p-8 pb-10 pb-6">
          <div className="flex items-center gap-3 group cursor-pointer">
            <motion.div
              whileHover={{ rotate: 5, scale: 1.05 }}
              className="w-12 h-12 rounded-2xl bg-white overflow-hidden shadow-xl flex items-center justify-center flex-shrink-0"
            >
              <img
                src={logoUrl}
                alt="TeachVest"
                className="w-full h-full object-contain p-1"
              />
            </motion.div>
            <motion.div
              whileHover={{ rotate: -2, scale: 1.03 }}
              className="h-12 px-4 rounded-2xl bg-white flex items-center justify-center shadow-xl overflow-hidden flex-shrink-0 border border-slate-100 dark:border-slate-200/10"
            >
              <img
                src={otherLogoUrl}
                alt="TeachVest"
                className="h-6 object-contain"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setSelectedEmployee(null);
                setSearch("");
                setDeptFilter("All");
              }}
              className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all group ${
                activeTab === item.id
                  ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/25"
                  : "text-text-muted hover:text-brand-primary hover:bg-brand-primary/5 dark:hover:bg-brand-primary/10"
              }`}
            >
              <item.icon
                size={20}
                className={
                  activeTab === item.id
                    ? "text-white"
                    : "text-text-muted group-hover:text-brand-primary"
                }
              />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-50 dark:border-slate-800 bg-bg-base/50">
          <div className="flex items-center gap-4 mb-4 select-none">
            <Avatar name={user.name} size={40} />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold truncate text-text-main leading-tight">
                {user.name}
              </span>
              <span className="text-[10px] text-brand-primary font-bold uppercase tracking-widest">
                {user.role}
              </span>
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
            {selectedEmployee
              ? `Profile: ${selectedEmployee.name}`
              : navItems.find((i) => i.id === activeTab)?.label}
          </h2>

          <div className="flex items-center gap-4"></div>
        </header>

        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + (selectedEmployee?.id || "")}
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
                      <h3 className="text-xl font-extrabold text-text-main">
                        Top TeachVest Stakeholders
                      </h3>
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
                            {[
                              "Employee",
                              "Identity",
                              "Equity Valuation",
                              "Grant Allocation",
                              "Vesting Status",
                              "",
                            ].map((h) => (
                              <th
                                key={h}
                                className="px-8 py-5 text-[10px] font-bold text-text-muted uppercase tracking-widest"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                          {employees.slice(0, 5).map((e) => (
                            <tr
                              key={e.id}
                              className="group hover:bg-bg-base transition-colors"
                            >
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-3">
                                  <Avatar name={e.name} size={40} />
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold text-text-main leading-tight">
                                      {e.name}
                                    </span>
                                    <span className="text-xs text-text-muted font-medium">
                                      {e.email}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-text-main uppercase tracking-tighter">
                                    {e.department}
                                  </span>
                                  <span className="text-[11px] text-text-muted">
                                    {e.designation}
                                  </span>
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <span className="text-sm font-bold text-text-main font-mono">
                                  {fmtCurrency(
                                    calcPortfolioValue(
                                      e.grants,
                                      companySettings.currentFMV,
                                      e.joinDate,
                                      e.cliffType,
                                      companySettings.roundingMode,
                                    ),
                                  )}
                                </span>
                              </td>
                              <td className="px-8 py-6">
                                <span className="text-sm font-bold text-text-main font-mono">
                                  {fmt(calcTotalGranted(e.grants))}
                                </span>
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-brand-primary transition-all duration-500"
                                      style={{
                                        width: `${pct(calcTotalVested(e.grants, e.joinDate, e.cliffType, companySettings.roundingMode), calcTotalGranted(e.grants))}%`,
                                      }}
                                    />
                                  </div>
                                  <span className="text-xs font-bold text-text-main">
                                    {pct(
                                      calcTotalVested(
                                        e.grants,
                                        e.joinDate,
                                        e.cliffType,
                                        companySettings.roundingMode,
                                      ),
                                      calcTotalGranted(e.grants),
                                    )}
                                    %
                                  </span>
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
                          {departments.map((d) => (
                            <option key={d} className="bg-bg-surface dark:bg-slate-900 text-text-main">{d}</option>
                          ))}
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
                    {filteredEmployees.map((e) => (
                      <motion.div
                        layout
                        key={e.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-bg-surface border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-sm hover:shadow-[0_20px_60px_-15px_rgba(0,82,255,0.08)] hover:border-brand-primary/30 transition-all cursor-pointer group relative overflow-hidden"
                        onClick={() => setSelectedEmployee(e)}
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-lg">
                            <ChevronRight size={16} />
                          </div>
                        </div>

                        <div className="flex justify-between items-start mb-8">
                          <Avatar name={e.name} size={56} />
                          <div className="flex flex-col items-end gap-1.5">
                            <div className="text-[10px] font-bold bg-brand-primary/10 text-brand-primary px-3 py-1.5 rounded-xl uppercase tracking-widest">
                              {e.id}
                            </div>
                            {e.disabled && (
                              <span className="text-[9px] font-extrabold bg-red-500/15 text-red-600 dark:text-red-400 px-2.5 py-1 rounded-lg uppercase tracking-wide">
                                Access Blocked
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mb-8">
                          <h4 className="text-xl font-extrabold text-text-main leading-tight mb-1 group-hover:text-brand-primary transition-colors tracking-tight">
                            {e.name}
                          </h4>
                          <p className="text-sm text-text-muted font-medium">
                            {e.designation}
                          </p>
                          <div className="flex items-center gap-1 mt-3 px-3 py-1 bg-bg-base dark:bg-slate-800 rounded-lg w-fit text-xs font-bold text-brand-primary transition-colors">
                            <Building size={12} className="mr-1" />
                            {e.department}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pb-8 mb-8 border-b border-slate-50 dark:border-slate-800 font-mono">
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1">
                              Allocated
                            </span>
                            <span className="text-base font-bold text-text-main">
                              {fmt(calcTotalGranted(e.grants))}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-widest mb-1">
                              Portfolio
                            </span>
                            <span className="text-base font-bold text-emerald-600 transition-colors">
                              {fmtCurrency(
                                calcPortfolioValue(
                                  e.grants,
                                  companySettings.currentFMV,
                                  e.joinDate,
                                  e.cliffType,
                                  companySettings.roundingMode,
                                ),
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest">
                          <span className="text-text-muted">
                            Vesting Status
                          </span>
                          <span className="text-brand-primary">
                            {pct(
                              calcTotalVested(
                                e.grants,
                                e.joinDate,
                                e.cliffType,
                                companySettings.roundingMode,
                              ),
                              calcTotalGranted(e.grants),
                            )}
                            %
                          </span>
                        </div>
                        <div className="w-full h-2 bg-bg-base dark:bg-slate-800 rounded-full mt-3 overflow-hidden">
                          <div
                            className="h-full bg-brand-primary rounded-full transition-all duration-700 ease-out shadow-[0_0_12px_rgba(0,82,255,0.4)]"
                            style={{
                              width: `${pct(calcTotalVested(e.grants, e.joinDate, e.cliffType, companySettings.roundingMode), calcTotalGranted(e.grants))}%`,
                            }}
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
                        onClick={() =>
                          handleDeleteEmployee(selectedEmployee.id)
                        }
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
                          <h1 className="text-5xl font-extrabold text-text-main tracking-tighter leading-none">
                            {selectedEmployee.name}
                          </h1>
                          <span className="bg-brand-primary text-white px-4 py-1.5 rounded-2xl text-[10px] font-extrabold uppercase tracking-[0.2em]">
                            {selectedEmployee.id}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-y-3 gap-x-8 text-sm font-bold text-text-muted mb-8 uppercase tracking-widest">
                          <span className="flex items-center gap-2">
                            <Briefcase
                              size={18}
                              className="text-brand-primary"
                            />
                            {selectedEmployee.designation} •{" "}
                            {selectedEmployee.department}
                          </span>
                          <span className="flex items-center gap-2">
                            <Calendar
                              size={18}
                              className="text-brand-primary"
                            />
                            Started {fmtDate(selectedEmployee.joinDate)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-6">
                          <div className="px-8 py-6 bg-bg-base dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 min-w-48 shadow-sm flex-1">
                            <div className="text-[10px] font-extrabold text-brand-primary uppercase tracking-[0.15em] mb-2">
                              Net Portfolio (₹)
                            </div>
                            <div className="text-3xl font-extrabold text-emerald-600 font-mono tracking-tighter">
                              {fmtCurrency(
                                calcPortfolioValue(
                                  selectedEmployee.grants,
                                  companySettings.currentFMV,
                                  selectedEmployee.joinDate,
                                  selectedEmployee.cliffType,
                                  companySettings.roundingMode,
                                ),
                              )}
                            </div>
                          </div>
                          <div className="px-8 py-6 bg-bg-base dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 min-w-48 shadow-sm flex-1">
                            <div className="text-[10px] font-extrabold text-brand-primary uppercase tracking-[0.15em] mb-2">
                              Potential Gain
                            </div>
                            <div className="text-3xl font-extrabold text-brand-primary font-mono tracking-tighter">
                              {fmtCurrency(
                                calcPotentialGain(
                                  selectedEmployee.grants,
                                  companySettings.currentFMV,
                                  selectedEmployee.joinDate,
                                  selectedEmployee.cliffType,
                                  companySettings.roundingMode,
                                ),
                              )}
                            </div>
                          </div>
                          <div className="px-8 py-6 bg-bg-base dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 min-w-[240px] shadow-sm flex-1 flex flex-col justify-between">
                            <div className="text-[10px] font-extrabold text-brand-primary uppercase tracking-[0.15em] mb-2">
                              Login Access Control
                            </div>
                            <div>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const newDisabled =
                                    !selectedEmployee.disabled;
                                  const updated = {
                                    ...selectedEmployee,
                                    disabled: newDisabled,
                                  };
                                  setSelectedEmployee(updated);
                                  setEmployees((prev) =>
                                    prev.map((emp) =>
                                      emp.id === selectedEmployee.id
                                        ? updated
                                        : emp,
                                    ),
                                  );
                                  await updateEmployeeData(
                                    selectedEmployee.id,
                                    { disabled: newDisabled },
                                    user.email,
                                  );
                                }}
                                className={`w-full py-2.5 rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 border select-none ${
                                  !selectedEmployee.disabled
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                                    : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 hover:bg-red-500/20"
                                }`}
                              >
                                <span
                                  className={`w-2 h-2 rounded-full ${!selectedEmployee.disabled ? "bg-emerald-500" : "bg-red-500 animate-pulse"}`}
                                />
                                {!selectedEmployee.disabled
                                  ? "Enabled (Allow Access)"
                                  : "Disabled (Blocked)"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sub-tabs bar */}
                    <div className="flex border-b border-slate-100 dark:border-slate-800 mb-8 overflow-x-auto whitespace-nowrap">
                      {[
                        {
                          id: "profile" as const,
                          label: "Profile",
                          icon: User,
                        },
                        {
                          id: "grants" as const,
                          label: "Grant Details",
                          icon: Gift,
                        },
                        {
                          id: "documents" as const,
                          label: "Official Documents",
                          icon: FileText,
                        },
                      ].map((sub) => {
                        const Icon = sub.icon;
                        const isCurrent = employeeSubTab === sub.id;
                        return (
                          <button
                            key={sub.id}
                            onClick={() => setEmployeeSubTab(sub.id)}
                            className={`flex items-center gap-2.5 px-6 py-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all duration-150 -mb-[1px] select-none outline-none ${
                              isCurrent
                                ? "border-brand-primary text-brand-primary bg-brand-primary/5 font-extrabold"
                                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900/40"
                            }`}
                          >
                            <Icon size={14} />
                            {sub.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="space-y-8">
                      {employeeSubTab === "profile" && (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-extrabold text-brand-primary uppercase tracking-widest">
                              Stakeholder Profile
                            </h4>
                            <span className="text-xs text-text-muted font-mono bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-lg">
                              Last Active Sync: Live
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Card 1: Account credentials & Official parameters */}
                            <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                              <h5 className="text-[10px] font-black uppercase tracking-wider text-brand-primary">
                                Corporate Position
                              </h5>
                              <div className="space-y-3 text-xs font-bold">
                                <div className="flex justify-between border-b border-dashed border-slate-200/50 dark:border-slate-800 pb-1.5">
                                  <span className="text-text-muted">
                                    Employee ID
                                  </span>
                                  <span className="text-text-main font-mono">
                                    {selectedEmployee.id}
                                  </span>
                                </div>
                                <div className="flex justify-between border-b border-dashed border-slate-200/50 dark:border-slate-800 pb-1.5">
                                  <span className="text-text-muted">
                                    Designation
                                  </span>
                                  <span className="text-text-main">
                                    {selectedEmployee.designation}
                                  </span>
                                </div>
                                <div className="flex justify-between border-b border-dashed border-slate-200/50 dark:border-slate-800 pb-1.5">
                                  <span className="text-text-muted">
                                    Department
                                  </span>
                                  <span className="text-text-main">
                                    {selectedEmployee.department}
                                  </span>
                                </div>
                                <div className="flex justify-between pb-0.5">
                                  <span className="text-text-muted">
                                    Start Date
                                  </span>
                                  <span className="text-text-main font-mono">
                                    {fmtDate(selectedEmployee.joinDate)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Card 2: Personal Contact Information */}
                            <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                              <h5 className="text-[10px] font-black uppercase tracking-wider text-brand-primary">
                                Secure Contact Details
                              </h5>
                              <div className="space-y-3 text-xs font-bold">
                                <div className="flex justify-between border-b border-dashed border-slate-200/50 dark:border-slate-800 pb-1.5 flex-wrap gap-1">
                                  <span className="text-text-muted">
                                    Email address
                                  </span>
                                  <span className="text-text-main truncate max-w-[155px]">
                                    {selectedEmployee.email}
                                  </span>
                                </div>
                                <div className="flex justify-between border-b border-dashed border-slate-200/50 dark:border-slate-800 pb-1.5">
                                  <span className="text-text-muted">
                                    Phone Contact
                                  </span>
                                  <span className="text-text-main font-mono">
                                    {selectedEmployee.mobile || "N/A"}
                                  </span>
                                </div>
                                <div className="flex justify-between border-b border-dashed border-slate-200/50 dark:border-slate-800 pb-1.5">
                                  <span className="text-text-muted">
                                    Password Lock
                                  </span>
                                  <span className="text-brand-primary flex items-center gap-1">
                                    <Lock size={12} />
                                    ••••••••
                                  </span>
                                </div>
                                <div className="flex justify-between pb-0.5">
                                  <span className="text-text-muted">
                                    Vesting Cliff Option
                                  </span>
                                  <span className="text-text-main font-bold text-amber-500">
                                    {selectedEmployee.cliffType || "Annually"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Card 3: Legal & Nominal Setup */}
                            <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                              <h5 className="text-[10px] font-black uppercase tracking-wider text-brand-primary">
                                Nominee Designation
                              </h5>
                              <div className="space-y-3 text-xs font-bold">
                                <div className="flex justify-between border-b border-dashed border-slate-200/50 dark:border-slate-800 pb-1.5">
                                  <span className="text-text-muted">
                                    Nominee Name
                                  </span>
                                  <span className="text-text-main">
                                    {selectedEmployee.nomineeName ||
                                      "Not Assigned"}
                                  </span>
                                </div>
                                <div className="flex justify-between border-b border-dashed border-slate-200/50 dark:border-slate-800 pb-1.5">
                                  <span className="text-text-muted">
                                    Nominee Relation
                                  </span>
                                  <span className="text-text-main">
                                    {selectedEmployee.nomineeRelation || "N/A"}
                                  </span>
                                </div>
                                <div className="flex justify-between pb-0.5">
                                  <span className="text-text-muted">
                                    Nominee Primary Contact
                                  </span>
                                  <span className="text-text-main font-mono">
                                    {selectedEmployee.nomineeContact || "N/A"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Profile sub tab content ends */}
                        </div>
                      )}

                      {employeeSubTab === "grants" && (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-extrabold text-brand-primary uppercase tracking-widest">
                              Equity Allocations
                            </h4>
                            <button
                              onClick={() => setIsGrantsModalOpen(true)}
                              className="px-4 py-2 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                            >
                              <Gift size={14} />
                              Manage TeachVest Grants
                            </button>
                          </div>

                          {!selectedEmployee.grants ||
                          selectedEmployee.grants.length === 0 ? (
                            <div className="p-12 text-center bg-slate-50 dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                              <Gift
                                size={36}
                                className="mx-auto text-slate-300 dark:text-slate-700 mb-3"
                              />
                              <h5 className="text-sm font-bold text-text-main">
                                No grants assigned to this employee.
                              </h5>
                              <p className="text-xs text-text-muted mt-1">
                                Click the button above to assign an equity
                                grant.
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-6">
                              {selectedEmployee.grants.map((grant) => (
                                <div
                                  key={grant.id}
                                  className="p-8 rounded-[24px] bg-bg-base dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-brand-primary/20 transition-all shadow-sm"
                                >
                                  <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
                                    <div className="flex items-center gap-5">
                                      <div className="w-12 h-12 rounded-2xl bg-bg-surface border border-slate-200 dark:border-slate-700 flex items-center justify-center text-brand-primary shadow-sm">
                                        <Gift size={24} />
                                      </div>
                                      <div>
                                        <h5 className="text-xl font-extrabold text-text-main tracking-tight">
                                          {grant.id}
                                        </h5>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                          <span className="text-[10px] font-extrabold text-brand-primary uppercase tracking-widest bg-brand-primary/5 px-2 py-0.5 rounded leading-none">
                                            {grant.vestingSchedule}
                                          </span>
                                          <span className="px-2 py-0.5 border border-slate-100 dark:border-slate-800 rounded text-[10px] font-bold text-text-muted">
                                            Calculations:{" "}
                                            {selectedEmployee.cliffType ||
                                              "Annually"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <StatusBadge status={grant.status} />
                                  </div>
                                  <VestingBar
                                    vested={calculateLiveVested(
                                      grant,
                                      selectedEmployee.joinDate,
                                      selectedEmployee.cliffType,
                                      companySettings.roundingMode,
                                    )}
                                    exercised={grant.exercisedShares}
                                    total={grant.totalShares}
                                  />

                                  <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center flex-wrap gap-2">
                                    <div className="flex gap-2 items-center">
                                      <span
                                        className={`w-2 h-2 rounded-full ${grant.isPaused ? "bg-amber-50 animate-pulse bg-amber-500" : "bg-emerald-500"}`}
                                      />
                                      <span className="text-[11px] font-bold text-text-muted">
                                        {grant.isPaused
                                          ? "Vesting Paused (Pending Revision)"
                                          : "Standard Timeline Active"}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => {
                                        if (expandedGrantId === grant.id) {
                                          setExpandedGrantId(null);
                                        } else {
                                          setGrantFormStates({
                                            ...grantFormStates,
                                            [grant.id]: {
                                              isPaused: grant.isPaused || false,
                                              pauseStartDate:
                                                grant.pauseStartDate || "",
                                              pauseEndDate:
                                                grant.pauseEndDate || "",
                                              resumeOption:
                                                grant.resumeOption ||
                                                "old_dates",
                                              resumeStartDate:
                                                grant.resumeStartDate || "",
                                              roundingMode:
                                                grant.roundingMode ||
                                                "2-decimal",
                                            },
                                          });
                                          setExpandedGrantId(grant.id);
                                        }
                                      }}
                                      className="text-xs font-bold font-mono text-brand-primary hover:underline flex items-center gap-1 select-none cursor-pointer outline-none"
                                    >
                                      {expandedGrantId === grant.id
                                        ? "Collapse Controls ▲"
                                        : "⏸️ Pause / Shifting Controls ▼"}
                                    </button>
                                  </div>

                                  {expandedGrantId === grant.id && (
                                    <div className="mt-6 p-6 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                                      <div className="font-extrabold text-xs uppercase tracking-wider text-brand-primary mb-2">
                                        Vesting Rules & Timeline Shift Manager
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                          <label className="text-[10px] font-extrabold text-text-muted uppercase">
                                            Pause Active Vesting
                                          </label>
                                          <div className="flex items-center gap-2 pt-1">
                                            <input
                                              type="checkbox"
                                              id={`isPaused-${grant.id}`}
                                              checked={
                                                grantFormStates[grant.id]
                                                  ?.isPaused || false
                                              }
                                              onChange={(e) => {
                                                setGrantFormStates({
                                                  ...grantFormStates,
                                                  [grant.id]: {
                                                    ...grantFormStates[
                                                      grant.id
                                                    ],
                                                    isPaused: e.target.checked,
                                                  },
                                                });
                                              }}
                                              className="w-4 h-4 text-brand-primary accent-brand-primary rounded cursor-pointer"
                                            />
                                            <label
                                              htmlFor={`isPaused-${grant.id}`}
                                              className="text-xs font-bold text-text-main cursor-pointer select-none"
                                            >
                                              Pause this allocation timeline
                                            </label>
                                          </div>
                                        </div>

                                        <div className="space-y-1.5">
                                          <label className="text-[10px] font-extrabold text-text-muted uppercase">
                                            Vesting Decimals Rounding
                                          </label>
                                          <select
                                            value={
                                              grantFormStates[grant.id]
                                                ?.roundingMode || "2-decimal"
                                            }
                                            onChange={(e) => {
                                              setGrantFormStates({
                                                ...grantFormStates,
                                                [grant.id]: {
                                                  ...grantFormStates[grant.id],
                                                  roundingMode: e.target
                                                    .value as any,
                                                },
                                              });
                                            }}
                                            className="w-full text-xs font-bold p-2 rounded-lg bg-bg-surface border border-slate-200 dark:border-slate-700 focus:outline-none"
                                          >
                                            <option value="2-decimal" className="bg-bg-surface dark:bg-slate-900 text-text-main font-extrabold">
                                              2 Decimals (Standard corporate)
                                            </option>
                                            <option value="4-decimal" className="bg-bg-surface dark:bg-slate-900 text-text-main font-extrabold">
                                              4 Decimals (High precision)
                                            </option>
                                            <option value="nearest_integer" className="bg-bg-surface dark:bg-slate-900 text-text-main font-extrabold">
                                              Nearest Integer (Truncated)
                                            </option>
                                            <option value="none" className="bg-bg-surface dark:bg-slate-900 text-text-main font-extrabold">
                                              No Rounding (Calculated density)
                                            </option>
                                          </select>
                                        </div>

                                        {grantFormStates[grant.id]
                                          ?.isPaused && (
                                          <>
                                            <div className="space-y-1.5">
                                              <label className="text-[10px] font-extrabold text-text-muted uppercase">
                                                Pause Start Date
                                              </label>
                                              <input
                                                type="date"
                                                value={
                                                  grantFormStates[grant.id]
                                                    ?.pauseStartDate || ""
                                                }
                                                onChange={(e) => {
                                                  setGrantFormStates({
                                                    ...grantFormStates,
                                                    [grant.id]: {
                                                      ...grantFormStates[
                                                        grant.id
                                                      ],
                                                      pauseStartDate:
                                                        e.target.value,
                                                    },
                                                  });
                                                }}
                                                className="w-full text-xs font-bold p-2 bg-bg-surface border border-slate-200 dark:border-slate-700 rounded-lg text-text-main"
                                              />
                                            </div>
                                            <div className="space-y-1.5">
                                              <label className="text-[10px] font-extrabold text-text-muted uppercase">
                                                Pause End/Resume Date
                                              </label>
                                              <input
                                                type="date"
                                                value={
                                                  grantFormStates[grant.id]
                                                    ?.pauseEndDate || ""
                                                }
                                                onChange={(e) => {
                                                  setGrantFormStates({
                                                    ...grantFormStates,
                                                    [grant.id]: {
                                                      ...grantFormStates[
                                                        grant.id
                                                      ],
                                                      pauseEndDate:
                                                        e.target.value,
                                                    },
                                                  });
                                                }}
                                                className="w-full text-xs font-bold p-2 bg-bg-surface border border-slate-200 dark:border-slate-700 rounded-lg text-text-main"
                                              />
                                            </div>

                                            <div className="space-y-1.5 col-span-1 md:col-span-2">
                                              <label className="text-[10px] font-extrabold text-text-muted uppercase">
                                                Shift timeline Mode for
                                                remaining options
                                              </label>
                                              <div className="flex flex-col gap-2 pt-1 text-xs font-semibold">
                                                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                                  <input
                                                    type="radio"
                                                    name={`resumeOption-${grant.id}`}
                                                    value="old_dates"
                                                    checked={
                                                      grantFormStates[grant.id]
                                                        ?.resumeOption ===
                                                      "old_dates"
                                                    }
                                                    onChange={() => {
                                                      setGrantFormStates({
                                                        ...grantFormStates,
                                                        [grant.id]: {
                                                          ...grantFormStates[
                                                            grant.id
                                                          ],
                                                          resumeOption:
                                                            "old_dates",
                                                        },
                                                      });
                                                    }}
                                                    className="accent-brand-primary cursor-pointer"
                                                  />
                                                  Old Vesting Dates (Keep
                                                  original dates & vest
                                                  remaining)
                                                </label>
                                                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                                  <input
                                                    type="radio"
                                                    name={`resumeOption-${grant.id}`}
                                                    value="new_dates"
                                                    checked={
                                                      grantFormStates[grant.id]
                                                        ?.resumeOption ===
                                                      "new_dates"
                                                    }
                                                    onChange={() => {
                                                      setGrantFormStates({
                                                        ...grantFormStates,
                                                        [grant.id]: {
                                                          ...grantFormStates[
                                                            grant.id
                                                          ],
                                                          resumeOption:
                                                            "new_dates",
                                                          resumeStartDate:
                                                            grantFormStates[
                                                              grant.id
                                                            ]
                                                              ?.resumeStartDate ||
                                                            grantFormStates[
                                                              grant.id
                                                            ]?.pauseEndDate ||
                                                            "",
                                                        },
                                                      });
                                                    }}
                                                    className="accent-brand-primary cursor-pointer"
                                                  />
                                                  New Vesting Dates (Shift
                                                  remaining timelines starting
                                                  from a new date)
                                                </label>
                                              </div>

                                              {grantFormStates[grant.id]
                                                ?.resumeOption ===
                                                "new_dates" && (
                                                <div className="mt-3 p-3 bg-brand-primary/5 rounded-xl border border-brand-primary/20 space-y-1.5 animate-fadeIn">
                                                  <label className="text-[10px] font-extrabold text-brand-primary uppercase">
                                                    Custom New Start Date for
                                                    Remaining Options
                                                  </label>
                                                  <input
                                                    type="date"
                                                    value={
                                                      grantFormStates[grant.id]
                                                        ?.resumeStartDate ||
                                                      grantFormStates[grant.id]
                                                        ?.pauseEndDate ||
                                                      ""
                                                    }
                                                    onChange={(e) => {
                                                      setGrantFormStates({
                                                        ...grantFormStates,
                                                        [grant.id]: {
                                                          ...grantFormStates[
                                                            grant.id
                                                          ],
                                                          resumeStartDate:
                                                            e.target.value,
                                                        },
                                                      });
                                                    }}
                                                    className="w-full text-xs font-bold p-2 bg-bg-surface border border-slate-200 dark:border-slate-700 rounded-lg text-text-main focus:outline-none focus:ring-1 focus:ring-brand-primary/30"
                                                  />
                                                  <p className="text-[10px] text-text-muted">
                                                    All remaining/pending
                                                    options will shift to
                                                    quarterly vesting intervals
                                                    starting from this chosen
                                                    date.
                                                  </p>
                                                </div>
                                              )}
                                            </div>
                                          </>
                                        )}
                                      </div>

                                      <div className="flex justify-between items-center pt-2">
                                        {grantFormSaveSuccess === grant.id ? (
                                          <span className="text-[11px] font-bold text-emerald-500 font-mono">
                                            ✓ Vesting parameters updated!
                                          </span>
                                        ) : (
                                          <span />
                                        )}
                                        <button
                                          onClick={async () => {
                                            const fv =
                                              grantFormStates[grant.id] || {};
                                            const updatedGrants =
                                              selectedEmployee.grants.map(
                                                (g) => {
                                                  if (g.id === grant.id) {
                                                    return {
                                                      ...g,
                                                      isPaused:
                                                        fv.isPaused || false,
                                                      pauseStartDate:
                                                        fv.pauseStartDate ||
                                                        null,
                                                      pauseEndDate:
                                                        fv.pauseEndDate || null,
                                                      resumeOption:
                                                        fv.resumeOption ||
                                                        "old_dates",
                                                      resumeStartDate:
                                                        fv.resumeStartDate ||
                                                        fv.pauseEndDate ||
                                                        null,
                                                      roundingMode:
                                                        fv.roundingMode ||
                                                        "2-decimal",
                                                    };
                                                  }
                                                  return g;
                                                },
                                              );

                                            try {
                                              await updateEmployeeData(
                                                selectedEmployee.id,
                                                { grants: updatedGrants },
                                                user.email,
                                              );
                                              setGrantFormSaveSuccess(grant.id);
                                              setTimeout(
                                                () =>
                                                  setGrantFormSaveSuccess(null),
                                                3000,
                                              );

                                              // Notify parent state of modification
                                              setSelectedEmployee({
                                                ...selectedEmployee,
                                                grants: updatedGrants,
                                              });

                                              await createAuditLog(
                                                "Configure Vesting",
                                                `Adjusted ESOP vesting timelines/decimals for allocation ${grant.id} against stakeholder ${selectedEmployee.name}.`,
                                              );
                                            } catch (err: any) {
                                              alert(
                                                "Error saving: " + err.message,
                                              );
                                            }
                                          }}
                                          className="px-4 py-2 bg-brand-primary text-white text-xs font-black rounded-xl hover:bg-brand-primary-hover active:scale-95 transition-all outline-none cursor-pointer"
                                        >
                                          Save Vesting Rules
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {employeeSubTab === "documents" && (
                        <div className="space-y-8">
                          {/* Corporate Pre-defined Grant Letter & E-Signature Pipeline */}
                          {selectedEmployee.grants &&
                          selectedEmployee.grants.length > 0
                            ? (() => {
                                const activeGrant = selectedEmployee.grants[0]; // Primary Grant
                                const currentStatus =
                                  activeGrant.workflowStatus || "Draft";
                                const vestingTableHtml =
                                  generateVestingScheduleTableHtml(
                                    activeGrant,
                                    selectedEmployee.joinDate ||
                                      activeGrant.grantDate,
                                    selectedEmployee.cliffType,
                                    companySettings.roundingMode,
                                  );

                                const steps = [
                                  { key: "Draft", label: "1. Draft Ready" },
                                  {
                                    key: "Pending Admin Review",
                                    label: "2. Under Admin Review",
                                  },
                                  {
                                    key: "Pending Signatory Signature",
                                    label: "3. Signatory Pending",
                                  },
                                  {
                                    key: "Pending Employee Signature",
                                    label: "4. Stakeholder Pending",
                                  },
                                  {
                                    key: "Fully Signed",
                                    label: "5. Fully Executed",
                                  },
                                ];

                                const getStepIndex = (st: string) => {
                                  return steps.findIndex((s) => s.key === st);
                                };

                                const currentIndex =
                                  getStepIndex(currentStatus);

                                return (
                                  <div className="p-8 rounded-[32px] bg-bg-surface border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
                                    <div className="flex justify-between items-center flex-wrap gap-4 pb-4 border-b border-slate-50 dark:border-slate-800">
                                      <div>
                                        <h4 className="text-sm font-extrabold text-brand-primary uppercase tracking-widest flex items-center gap-2">
                                          <ShieldCheck
                                            className="text-emerald-500"
                                            size={18}
                                          />
                                          Pre-defined ESOP Grant Letter &
                                          Electronic Signatures
                                        </h4>
                                        <p className="text-[11px] text-text-muted mt-1 font-medium">
                                          Automatic layout mirroring settings &
                                          stakeholder vesting rules.
                                        </p>
                                      </div>
                                      <div className="flex gap-2">
                                        <span className="text-xs font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 px-3 py-1 rounded-full font-mono">
                                          Workflow: {currentStatus}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Step Phase Indicator */}
                                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                      {steps.map((st, sIdx) => {
                                        const isDone =
                                          sIdx < currentIndex ||
                                          currentStatus === "Fully Signed";
                                        const isCurrent =
                                          sIdx === currentIndex &&
                                          currentStatus !== "Fully Signed";
                                        return (
                                          <div
                                            key={st.key}
                                            className={`p-3 rounded-2xl border text-center font-mono text-[10px] font-extrabold flex flex-col justify-center transition-all ${
                                              isDone
                                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                                                : isCurrent
                                                  ? "bg-brand-primary/10 border-brand-primary text-brand-primary animate-pulse"
                                                  : "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400"
                                            }`}
                                          >
                                            <span>{st.label}</span>
                                            <span className="text-[9px] font-black uppercase mt-1">
                                              {isDone
                                                ? "[DONE]"
                                                : isCurrent
                                                  ? "[ACTIVE]"
                                                  : "[WAITING]"}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                                      {/* Left: Dynamic Grant Letter Paper Frame (Col Span 3) */}
                                      <div className="lg:col-span-3 bg-white dark:bg-slate-900 shadow-inner rounded-3xl p-8 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-sans relative overflow-hidden text-xs space-y-6 leading-relaxed max-h-[500px] overflow-y-auto">
                                        {!companySettings.grantLetterBodyHeader?.includes(
                                          "LETTER OF GRANT",
                                        ) && (
                                          <>
                                            <div className="text-center font-sans space-y-1 border-b border-double pb-4 border-slate-200 dark:border-slate-800">
                                              <h3 className="text-sm font-black tracking-widest uppercase text-slate-900 dark:text-slate-100">
                                                {companySettings.grantLetterCompanyName ||
                                                  "Teachmint Technologies Private Limited"}
                                              </h3>
                                              <p className="text-[9px] font-bold text-slate-700 dark:text-slate-300 tracking-wide uppercase">
                                                {companySettings.grantLetterCompanyAddress ||
                                                  "Regd Office: Bangalore, Landmark Tower, Sector 3A, India"}
                                              </p>
                                              <p className="text-[9px] font-bold text-slate-600 dark:text-slate-400 tracking-widest uppercase">
                                                {companySettings.grantLetterCompanyCIN ||
                                                  "CIN: U72900KA2020PTC139045"}
                                              </p>
                                            </div>

                                            <div className="flex justify-between font-sans text-[10px] text-slate-700 dark:text-slate-300 pt-2 font-extrabold uppercase">
                                              <span>
                                                Ref: TM/ESOP/{activeGrant.id}
                                              </span>
                                              <span>
                                                Date:{" "}
                                                {fmtDate(activeGrant.grantDate)}
                                              </span>
                                            </div>

                                            <div className="font-sans text-[11px] font-bold text-slate-900 dark:text-slate-100">
                                              <p>To,</p>
                                              <p className="capitalize mt-1">
                                                {selectedEmployee.name}
                                              </p>
                                              <p className="text-slate-700 dark:text-slate-300 font-bold">
                                                {selectedEmployee.designation ||
                                                  "Executive"}{" "}
                                                —{" "}
                                                {selectedEmployee.department ||
                                                  "Operations"}
                                              </p>
                                              <p className="text-slate-600 dark:text-slate-355 font-bold">
                                                Employee Code:{" "}
                                                {selectedEmployee.id}
                                              </p>
                                            </div>

                                            <div className="text-center font-sans font-black uppercase text-xs tracking-wider text-slate-900 dark:text-slate-100 underline decoration-indigo-500 decoration-2">
                                              {companySettings.grantLetterSubject ||
                                                "Subject: Option offering under Employees’ Stock Option Plan 2020 (ESOP 2020)"}
                                            </div>

                                            <p>
                                              Dear{" "}
                                              <strong className="font-sans font-extrabold capitalize">
                                                {selectedEmployee.name}
                                              </strong>
                                              ,
                                            </p>
                                          </>
                                        )}

                                        <div
                                          className="text-slate-700 dark:text-slate-300 leading-relaxed space-y-2 whitespace-pre-wrap text-xs font-sans"
                                          dangerouslySetInnerHTML={{
                                            __html: replaceLetterPlaceholders(
                                              companySettings.grantLetterBodyHeader ||
                                                "On behalf of Teachmint Technologies Private Limited, we are pleased to offer you options under the Teachmint ESOP Plan 2020. Below are the core parameters of your grant:",
                                              selectedEmployee.name,
                                              `${fmt(activeGrant.totalShares)} Units`,
                                              `₹${activeGrant.strikePrice || 10}`,
                                              activeGrant.vestingSchedule,
                                              companySettings.grantLetterCompanyName ||
                                                "Teachmint Technologies",
                                              new Date().toLocaleDateString(
                                                undefined,
                                                {
                                                  year: "numeric",
                                                  month: "long",
                                                  day: "numeric",
                                                },
                                              ),
                                              companySettings.signatoryName ||
                                                "Mihir Gupta",
                                              companySettings.signatoryDesignation ||
                                                "Co-Founder & CEO",
                                              companySettings.grantLetterCompanyAddress ||
                                                "5th Floor, North Wing, SJR The HUB, Survey No. 8/2 & 9, Sarjapur Road, Bengaluru, Karnataka - 560103",
                                              companySettings.grantLetterCompanyCIN ||
                                                "CIN: U62099KA2020PTC135305",
                                              selectedEmployee.id,
                                              selectedEmployee.designation ||
                                                "Executive",
                                              selectedEmployee.department ||
                                                "Operations",
                                              vestingTableHtml,
                                            ).replace(/\n/g, "<br/>"),
                                          }}
                                        />

                                        <div className="grid grid-cols-2 gap-4 font-sans bg-slate-50 dark:bg-slate-805 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-[10px] font-extrabold uppercase text-slate-700 dark:text-slate-300">
                                          <div>
                                            <p className="text-slate-600 dark:text-slate-300 text-[9px] font-extrabold uppercase">
                                              Grant Unique ID
                                            </p>
                                            <p className="text-slate-950 dark:text-slate-100 text-xs font-black">
                                              {activeGrant.id}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-slate-600 dark:text-slate-300 text-[9px] font-extrabold uppercase">
                                              Offered Options Count
                                            </p>
                                            <p className="text-slate-950 dark:text-slate-100 text-xs font-black">
                                              {fmt(activeGrant.totalShares)}{" "}
                                              units
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-slate-600 dark:text-slate-300 text-[9px] font-extrabold uppercase">
                                              Strike Option Price
                                            </p>
                                            <p className="text-emerald-700 dark:text-emerald-400 text-xs font-black">
                                              ₹{activeGrant.strikePrice || 10}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-slate-600 dark:text-slate-300 text-[9px] font-extrabold uppercase">
                                              Vesting Option Period
                                            </p>
                                            <p className="text-slate-950 dark:text-slate-100 text-xs font-black">
                                              {activeGrant.vestingSchedule}
                                            </p>
                                          </div>
                                        </div>

                                        <div
                                          className="text-slate-700 dark:text-slate-300 leading-relaxed space-y-2 whitespace-pre-wrap text-xs font-sans"
                                          dangerouslySetInnerHTML={{
                                            __html: replaceLetterPlaceholders(
                                              companySettings.grantLetterBodyFooter ||
                                                "This offer and your participation in the ESOP Plan 2025 are subject to the terms and rules set out by Teachmint and the board of directors. By e-signing this offer letter below, you acknowledge and agree to abide by all the general guidelines of Teachmint.",
                                              selectedEmployee.name,
                                              `${fmt(activeGrant.totalShares)} Units`,
                                              `₹${activeGrant.strikePrice || 10}`,
                                              activeGrant.vestingSchedule,
                                              companySettings.grantLetterCompanyName ||
                                                "Teachmint Technologies",
                                              new Date().toLocaleDateString(
                                                undefined,
                                                {
                                                  year: "numeric",
                                                  month: "long",
                                                  day: "numeric",
                                                },
                                              ),
                                              companySettings.signatoryName ||
                                                "Mihir Gupta",
                                              companySettings.signatoryDesignation ||
                                                "Co-Founder & CEO",
                                              companySettings.grantLetterCompanyAddress ||
                                                "5th Floor, North Wing, SJR The HUB, Survey No. 8/2 & 9, Sarjapur Road, Bengaluru, Karnataka - 560103",
                                              companySettings.grantLetterCompanyCIN ||
                                                "CIN: U62099KA2020PTC135305",
                                              selectedEmployee.id,
                                              selectedEmployee.designation ||
                                                "Executive",
                                              selectedEmployee.department ||
                                                "Operations",
                                            ).replace(/\n/g, "<br/>"),
                                          }}
                                        />

                                        {/* Signatures Panel */}
                                        <div className="grid grid-cols-2 gap-8 pt-8 border-t border-dashed border-slate-200 dark:border-slate-800 font-sans text-[10px]">
                                          {/* Signatory */}
                                          <div className="space-y-1.5 font-bold">
                                            <p className="text-slate-400 font-black uppercase text-[8px]">
                                              Authorized Signatory
                                            </p>
                                            {activeGrant.signatorySignedDate ? (
                                              <div className="p-3 bg-brand-primary/5 rounded-xl border border-brand-primary/10 text-brand-primary text-[9px] space-y-0.5">
                                                <p className="font-extrabold uppercase">
                                                  ✓ Digitally Signed
                                                </p>
                                                <p>
                                                  Signee:{" "}
                                                  {companySettings.signatoryName ||
                                                    "Sanju T"}
                                                </p>
                                                <p className="text-[8px] font-mono whitespace-nowrap text-slate-400">
                                                  Date:{" "}
                                                  {fmtDate(
                                                    activeGrant.signatorySignedDate,
                                                  )}
                                                </p>
                                              </div>
                                            ) : (
                                              <div className="p-3 bg-rose-500/5 rounded-xl border border-rose-500/10 text-rose-500 text-[9px] uppercase font-black tracking-wider animate-pulse">
                                                ✗ Awaiting Sign-off
                                              </div>
                                            )}
                                            <div className="pt-2 text-slate-800 dark:text-slate-200 font-black uppercase">
                                              <p>
                                                {companySettings.signatoryName ||
                                                  "Sanju T"}
                                              </p>
                                              <p className="text-[8px] text-slate-500 font-medium">
                                                {companySettings.signatoryDesignation ||
                                                  "Director"}
                                              </p>
                                            </div>
                                          </div>

                                          {/* Employee */}
                                          <div className="space-y-1.5 font-bold">
                                            <p className="text-slate-400 font-black uppercase text-[8px]">
                                              Stakeholder E-Sign
                                            </p>
                                            {activeGrant.employeeEsignDate ? (
                                              <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10 text-emerald-600 text-[9px] space-y-0.5">
                                                <p className="font-extrabold uppercase">
                                                  ✓ Digitally Accepted
                                                </p>
                                                <p>
                                                  Name: {selectedEmployee.name}
                                                </p>
                                                <p className="text-[8px] font-mono whitespace-nowrap text-slate-400">
                                                  Date:{" "}
                                                  {fmtDate(
                                                    activeGrant.employeeEsignDate,
                                                  )}
                                                </p>
                                              </div>
                                            ) : (
                                              <div className="p-3 bg-rose-500/5 rounded-xl border border-rose-500/10 text-rose-500 text-[9px] uppercase font-black tracking-wider animate-pulse">
                                                ✗ Awaiting Acceptance
                                              </div>
                                            )}
                                            <div className="pt-2 text-slate-800 dark:text-slate-200 font-black uppercase">
                                              <p>{selectedEmployee.name}</p>
                                              <p className="text-[8px] text-slate-500 font-medium">
                                                {selectedEmployee.designation ||
                                                  "AVP"}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Right: Validation & Multi-Level Sign-off Controller (Col Span 2) */}
                                      <div className="lg:col-span-2 space-y-6 flex flex-col justify-between font-mono text-xs">
                                        <div className="space-y-4">
                                          <div className="p-4 bg-slate-900 text-slate-200 rounded-2xl border border-slate-800 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-extrabold select-none shrink-0">
                                              i
                                            </div>
                                            <div>
                                              <p className="font-bold text-[11px]">
                                                Workflow Compliance
                                              </p>
                                              <p className="text-[9px] text-zinc-400 mt-0.5 leading-normal">
                                                Ensure reviewers validate
                                                credentials against Board
                                                Resolution files before
                                                releasing to signatures.
                                              </p>
                                            </div>
                                          </div>

                                          <div className="space-y-3 p-5 rounded-2xl bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 shadow-sm">
                                            <span className="text-xs font-black uppercase tracking-wider text-slate-950 dark:text-white block mb-2">
                                              Corporate Checklist
                                            </span>
                                            <div className="space-y-2.5 pt-1 font-sans text-xs">
                                              {[
                                                {
                                                  lbl: "Grant Unique ID generated",
                                                  chk: true,
                                                },
                                                {
                                                  lbl: "Approved Strike Price linked",
                                                  chk: true,
                                                },
                                                {
                                                  lbl: "Vesting Shift configs saved",
                                                  chk: true,
                                                },
                                                {
                                                  lbl: `Authorized Signatory assigned`,
                                                  chk: !!companySettings.signatoryName,
                                                },
                                              ].map((c, cIdx) => (
                                                <div
                                                  key={cIdx}
                                                  className="flex items-center gap-2.5 text-slate-950 dark:text-slate-100 font-extrabold"
                                                >
                                                  <span className="text-emerald-600 dark:text-emerald-400 font-black text-base select-none">
                                                    ✓
                                                  </span>
                                                  <span>{c.lbl}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Compliance Controllers based on status */}
                                        <div className="p-5 rounded-2xl bg-indigo-600/5 dark:bg-indigo-600/10 border border-indigo-500/20 space-y-4">
                                          <span className="text-[10px] font-black tracking-wider text-brand-primary uppercase">
                                            E-Signature Level Workflow Actions
                                          </span>

                                          {currentStatus === "Draft" && (
                                            <div className="space-y-2">
                                              <p className="text-[10px] text-text-muted leading-relaxed">
                                                This ESOP grant draft letter is
                                                generated. Submit to secondary
                                                Admin reviewer for
                                                authorization.
                                              </p>
                                              <button
                                                onClick={async () => {
                                                  const updatedGrants =
                                                    selectedEmployee.grants.map(
                                                      (g) =>
                                                        g.id === activeGrant.id
                                                          ? {
                                                              ...g,
                                                              workflowStatus:
                                                                "Pending Admin Review",
                                                            }
                                                          : g,
                                                    );
                                                  const updatedEmp = {
                                                    ...selectedEmployee,
                                                    grants: updatedGrants,
                                                  };
                                                  setSelectedEmployee(
                                                    updatedEmp,
                                                  );
                                                  setEmployees((p) =>
                                                    p.map((emp) =>
                                                      emp.id ===
                                                      selectedEmployee.id
                                                        ? updatedEmp
                                                        : emp,
                                                    ),
                                                  );
                                                  await updateEmployeeData(
                                                    selectedEmployee.id,
                                                    { grants: updatedGrants },
                                                    user.email,
                                                  );
                                                  await createAuditLog(
                                                    "Submit Grant Draft",
                                                    `Admin pushed ESOP grant offer letter ${activeGrant.id} to review queue.`,
                                                  );
                                                }}
                                                className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer outline-none text-center block"
                                              >
                                                📤 Push to Admin Review
                                              </button>
                                            </div>
                                          )}

                                          {currentStatus ===
                                            "Pending Admin Review" && (
                                            <div className="space-y-2">
                                              <p className="text-[10px] text-text-muted leading-relaxed">
                                                Review the grant details. After
                                                verifying, push this offering
                                                letter to Authorized Signatory{" "}
                                                {companySettings.signatoryName ||
                                                  "Sanju T"}
                                                .
                                              </p>
                                              <button
                                                onClick={async () => {
                                                  const updatedGrants =
                                                    selectedEmployee.grants.map(
                                                      (g) =>
                                                        g.id === activeGrant.id
                                                          ? {
                                                              ...g,
                                                              workflowStatus:
                                                                "Pending Signatory Signature",
                                                            }
                                                          : g,
                                                    );
                                                  const updatedEmp = {
                                                    ...selectedEmployee,
                                                    grants: updatedGrants,
                                                  };
                                                  setSelectedEmployee(
                                                    updatedEmp,
                                                  );
                                                  setEmployees((p) =>
                                                    p.map((emp) =>
                                                      emp.id ===
                                                      selectedEmployee.id
                                                        ? updatedEmp
                                                        : emp,
                                                    ),
                                                  );
                                                  await updateEmployeeData(
                                                    selectedEmployee.id,
                                                    { grants: updatedGrants },
                                                    user.email,
                                                  );
                                                  await createAuditLog(
                                                    "Approve Admin Review",
                                                    `Admin approved ESOP grant offer letter ${activeGrant.id} and submitted to Authorized Signatory.`,
                                                  );
                                                }}
                                                className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer outline-none text-center block"
                                              >
                                                🔍 Approve Review & Submit to
                                                Signatory
                                              </button>
                                            </div>
                                          )}

                                          {currentStatus ===
                                            "Pending Signatory Signature" && (
                                            <div className="space-y-2">
                                              <p className="text-[10px] text-text-muted leading-relaxed">
                                                Waiting for Signatory sign-off.
                                                As an Authorized Signatory, you
                                                can seal the grant offer below.
                                              </p>
                                              <button
                                                onClick={async () => {
                                                  const updatedGrants =
                                                    selectedEmployee.grants.map(
                                                      (g) =>
                                                        g.id === activeGrant.id
                                                          ? {
                                                              ...g,
                                                              workflowStatus:
                                                                "Pending Employee Signature",
                                                              signatorySignedDate:
                                                                new Date().toISOString(),
                                                            }
                                                          : g,
                                                    );
                                                  const updatedEmp = {
                                                    ...selectedEmployee,
                                                    grants: updatedGrants,
                                                  };
                                                  setSelectedEmployee(
                                                    updatedEmp,
                                                  );
                                                  setEmployees((p) =>
                                                    p.map((emp) =>
                                                      emp.id ===
                                                      selectedEmployee.id
                                                        ? updatedEmp
                                                        : emp,
                                                    ),
                                                  );
                                                  await updateEmployeeData(
                                                    selectedEmployee.id,
                                                    { grants: updatedGrants },
                                                    user.email,
                                                  );

                                                  // Log system email notification to employee
                                                  await sendEmailWithOptionalGmail(
                                                    selectedEmployee.email,
                                                    selectedEmployee.name,
                                                    "employee",

                                                      "Teachmint ESOP Offer Letter Out for Your E-Signature!",
`
                                                  <div style="font-family: sans-serif; padding: 24px; color: #1e293b; background: #eef2ff; border-radius: 12px; max-width: 600px; border: 1px solid #e0e7ff;">
                                                    <h3 style="color: #6366f1; margin-bottom: 12px; font-weight: 800;">Action Required: E-Sign Your Grant Letter</h3>
                                                    <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                                                      Dear <strong>${selectedEmployee.name}</strong>,
                                                    </p>
                                                    <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                                                      We are pleased to inform you that your ESOP Grant Letter for Scheme <strong>Teachmint ESOP 2020</strong> has been digitally signed by the company's Authorized Signatory and is now awaiting your final acceptance signature.
                                                    </p>
                                                    
                                                    <div style="text-align: center; margin: 25px 0;">
                                                      <a href="/?role=employee&email=${encodeURIComponent(selectedEmployee.email)}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 10px; font-weight: bold; text-decoration: none; font-size: 13px;">Login & Sign Grant Letter</a>
                                                    </div>
                                                    
                                                    <p style="font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 20px;">
                                                      Regards,<br/>
                                                      <strong>Teachmint ESOP Operations</strong>
                                                    </p>
                                                  </div>
                                                `.trim(),
                                                    selectedEmployee.password
                                                  );

                                                  await createAuditLog(
                                                    "Signatory Signature Approved",
                                                    `Signatory ${companySettings.signatoryName || "Sanju T"} digitally signed option offer letter ${activeGrant.id}. Sent notification alert to employee.`,
                                                  );
                                                }}
                                                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer outline-none text-center block"
                                              >
                                                ✍️ E-Sign as Signatory:{" "}
                                                {companySettings.signatoryName ||
                                                  "Sanju T"}
                                              </button>
                                            </div>
                                          )}

                                          {currentStatus ===
                                            "Pending Employee Signature" && (
                                            <div className="space-y-2">
                                              <p className="text-[10px] text-text-muted leading-relaxed">
                                                The letter is pending
                                                stakeholder signature.
                                              </p>

                                              {/* Quick Simulator Button for Admin ease */}
                                              <button
                                                onClick={async () => {
                                                  const updatedGrants =
                                                    selectedEmployee.grants.map(
                                                      (g) =>
                                                        g.id === activeGrant.id
                                                          ? {
                                                              ...g,
                                                              workflowStatus:
                                                                "Fully Signed",
                                                              employeeEsignDate:
                                                                new Date().toISOString(),
                                                            }
                                                          : g,
                                                    );

                                                  // Generate simulated PDF file artifact of signed grant letter & append to documents
                                                  const simulatedFileStr = `Signed ESOP Grant Letter - Ref: TM/ESOP/${activeGrant.id}\nSigned by ${companySettings.signatoryName} and stakeholder ${selectedEmployee.name} digitally. Document Certified under Secure Hash.`;
                                                  const base64Url =
                                                    "data:text/plain;base64," +
                                                    btoa(simulatedFileStr);

                                                  const updatedDocs = [
                                                    ...(selectedEmployee.documents ||
                                                      []),
                                                    {
                                                      name: `Signed_ESOP_Grant_Letter_${activeGrant.id}.txt`,
                                                      url: base64Url,
                                                      uploadDate: new Date()
                                                        .toISOString()
                                                        .split("T")[0],
                                                      isSignedLetter: true,
                                                    },
                                                  ];

                                                  const updatedEmp = {
                                                    ...selectedEmployee,
                                                    grants: updatedGrants,
                                                    documents: updatedDocs,
                                                  };
                                                  setSelectedEmployee(
                                                    updatedEmp,
                                                  );
                                                  setEmployees((p) =>
                                                    p.map((emp) =>
                                                      emp.id ===
                                                      selectedEmployee.id
                                                        ? updatedEmp
                                                        : emp,
                                                    ),
                                                  );
                                                  await updateEmployeeData(
                                                    selectedEmployee.id,
                                                    {
                                                      grants: updatedGrants,
                                                      documents: updatedDocs,
                                                    },
                                                    user.email,
                                                  );
                                                  await createAuditLog(
                                                    "Employee Acceptance Registered",
                                                    `Employee ${selectedEmployee.name} accepted and fully e-signed grant offer letter ${activeGrant.id}. Signed PDF generated.`,
                                                  );
                                                }}
                                                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer outline-none text-center block"
                                              >
                                                👤 Stakeholder E-Sign (Admin
                                                Testing Switch)
                                              </button>
                                            </div>
                                          )}

                                          {currentStatus === "Fully Signed" && (
                                            <div className="space-y-2 text-center text-emerald-500 font-bold font-mono">
                                              <p className="text-xl">✅</p>
                                              <p className="text-xs uppercase">
                                                Agreement Fully Signed &
                                                Executed!
                                              </p>
                                              <p className="text-[9px] text-text-muted mt-1 leading-normal font-sans">
                                                Corporate letter is registered
                                                in vault records. A digital PDF
                                                copy is archived down in the
                                                documents ledger below.
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })()
                            : null}

                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-extrabold text-brand-primary uppercase tracking-widest">
                              Employee Official Documents
                            </h4>
                            <span className="text-xs text-text-muted font-bold">
                              Total: {selectedEmployee.documents?.length || 0}{" "}
                              attachments
                            </span>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Documents List (Col Span 2) */}
                            <div className="lg:col-span-2 space-y-4">
                              {!selectedEmployee.documents ||
                              selectedEmployee.documents.length === 0 ? (
                                <div className="p-12 text-center bg-slate-50 dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                                  <FileText
                                    size={36}
                                    className="mx-auto text-slate-300 dark:text-slate-700 mb-3"
                                  />
                                  <h5 className="text-sm font-bold text-text-main">
                                    No official documents uploaded yet.
                                  </h5>
                                  <p className="text-xs text-text-muted mt-1">
                                    Use the right panel to attach any employment
                                    or option sign-off letters.
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  {selectedEmployee.documents.map(
                                    (doc, idx) => (
                                      <div
                                        key={idx}
                                        className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between flex-wrap gap-4"
                                      >
                                        <div className="flex items-center gap-4">
                                          <div className="w-10 h-10 bg-emerald-500/10 text-emerald-600 rounded-xl flex items-center justify-center">
                                            <FileText size={20} />
                                          </div>
                                          <div>
                                            <h6 className="text-sm font-bold text-text-main">
                                              {doc.name}
                                            </h6>
                                            <p className="text-[10px] text-text-muted font-mono mt-0.5">
                                              Uploaded on:{" "}
                                              {doc.uploadDate ||
                                                doc.uploadedAt ||
                                                "N/A"}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                          <a
                                            href={doc.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs font-black text-text-main border border-slate-100 dark:border-slate-800 flex items-center gap-1 transition-all select-none"
                                          >
                                            <FileDown size={13} />
                                            View Doc
                                          </a>

                                          {/* Quick Replace Trigger */}
                                          <label
                                            htmlFor={`dashboard-replace-file-${idx}`}
                                            className="px-4 py-2 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary rounded-xl text-xs font-black cursor-pointer flex items-center gap-1 transition-all select-none"
                                          >
                                            <Upload size={13} />
                                            Replace Doc
                                          </label>
                                          <input
                                            type="file"
                                            id={`dashboard-replace-file-${idx}`}
                                            className="hidden"
                                            onChange={(e) => {
                                              if (
                                                e.target.files &&
                                                e.target.files[0]
                                              ) {
                                                const file = e.target.files[0];
                                                const reader = new FileReader();
                                                reader.onload = async (evt) => {
                                                  const base64Url = evt.target
                                                    ?.result as string;
                                                  if (base64Url) {
                                                    const updatedDocs = [
                                                      ...(selectedEmployee.documents ||
                                                        []),
                                                    ];
                                                    updatedDocs[idx] = {
                                                      ...updatedDocs[idx],
                                                      url: base64Url,
                                                      uploadDate: new Date()
                                                        .toISOString()
                                                        .split("T")[0],
                                                    };
                                                    const updatedEmployee = {
                                                      ...selectedEmployee,
                                                      documents: updatedDocs,
                                                    };
                                                    setSelectedEmployee(
                                                      updatedEmployee,
                                                    );
                                                    setEmployees((prev) =>
                                                      prev.map((emp) =>
                                                        emp.id ===
                                                        selectedEmployee.id
                                                          ? updatedEmployee
                                                          : emp,
                                                      ),
                                                    );
                                                    await updateEmployeeData(
                                                      selectedEmployee.id,
                                                      {
                                                        documents: updatedDocs,
                                                      },
                                                      user.email,
                                                    );
                                                  }
                                                };
                                                reader.readAsDataURL(file);
                                              }
                                            }}
                                          />

                                          <button
                                            onClick={async () => {
                                              const updatedDocs = (
                                                selectedEmployee.documents || []
                                              ).filter((_, i) => i !== idx);
                                              const updatedEmployee = {
                                                ...selectedEmployee,
                                                documents: updatedDocs,
                                              };
                                              setSelectedEmployee(
                                                updatedEmployee,
                                              );
                                              setEmployees((prev) =>
                                                prev.map((emp) =>
                                                  emp.id === selectedEmployee.id
                                                    ? updatedEmployee
                                                    : emp,
                                                ),
                                              );
                                              await updateEmployeeData(
                                                selectedEmployee.id,
                                                { documents: updatedDocs },
                                                user.email,
                                              );
                                            }}
                                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </div>
                                      </div>
                                    ),
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Quick Document Uploader Form (Col Span 1) */}
                            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-4 h-fit">
                              <h5 className="text-xs font-black uppercase tracking-wider text-brand-primary">
                                Attach New Document
                              </h5>

                              <div className="space-y-4">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                                    Document Title
                                  </label>
                                  <input
                                    id="new-doc-title-input"
                                    type="text"
                                    placeholder="e.g. Non Disclosure Agreement (NDA)"
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main outline-none focus:border-brand-primary font-bold text-brand-primary"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                                    Local File Attachment
                                  </label>
                                  <div className="border border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all rounded-xl p-4 text-center cursor-pointer relative">
                                    <input
                                      type="file"
                                      className="absolute inset-0 opacity-0 cursor-pointer"
                                      onChange={(e) => {
                                        if (
                                          e.target.files &&
                                          e.target.files[0]
                                        ) {
                                          const file = e.target.files[0];
                                          const titleInput =
                                            document.getElementById(
                                              "new-doc-title-input",
                                            ) as HTMLInputElement;
                                          if (
                                            titleInput &&
                                            !titleInput.value.trim()
                                          ) {
                                            titleInput.value =
                                              file.name.replace(
                                                /\.[^/.]+$/,
                                                "",
                                              );
                                          }
                                          const reader = new FileReader();
                                          reader.onload = async (evt) => {
                                            const base64Url = evt.target
                                              ?.result as string;
                                            if (base64Url) {
                                              (
                                                window as any
                                              )._pendingBase64Img = base64Url;
                                              const fileIndicator =
                                                document.getElementById(
                                                  "file-uploaded-status",
                                                );
                                              if (fileIndicator) {
                                                fileIndicator.innerText = `📎 ${file.name} Loaded!`;
                                              }
                                            }
                                          };
                                          reader.readAsDataURL(file);
                                        }
                                      }}
                                    />
                                    <div className="flex flex-col items-center">
                                      <Upload
                                        size={18}
                                        className="text-text-muted mb-1"
                                      />
                                      <span
                                        id="file-uploaded-status"
                                        className="text-[10px] text-text-muted font-bold uppercase"
                                      >
                                        Click to select/drag file
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest block text-center">
                                    — OR PROVIDE DIRECT LINK —
                                  </span>
                                  <input
                                    id="new-doc-link-input"
                                    type="text"
                                    placeholder="https://drive.google.com/..."
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-text-main outline-none focus:border-brand-primary"
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={async () => {
                                    const titleInput = document.getElementById(
                                      "new-doc-title-input",
                                    ) as HTMLInputElement;
                                    const linkInput = document.getElementById(
                                      "new-doc-link-input",
                                    ) as HTMLInputElement;
                                    const docTitle =
                                      titleInput?.value.trim() || "";
                                    const docUrl =
                                      (window as any)._pendingBase64Img ||
                                      linkInput?.value.trim() ||
                                      "";

                                    if (!docTitle) {
                                      alert("Please provide a Document Title.");
                                      return;
                                    }
                                    if (!docUrl) {
                                      alert(
                                        "Please attach a file or copy/paste a Document Link URL.",
                                      );
                                      return;
                                    }

                                    const updatedDocs = [
                                      ...(selectedEmployee.documents || []),
                                    ];
                                    updatedDocs.push({
                                      name: docTitle,
                                      url: docUrl,
                                      uploadDate: new Date()
                                        .toISOString()
                                        .split("T")[0],
                                    });

                                    const updatedEmployee = {
                                      ...selectedEmployee,
                                      documents: updatedDocs,
                                    };
                                    setSelectedEmployee(updatedEmployee);
                                    setEmployees((prev) =>
                                      prev.map((emp) =>
                                        emp.id === selectedEmployee.id
                                          ? updatedEmployee
                                          : emp,
                                      ),
                                    );
                                    await updateEmployeeData(
                                      selectedEmployee.id,
                                      { documents: updatedDocs },
                                      user.email,
                                    );

                                    // Reset fields
                                    if (titleInput) titleInput.value = "";
                                    if (linkInput) linkInput.value = "";
                                    (window as any)._pendingBase64Img = null;
                                    const fileIndicator =
                                      document.getElementById(
                                        "file-uploaded-status",
                                      );
                                    if (fileIndicator) {
                                      fileIndicator.innerText =
                                        "Click to select/drag file";
                                    }
                                  }}
                                  className="w-full bg-brand-primary text-white text-xs font-bold py-2.5 rounded-xl hover:scale-[1.01] transition-all duration-150 flex items-center justify-center gap-1 shadow-md shadow-brand-primary/10"
                                >
                                  <PlusCircle size={14} />
                                  Attach & Upload Document
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "grants" && (
                <div className="space-y-8">
                  <div className="bg-bg-surface border border-slate-200 dark:border-slate-800 rounded-[40px] p-12 shadow-sm relative overflow-hidden transition-colors">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10">
                      <h3 className="text-4xl font-extrabold text-text-main tracking-tighter mb-4">
                        TeachVest Liquidity Pool
                      </h3>
                      <p className="text-text-muted max-w-2xl font-semibold mb-12 leading-relaxed text-lg">
                        Real-time visualization of{" "}
                        {employees.reduce((s, e) => s + e.grants.length, 0)}{" "}
                        equity allocations. Tracking automated quarterly vesting
                        intervals globally.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pb-12">
                        {[
                          {
                            label: "Total ESOP Pool",
                            val: fmt(companySettings.totalPool),
                            icon: Shield,
                            color: "text-brand-primary",
                            bg: "bg-brand-primary/5",
                          },
                          {
                            label: "Pool Distributed",
                            val: fmt(stats.totalGranted),
                            icon: Database,
                            color: "text-blue-500",
                            bg: "bg-blue-50",
                          },
                          {
                            label: "Pool Remaining",
                            val: fmt(
                              Math.max(
                                0,
                                companySettings.totalPool - stats.totalGranted,
                              ),
                            ),
                            icon: TrendingUp,
                            color: "text-emerald-500",
                            bg: "bg-emerald-50",
                          },
                          {
                            label: "Beneficiaries",
                            val: employees.length,
                            icon: Users,
                            color: "text-brand-accent",
                            bg: "bg-brand-accent/5",
                          },
                        ].map((s, i) => (
                          <div
                            key={i}
                            className="p-8 rounded-[32px] bg-bg-surface border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all"
                          >
                            <div
                              className={`w-12 h-12 ${s.bg} ${s.color} rounded-2xl flex items-center justify-center mb-6`}
                            >
                              <s.icon size={24} />
                            </div>
                            <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.2em] mb-2">
                              {s.label}
                            </div>
                            <div className="text-3xl font-extrabold text-text-main tracking-tight font-mono">
                              {s.val}
                            </div>
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
                        <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.2em] mb-1">
                          Total Logs Tracked
                        </div>
                        <div className="text-3xl font-extrabold text-text-main font-mono">
                          {auditLogs.length}
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-brand-primary/10 text-brand-primary rounded-2xl flex items-center justify-center">
                        <History size={24} />
                      </div>
                    </div>
                    <div className="p-8 rounded-[32px] bg-bg-surface border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.2em] mb-1">
                          Employee Alterations
                        </div>
                        <div className="text-3xl font-extrabold text-text-main font-mono">
                          {
                            auditLogs.filter((l) =>
                              l.action.toLowerCase().includes("employee"),
                            ).length
                          }
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center">
                        <Users size={24} />
                      </div>
                    </div>
                    <div className="p-8 rounded-[32px] bg-bg-surface border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.2em] mb-1">
                          Last Server Log
                        </div>
                        <div className="text-sm font-bold text-text-main leading-snug truncate">
                          {auditLogs[0]
                            ? `${auditLogs[0].action}`
                            : "No actions yet"}
                        </div>
                        <div className="text-[10px] text-text-muted font-mono">
                          {auditLogs[0]
                            ? formatTimeSafe(auditLogs[0].timestamp)
                            : ""}
                        </div>
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
                        <h3 className="text-xl font-extrabold text-text-main">
                          Continuous Compliance Trail
                        </h3>
                        <p className="text-xs text-text-muted font-bold uppercase tracking-widest mt-0.5">
                          SOX & ISO 27001 compliant state logs of all corporate
                          share events
                        </p>
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
                            className="bg-transparent border-none outline-none text-[10px] font-extrabold text-text-muted cursor-pointer uppercase tracking-wider text-text-main"
                          >
                            <option value="All" className="bg-bg-surface dark:bg-slate-900 text-text-main">All Categories</option>
                            <option value="Create" className="bg-bg-surface dark:bg-slate-900 text-text-main">
                              Register Stakeholders
                            </option>
                            <option value="Edit" className="bg-bg-surface dark:bg-slate-900 text-text-main">Edit Employees</option>
                            <option value="Delete" className="bg-bg-surface dark:bg-slate-900 text-text-main">Delete Operations</option>
                            <option value="Settings" className="bg-bg-surface dark:bg-slate-900 text-text-main">System Settings</option>
                            <option value="Administrator" className="bg-bg-surface dark:bg-slate-900 text-text-main">
                              Permission Changes
                            </option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Logs Render Frame */}
                    {(() => {
                      const filteredLogs = auditLogs.filter((log) => {
                        const matchesCategory =
                          deptFilter === "All" ||
                          log.action
                            .toLowerCase()
                            .includes(deptFilter.toLowerCase());
                        const matchesQuery =
                          !search ||
                          log.details
                            .toLowerCase()
                            .includes(search.toLowerCase()) ||
                          log.adminEmail
                            .toLowerCase()
                            .includes(search.toLowerCase()) ||
                          log.action
                            .toLowerCase()
                            .includes(search.toLowerCase());
                        return matchesCategory && matchesQuery;
                      });

                      if (filteredLogs.length === 0) {
                        return (
                          <div className="py-16 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                            <History
                              className="mx-auto text-slate-300 dark:text-slate-700 mb-3"
                              size={32}
                            />
                            <span className="block font-bold text-text-muted text-sm">
                              No match found inside logs
                            </span>
                            <p className="text-xs text-text-muted mt-1">
                              Try relaxing your search query or choosing another
                              action filter.
                            </p>
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
                                  <th className="px-6 py-4">
                                    Detailed Description Notes
                                  </th>
                                  <th className="px-6 py-4">Administrator</th>
                                  <th className="px-6 py-4 text-right">
                                    Dispatched At
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans text-xs">
                                {filteredLogs.map((log) => {
                                  // Assign color badge styles based on category
                                  let badgeStyle =
                                    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300";
                                  if (log.action.includes("Create"))
                                    badgeStyle =
                                      "bg-emerald-50 text-emerald-600 border-emerald-100/50 dark:bg-emerald-950/20 dark:text-emerald-400";
                                  if (
                                    log.action.includes("Edit") ||
                                    log.action.includes("Update")
                                  )
                                    badgeStyle =
                                      "bg-blue-50 text-blue-600 border-blue-100/50 dark:bg-blue-950/25 dark:text-blue-400";
                                  if (log.action.includes("Delete"))
                                    badgeStyle =
                                      "bg-red-50 text-red-600 border-red-100/50 dark:bg-red-950/20 dark:text-red-400";
                                  if (log.action.includes("Settings"))
                                    badgeStyle =
                                      "bg-purple-100 text-purple-700 border-purple-200/50 dark:bg-purple-950/20 dark:text-purple-400";

                                  return (
                                    <tr
                                      key={log.id}
                                      className="hover:bg-slate-100/30 dark:hover:bg-slate-900/10 transition-colors"
                                    >
                                      <td className="px-6 py-4 font-mono text-[10px] font-extrabold text-text-muted whitespace-nowrap">
                                        {log.id}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                          className={`inline-block px-2.5 py-1 border rounded-lg text-[9.5px] font-extrabold tracking-wide uppercase ${badgeStyle}`}
                                        >
                                          {log.action}
                                        </span>
                                      </td>
                                      <td className="px-6 py-4 text-text-main font-semibold leading-relaxed">
                                        {log.details}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                          <Avatar
                                            name={log.adminEmail}
                                            size={24}
                                          />
                                          <span className="font-bold text-text-main text-[11.5px]">
                                            {log.adminEmail}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 text-right whitespace-nowrap font-mono text-[11px] text-text-muted">
                                        {formatTimeSafe(log.timestamp)}
                                        <div className="text-[9.5px] text-slate-400 mt-0.5">
                                          {formatDateSafe(log.timestamp)}
                                        </div>
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
                <div className="max-w-5xl mx-auto space-y-10">
                  {/* Unified Configuration Dashboard */}
                  <div className="bg-bg-surface border border-slate-100 dark:border-slate-800 rounded-[40px] p-12 shadow-sm transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-[24px] bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-inner">
                          <Settings size={36} />
                        </div>
                        <div>
                          <h3 className="text-3xl font-extrabold text-text-main tracking-tight">
                            TeachVest Configuration Console
                          </h3>
                          <p className="text-sm text-text-muted font-bold uppercase tracking-widest mt-1">
                            Manage global enterprise settings, templates &
                            broadcasts
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Sub-Tabs Section Header */}
                    <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-1 gap-2 mb-10 scrollbar-none">
                      {[
                        {
                          id: "general",
                          label: "Infrastructure & Pools",
                          icon: Database,
                        },
                        {
                          id: "template",
                          label: "Custom Grant Template",
                          icon: FileText,
                        },
                        {
                          id: "signatory",
                          label: "Authorised Signatory",
                          icon: PenTool,
                        },
                        {
                          id: "policy",
                          label: "Corporate ESOP Policy",
                          icon: Upload,
                        },
                        {
                          id: "approvals",
                          label: "Approvals Ledger",
                          icon: CheckSquare,
                        },
                        {
                          id: "emails",
                          label: "Manual Notification Desk",
                          icon: Mail,
                        },
                        {
                          id: "email_templates",
                          label: "Email Draft Templates",
                          icon: Sliders,
                        },
                        {
                          id: "integrations",
                          label: "Google Workspace & Backups",
                          icon: Cloud,
                        },
                      ].map((sub) => {
                        const isCurrent = settingsSubTab === sub.id;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => setSettingsSubTab(sub.id as any)}
                            className={`flex items-center gap-2.5 px-6 py-3 whitespace-nowrap rounded-t-2xl text-xs font-black uppercase tracking-wider border-b-2 transition-all duration-150 outline-none ${
                              isCurrent
                                ? "border-brand-primary text-brand-primary bg-brand-primary/5 font-extrabold"
                                : "border-transparent text-text-muted hover:text-text-main hover:bg-slate-50 dark:hover:bg-slate-900/40"
                            }`}
                          >
                            <sub.icon size={15} />
                            {sub.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Dynamic Feedback Bubbles */}
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

                    {/* Sub-tab viewport panels */}
                    <div className="space-y-8">
                      {/* GENERAL SUB-TAB */}
                      {settingsSubTab === "general" && (
                        <div className="space-y-8 animate-fadeIn">
                          {/* Spreadsheet Sync Tunnel */}
                          <div className="p-8 rounded-[32px] bg-bg-base dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-[#0F9D58]/10 flex items-center justify-center">
                                  <div className="w-6 h-6 bg-[#0F9D58] rounded-md" />
                                </div>
                                <div>
                                  <span className="font-extrabold text-text-main tracking-tight text-lg">
                                    Teachmint Spreadsheet Sync
                                  </span>
                                  <p className="text-xs text-text-muted font-bold uppercase tracking-widest mt-0.5">
                                    Real-time Data Tunnel
                                  </p>
                                </div>
                              </div>
                              <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40 px-4 py-1.5 rounded-full uppercase tracking-widest">
                                Active Link
                              </span>
                            </div>
                            <div className="flex gap-4">
                              <input
                                readOnly
                                value="https://teachmint.com/api/v1/esop/sync"
                                className="flex-1 bg-bg-surface dark:bg-bg-base border border-slate-200 dark:border-slate-700 rounded-2xl px-6 text-xs font-mono text-text-muted outline-none transition-colors"
                              />
                              <button
                                type="button"
                                className="px-8 py-4 bg-brand-primary text-white rounded-2xl text-xs font-bold shadow-xl shadow-brand-primary/20 hover:scale-[1.02] transition-all"
                              >
                                Manual Flush
                              </button>
                            </div>
                          </div>

                          {/* Liquidity Pool supply block */}
                          <div className="p-8 rounded-[32px] bg-bg-base dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                  <Database size={24} />
                                </div>
                                <div>
                                  <span className="font-black text-slate-950 dark:text-white tracking-tight text-xl font-extrabold block">
                                    Liquidity Pool Management
                                  </span>
                                  <p className="text-xs text-slate-700 dark:text-slate-300 font-extrabold uppercase tracking-widest mt-0.5">
                                    Total ESOP Token Supply
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-end gap-6">
                              <div className="flex-1">
                                <label className="block text-[10px] font-extrabold text-text-muted uppercase tracking-[0.2em] mb-3 ml-1">
                                  Total ESOP Pool (Shares)
                                </label>
                                <div className="relative">
                                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-extrabold text-text-muted">
                                    #
                                  </span>
                                  <input
                                    type="number"
                                    id="settings-total-pool"
                                    value={totalPoolInput}
                                    onChange={(e) =>
                                      setTotalPoolInput(e.target.value)
                                    }
                                    className="w-full bg-bg-surface dark:bg-bg-base border border-slate-200 dark:border-slate-700 rounded-[20px] pl-12 pr-6 py-5 font-extrabold text-2xl text-text-main outline-none focus:ring-4 focus:ring-brand-primary/5 transition-all"
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={handleUpdatePool}
                                className="px-10 py-6 bg-brand-primary text-white rounded-[24px] text-sm font-extrabold shadow-2xl shadow-brand-primary/30 hover:scale-[1.01] transition-all"
                              >
                                Update Pool
                              </button>
                            </div>
                          </div>

                          {/* Valuation updating engine */}
                          <div className="p-8 rounded-[32px] bg-bg-base dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-brand-accent/10 flex items-center justify-center text-brand-accent">
                                  <TrendingUp size={24} />
                                </div>
                                <div>
                                  <span className="font-extrabold text-text-main tracking-tight text-lg">
                                    Grant Valuation Engine
                                  </span>
                                  <p className="text-xs text-text-muted font-bold uppercase tracking-widest mt-0.5">
                                    Automated Price Feeds
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-end gap-6">
                              <div className="flex-1">
                                <label className="block text-[10px] font-extrabold text-text-muted uppercase tracking-[0.2em] mb-3 ml-1 font-bold">
                                  Current Market Valuation (₹)
                                </label>
                                <div className="relative">
                                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-extrabold text-text-muted">
                                    ₹
                                  </span>
                                  <input
                                    type="number"
                                    id="settings-current-fmv"
                                    value={currentFMVInput}
                                    onChange={(e) =>
                                      setCurrentFMVInput(e.target.value)
                                    }
                                    className="w-full bg-bg-surface dark:bg-bg-base border border-slate-200 dark:border-slate-700 rounded-[20px] pl-12 pr-6 py-5 font-extrabold text-2xl text-text-main outline-none focus:ring-4 focus:ring-brand-primary/5 transition-all"
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={handleUpdateFMV}
                                className="px-10 py-6 bg-brand-primary text-white rounded-[24px] text-sm font-extrabold shadow-2xl shadow-brand-primary/30 hover:scale-[1.01] transition-all"
                              >
                                Broadcast Update
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TEMPLATE EDITING SUB-TAB */}
                      {settingsSubTab === "template" &&
                        (() => {
                          const dummyGrantForPreview = {
                            id: "GR-TM-2025-1259",
                            totalShares: 2.11,
                            strikePrice: 1,
                            grantDate: "2025-04-01",
                            vestingSchedule: "Quarterly (Standard)",
                            exercisedShares: 0,
                            workflowStatus: "Draft",
                          };
                          const dummyVestingTableHtml =
                            generateVestingScheduleTableHtml(
                              dummyGrantForPreview,
                              "2025-04-01",
                              "Quarterly",
                              "Standard",
                            );

                          const loadDefaultPreset = () => {
                            setGrantLetterCompanyNameInput(
                              "Teachmint Technologies Private Limited",
                            );
                            setGrantLetterCompanyAddressInput(
                              "5th Floor, North Wing, SJR The HUB, Survey No. 8/2 & 9, Sarjapur Road, Bengaluru, Karnataka - 560103",
                            );
                            setGrantLetterCompanyCINInput(
                              "U62099KA2020PTC135305",
                            );
                            setGrantLetterSubjectInput(
                              "Option offering under Employees’ Stock Option Plan 2020 (ESOP 2020)",
                            );
                            setGrantLetterBodyHeaderInput(
                              "On behalf of <b>{{COMPANY_NAME}}</b> (the “Company”), we are pleased to offer you <b>{{SHARES_QUANTITY}}</b> options under the <b>{{COMPANY_NAME}} Employees’ Stock Option Plan 2020</b>.\n\nBelow are some core parameters of your grant offerings:",
                            );
                            setGrantLetterBodyFooterInput(
                              "These stock options are subject to the detailed terms of the Company's ESOP Policy 2025. By accepting this grant, you agree to respect all board resolutions, vesting structures, and non-disclosure clauses defined therein.\n\nPlease sign below to accept your options offering under corporate guidelines.",
                            );
                            setSettingsSuccess(
                              "Standard professional Teachmint ESOP template loaded into the editor! Click 'Save Changes' to push it live.",
                            );
                            setSettingsError("");
                          };

                          const handleSaveDirect = async () => {
                            setSettingsSuccess("");
                            setSettingsError("");
                            try {
                              await handleUpdateTemplate();
                            } catch (err: any) {
                              setSettingsError(
                                err.message ||
                                  "Failed to update template layout.",
                              );
                            }
                          };

                          return (
                            <div className="space-y-8 animate-fadeIn">
                              {/* Editor workspace title row */}
                              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 bg-slate-50 dark:bg-slate-900 rounded-[24px] border border-slate-100 dark:border-slate-800">
                                <div>
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-brand-primary/10 text-brand-primary uppercase tracking-wider mb-2">
                                    ✍️ PDF Template Studio
                                  </span>
                                  <h3 className="text-2xl font-black text-slate-950 dark:text-white tracking-tight">
                                    Global Offer Letter Customizer
                                  </h3>
                                  <p className="text-xs text-slate-700 dark:text-slate-300 font-extrabold mt-1.5 leading-relaxed">
                                    Amend branding, variables, headers, and
                                    regulatory footers directly. Changes
                                    synchronize live to employee certificates
                                    instantly.
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <button
                                    type="button"
                                    onClick={loadDefaultPreset}
                                    className="px-4 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                                  >
                                    ⚡ Reset to Default Preset
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleSaveDirect}
                                    className="px-5 py-3 bg-brand-primary text-white rounded-xl text-xs font-extrabold uppercase tracking-wide hover:opacity-90 shadow-lg shadow-brand-primary/15 transition-all"
                                  >
                                    💾 Save Template Changes
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                                {/* Left column: PDF interactive parameters panel */}
                                <div className="xl:col-span-6 p-8 rounded-[32px] bg-bg-base dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                                  {/* Segmented subtabs inside the editor */}
                                  <div className="flex bg-slate-100 dark:bg-slate-950 p-1.5 rounded-[18px]">
                                    {[
                                      {
                                        id: "header" as const,
                                        label: "🏢 Header & Info",
                                      },
                                      {
                                        id: "content" as const,
                                        label: "📄 Letter Body",
                                      },
                                      {
                                        id: "footer" as const,
                                        label: "📜 Terms & Sign-off",
                                      },
                                    ].map((tab) => (
                                      <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() =>
                                          setPdfEditorSection(tab.id)
                                        }
                                        className={`flex-1 py-3 text-center text-xs font-black uppercase tracking-wider rounded-[14px] transition-all select-none outline-none ${
                                          pdfEditorSection === tab.id
                                            ? "bg-white dark:bg-slate-800 shadow-sm text-brand-primary"
                                            : "text-text-muted hover:text-text-main"
                                        }`}
                                      >
                                        {tab.label}
                                      </button>
                                    ))}
                                  </div>

                                  {pdfEditorSection === "header" && (
                                    <div className="space-y-6 animate-fadeIn">
                                      <div className="space-y-1">
                                        <h4 className="text-xs font-black text-text-main uppercase tracking-wider">
                                          Company Letterhead Meta
                                        </h4>
                                        <p className="text-[10px] text-text-muted leading-relaxed">
                                          These values form the legal company
                                          metadata on top of the ESOP Contract.
                                        </p>
                                      </div>

                                      <div className="space-y-2">
                                        <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider block">
                                          Company Trade Name
                                        </label>
                                        <input
                                          type="text"
                                          id="settings-grant-company-name-editor"
                                          value={grantLetterCompanyNameInput}
                                          onChange={(e) =>
                                            setGrantLetterCompanyNameInput(
                                              e.target.value,
                                            )
                                          }
                                          onFocus={() =>
                                            setPdfActiveHighlight("company")
                                          }
                                          onBlur={() =>
                                            setPdfActiveHighlight(null)
                                          }
                                          className="w-full px-5 py-4 rounded-[16px] bg-bg-surface border border-slate-200 dark:border-slate-700 font-bold text-sm text-text-main outline-none focus:ring-4 focus:ring-brand-primary/5 transition-all"
                                          placeholder="e.g. Teachmint Technologies Private Limited"
                                        />
                                      </div>

                                      <div className="space-y-2">
                                        <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider block">
                                          Registered Corporate Address
                                        </label>
                                        <input
                                          type="text"
                                          id="settings-grant-company-address-editor"
                                          value={grantLetterCompanyAddressInput}
                                          onChange={(e) =>
                                            setGrantLetterCompanyAddressInput(
                                              e.target.value,
                                            )
                                          }
                                          onFocus={() =>
                                            setPdfActiveHighlight("company")
                                          }
                                          onBlur={() =>
                                            setPdfActiveHighlight(null)
                                          }
                                          className="w-full px-5 py-4 rounded-[16px] bg-bg-surface border border-slate-200 dark:border-slate-700 font-bold text-sm text-text-main outline-none focus:ring-4 focus:ring-brand-primary/5 transition-all"
                                          placeholder="e.g. 5th Floor, North Wing, SJR The HUB, Bengaluru, Karnataka"
                                        />
                                      </div>

                                      <div className="space-y-2">
                                        <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider block">
                                          Corporate Identification Number (CIN)
                                        </label>
                                        <input
                                          type="text"
                                          id="settings-grant-company-cin-editor"
                                          value={grantLetterCompanyCINInput}
                                          onChange={(e) =>
                                            setGrantLetterCompanyCINInput(
                                              e.target.value,
                                            )
                                          }
                                          onFocus={() =>
                                            setPdfActiveHighlight("company")
                                          }
                                          onBlur={() =>
                                            setPdfActiveHighlight(null)
                                          }
                                          className="w-full px-5 py-4 rounded-[16px] bg-bg-surface border border-slate-200 dark:border-slate-700 font-bold text-sm text-text-main outline-none focus:ring-4 focus:ring-brand-primary/5 transition-all"
                                          placeholder="e.g. U62099KA2020PTC135305"
                                        />
                                      </div>

                                      <div className="space-y-2">
                                        <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider block">
                                          Offering Subject Line
                                        </label>
                                        <input
                                          type="text"
                                          id="settings-grant-subject-editor"
                                          value={grantLetterSubjectInput}
                                          onChange={(e) =>
                                            setGrantLetterSubjectInput(
                                              e.target.value,
                                            )
                                          }
                                          onFocus={() =>
                                            setPdfActiveHighlight("subject")
                                          }
                                          onBlur={() =>
                                            setPdfActiveHighlight(null)
                                          }
                                          className="w-full px-5 py-4 rounded-[16px] bg-bg-surface border border-slate-200 dark:border-slate-700 font-bold text-sm text-text-main outline-none focus:ring-4 focus:ring-brand-primary/5 transition-all"
                                          placeholder="Option offering under Employees’ Stock Option Plan"
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {pdfEditorSection === "content" && (
                                    <div className="space-y-6 animate-fadeIn">
                                      <div className="space-y-1">
                                        <h4 className="text-xs font-black text-text-main uppercase tracking-wider">
                                          Letter Core Introduction Block
                                        </h4>
                                        <p className="text-[10px] text-text-muted leading-relaxed">
                                          Type the main intro body of the grant.
                                          The vesting schedule table will
                                          automatically insert immediately below
                                          this block.
                                        </p>
                                      </div>

                                      <div className="space-y-1">
                                        <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider block">
                                          Intro Body Editor
                                        </label>
                                        {renderWordToolbar(
                                          "settings-grant-body-header",
                                        )}
                                        <textarea
                                          rows={8}
                                          id="settings-grant-body-header"
                                          value={grantLetterBodyHeaderInput}
                                          onChange={(e) =>
                                            setGrantLetterBodyHeaderInput(
                                              e.target.value,
                                            )
                                          }
                                          onFocus={() =>
                                            setPdfActiveHighlight("body_header")
                                          }
                                          onBlur={() =>
                                            setPdfActiveHighlight(null)
                                          }
                                          className="w-full p-4 rounded-b-[16px] rounded-t-none bg-bg-surface border border-t-0 border-slate-200 dark:border-slate-700 font-bold text-xs text-text-main outline-none focus:ring-4 focus:ring-brand-primary/5 transition-all resize-y leading-relaxed font-mono"
                                          placeholder="Type the starting text of your grant letter option offer..."
                                        />
                                      </div>
                                    </div>
                                  )}

                                  {pdfEditorSection === "footer" && (
                                    <div className="space-y-6 animate-fadeIn">
                                      <div className="space-y-1">
                                        <h4 className="text-xs font-black text-text-main uppercase tracking-wider">
                                          Closing Clauses & Authorized Signers
                                        </h4>
                                        <p className="text-[10px] text-text-muted leading-relaxed">
                                          Customize legal rules, and the default
                                          authorized manager who signs off
                                          corporate grants.
                                        </p>
                                      </div>

                                      <div className="space-y-1">
                                        <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider block font-bold">
                                          Terms body Editor
                                        </label>
                                        {renderWordToolbar(
                                          "settings-grant-body-footer",
                                        )}
                                        <textarea
                                          rows={6}
                                          id="settings-grant-body-footer"
                                          value={grantLetterBodyFooterInput}
                                          onChange={(e) =>
                                            setGrantLetterBodyFooterInput(
                                              e.target.value,
                                            )
                                          }
                                          onFocus={() =>
                                            setPdfActiveHighlight("body_footer")
                                          }
                                          onBlur={() =>
                                            setPdfActiveHighlight(null)
                                          }
                                          className="w-full p-4 rounded-b-[16px] rounded-t-none bg-bg-surface border border-t-0 border-slate-200 dark:border-slate-700 font-bold text-xs text-text-main outline-none focus:ring-4 focus:ring-brand-primary/5 transition-all resize-y leading-relaxed font-mono"
                                          placeholder="Type the closing/footer terms of your offer letter..."
                                        />
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider block">
                                            Authorized Signatory Name
                                          </label>
                                          <input
                                            type="text"
                                            value={signatoryNameInput}
                                            onChange={(e) =>
                                              setSignatoryNameInput(
                                                e.target.value,
                                              )
                                            }
                                            onFocus={() =>
                                              setPdfActiveHighlight("signatory")
                                            }
                                            onBlur={() =>
                                              setPdfActiveHighlight(null)
                                            }
                                            className="w-full px-5 py-4 rounded-[16px] bg-bg-surface border border-slate-200 dark:border-slate-700 font-bold text-sm text-text-main outline-none focus:ring-4 focus:ring-brand-primary/5 transition-all"
                                            placeholder="e.g. Sanju T"
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-wider block">
                                            Signer Designation
                                          </label>
                                          <input
                                            type="text"
                                            value={signatoryDesignationInput}
                                            onChange={(e) =>
                                              setSignatoryDesignationInput(
                                                e.target.value,
                                              )
                                            }
                                            onFocus={() =>
                                              setPdfActiveHighlight("signatory")
                                            }
                                            onBlur={() =>
                                              setPdfActiveHighlight(null)
                                            }
                                            className="w-full px-5 py-4 rounded-[16px] bg-bg-surface border border-slate-200 dark:border-slate-700 font-bold text-sm text-text-main outline-none focus:ring-4 focus:ring-brand-primary/5 transition-all"
                                            placeholder="e.g. Director"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 space-y-2 text-xs leading-relaxed">
                                    <div className="font-bold text-brand-primary flex items-center gap-1.5 uppercase tracking-wide text-[10px]">
                                      <span>🧠</span> Real-Time Smart
                                      Highlighting
                                    </div>
                                    <p className="text-[10px] text-text-muted">
                                      Click or hover on any input, or hover over
                                      sections of the letters replica on the
                                      right to trigger live workspace syncing
                                      cues. Perfect to proofread variable
                                      mapping.
                                    </p>
                                  </div>
                                </div>

                                {/* Right column: Interactive Live PDF Replica */}
                                <div className="xl:col-span-6 bg-slate-50 dark:bg-slate-950/40 p-8 rounded-[36px] border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                                  <div className="space-y-4">
                                    <div className="flex items-center justify-between ml-1">
                                      <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-widest block">
                                        Draft PDF letter layout mockup
                                      </div>
                                      <span className="flex items-center gap-1 text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>{" "}
                                        Live preview
                                      </span>
                                    </div>

                                    {/* A4/Portrait Styled Mockup Sheet with custom highlight filters */}
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl p-8 font-sans text-slate-800 dark:text-slate-100 space-y-4 text-[10px] leading-relaxed max-h-[700px] overflow-y-auto relative transition-shadow duration-300">
                                      {/* Company Letterhead Section */}
                                      <div
                                        className={`p-3 rounded-2xl transition-all duration-300 relative cursor-pointer ${
                                          pdfActiveHighlight === "company"
                                            ? "ring-2 ring-brand-primary bg-brand-primary/[0.03] shadow-md border-brand-primary scale-[1.01]"
                                            : "border border-transparent hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
                                        }`}
                                        onMouseEnter={() =>
                                          setPdfActiveHighlight("company")
                                        }
                                        onMouseLeave={() =>
                                          setPdfActiveHighlight(null)
                                        }
                                        onClick={() => {
                                          setPdfEditorSection("header");
                                          setTimeout(
                                            () =>
                                              document
                                                .getElementById(
                                                  "settings-grant-company-name-editor",
                                                )
                                                ?.focus(),
                                            50,
                                          );
                                        }}
                                      >
                                        {pdfActiveHighlight === "company" && (
                                          <span className="absolute -top-2.5 right-3 bg-brand-primary text-white font-black uppercase text-[6px] tracking-wider py-0.5 px-1.5 rounded shadow">
                                            Company Info
                                          </span>
                                        )}
                                        <div className="text-center font-sans space-y-0.5 border-b pb-3 border-slate-100 dark:border-slate-800">
                                          <h4 className="text-xs font-black uppercase text-slate-900 dark:text-slate-100">
                                            {grantLetterCompanyNameInput ||
                                              "Teachmint Technologies Private Limited"}
                                          </h4>
                                          <p className="text-[7.5px] font-bold text-slate-400 capitalize">
                                            {grantLetterCompanyAddressInput ||
                                              "5th Floor, North Wing, SJR The HUB, Sarjapur Road, Bengaluru, Karnataka - 560103"}
                                          </p>
                                          <p className="text-[7px] font-mono text-slate-400">
                                            {grantLetterCompanyCINInput ||
                                              "U62099KA2020PTC135305"}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Dates & Reference Block */}
                                      <div className="flex justify-between font-sans text-[7.5px] text-slate-400 uppercase font-bold pt-1 px-3">
                                        <span>REF: REF/ESOP/TEMP_1259</span>
                                        <span>
                                          DATE:{" "}
                                          {new Date().toLocaleDateString(
                                            undefined,
                                            {
                                              year: "numeric",
                                              month: "long",
                                              day: "numeric",
                                            },
                                          )}
                                        </span>
                                      </div>

                                      {/* Recipient Stackholder Block */}
                                      <div className="font-sans text-[8px] text-slate-900 dark:text-slate-100 font-bold space-y-0.5 pt-1 px-3">
                                        <p>To,</p>
                                        <p className="uppercase mt-0.5 font-black text-brand-primary">
                                          Sanju T
                                        </p>
                                        <p className="text-slate-500">
                                          Associate Vice President - Human
                                          Resources & CISO
                                        </p>
                                        <p className="text-slate-400 font-mono">
                                          Employee Unique ID: TE-1259
                                        </p>
                                      </div>

                                      {/* Offer Subject line block */}
                                      <div
                                        className={`p-3 rounded-2xl transition-all duration-300 relative cursor-pointer ${
                                          pdfActiveHighlight === "subject"
                                            ? "ring-2 ring-brand-primary bg-brand-primary/[0.03] shadow-md border-brand-primary scale-[1.01]"
                                            : "border border-transparent hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
                                        }`}
                                        onMouseEnter={() =>
                                          setPdfActiveHighlight("subject")
                                        }
                                        onMouseLeave={() =>
                                          setPdfActiveHighlight(null)
                                        }
                                        onClick={() => {
                                          setPdfEditorSection("header");
                                          setTimeout(
                                            () =>
                                              document
                                                .getElementById(
                                                  "settings-grant-subject-editor",
                                                )
                                                ?.focus(),
                                            50,
                                          );
                                        }}
                                      >
                                        {pdfActiveHighlight === "subject" && (
                                          <span className="absolute -top-2.5 right-3 bg-brand-primary text-white font-black uppercase text-[6px] tracking-wider py-0.5 px-1.5 rounded shadow">
                                            Offer Subject
                                          </span>
                                        )}
                                        <div className="text-center font-sans font-black uppercase text-[8px] tracking-wide text-slate-900 dark:text-slate-100 underline decoration-indigo-500 decoration-1">
                                          {grantLetterSubjectInput ||
                                            "Option offering under Employees’ Stock Option Plan 2020 (ESOP 2020)"}
                                        </div>
                                      </div>

                                      <p className="text-slate-700 dark:text-slate-300 font-sans border-t pt-2 border-slate-100 dark:border-slate-800 px-3">
                                        Dear{" "}
                                        <strong className="font-sans capitalize">
                                          Sanju T
                                        </strong>
                                        ,
                                      </p>

                                      {/* Core Intro paragraph Header Block */}
                                      <div
                                        className={`p-3 rounded-2xl transition-all duration-300 relative cursor-pointer ${
                                          pdfActiveHighlight === "body_header"
                                            ? "ring-2 ring-brand-primary bg-brand-primary/[0.03] shadow-md border-brand-primary scale-[1.01]"
                                            : "border border-transparent hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
                                        }`}
                                        onMouseEnter={() =>
                                          setPdfActiveHighlight("body_header")
                                        }
                                        onMouseLeave={() =>
                                          setPdfActiveHighlight(null)
                                        }
                                        onClick={() => {
                                          setPdfEditorSection("content");
                                          setTimeout(
                                            () =>
                                              document
                                                .getElementById(
                                                  "settings-grant-body-header",
                                                )
                                                ?.focus(),
                                            50,
                                          );
                                        }}
                                      >
                                        {pdfActiveHighlight ===
                                          "body_header" && (
                                          <span className="absolute -top-2.5 right-3 bg-brand-primary text-white font-black uppercase text-[6px] tracking-wider py-0.5 px-1.5 rounded shadow">
                                            Intro Block
                                          </span>
                                        )}
                                        <div
                                          className="text-slate-700 dark:text-slate-300 font-sans leading-relaxed text-[10px] space-y-1.5 whitespace-pre-wrap"
                                          dangerouslySetInnerHTML={{
                                            __html: replaceLetterPlaceholders(
                                              grantLetterBodyHeaderInput,
                                              "Sanju T",
                                              "2.11",
                                              "INR 1/- (Indian Rupees One only)",
                                              "Quarterly (Standard)",
                                              grantLetterCompanyNameInput ||
                                                "Teachmint Technologies Private Limited",
                                              "April 01, 2025",
                                              signatoryNameInput ||
                                                "Mihir Gupta",
                                              signatoryDesignationInput ||
                                                "Co-Founder & CEO",
                                              grantLetterCompanyAddressInput ||
                                                "5th Floor, North Wing, SJR The HUB, Survey No. 8/2 & 9, Sarjapur Road, Bengaluru, Karnataka - 560103",
                                              grantLetterCompanyCINInput ||
                                                "CIN: U62099KA2020PTC135305",
                                              "TE-1259",
                                              "Associate Vice President - Human Resources & CISO",
                                              "Human Resources & Security",
                                              dummyVestingTableHtml,
                                            ).replace(/\n/g, "<br/>"),
                                          }}
                                        />
                                      </div>

                                      {/* Embedded Table Block */}
                                      <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <div className="text-[8px] font-black uppercase text-brand-primary mb-2 flex items-center gap-1.5">
                                          <span>📅</span> Vesting Terms
                                          (Resolved Parameter:{" "}
                                          {"{{VESTING_SCHEDULE_TABLE}}"})
                                        </div>
                                        <div
                                          className="font-sans leading-relaxed"
                                          dangerouslySetInnerHTML={{
                                            __html: dummyVestingTableHtml,
                                          }}
                                        />

                                        <div className="grid grid-cols-2 gap-3 font-sans mt-3 border-t pt-2 border-slate-200 dark:border-slate-800 text-[7.5px] font-extrabold uppercase text-slate-400">
                                          <div>
                                            <p className="text-[6px] text-slate-400">
                                              Total Shares Offered
                                            </p>
                                            <p className="text-slate-800 dark:text-slate-200 text-[10px] font-black">
                                              2.11 Units
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-[6px] text-slate-400">
                                              Option strike price
                                            </p>
                                            <p className="text-emerald-500 text-[10px] font-black">
                                              INR 1/-
                                            </p>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Core Footer terms and conditions Block */}
                                      <div
                                        className={`p-3 rounded-2xl transition-all duration-300 relative cursor-pointer ${
                                          pdfActiveHighlight === "body_footer"
                                            ? "ring-2 ring-brand-primary bg-brand-primary/[0.03] shadow-md border-brand-primary scale-[1.01]"
                                            : "border border-transparent hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
                                        }`}
                                        onMouseEnter={() =>
                                          setPdfActiveHighlight("body_footer")
                                        }
                                        onMouseLeave={() =>
                                          setPdfActiveHighlight(null)
                                        }
                                        onClick={() => {
                                          setPdfEditorSection("footer");
                                          setTimeout(
                                            () =>
                                              document
                                                .getElementById(
                                                  "settings-grant-body-footer",
                                                )
                                                ?.focus(),
                                            50,
                                          );
                                        }}
                                      >
                                        {pdfActiveHighlight ===
                                          "body_footer" && (
                                          <span className="absolute -top-2.5 right-3 bg-brand-primary text-white font-black uppercase text-[6px] tracking-wider py-0.5 px-1.5 rounded shadow">
                                            Closing Clauses
                                          </span>
                                        )}
                                        <div
                                          className="text-slate-700 dark:text-slate-300 font-sans leading-relaxed text-[10px] space-y-1.5 whitespace-pre-wrap"
                                          dangerouslySetInnerHTML={{
                                            __html: replaceLetterPlaceholders(
                                              grantLetterBodyFooterInput,
                                              "Sanju T",
                                              "2.11",
                                              "INR 1/- (Indian Rupees One only)",
                                              "Quarterly (Standard)",
                                              grantLetterCompanyNameInput ||
                                                "Teachmint Technologies Private Limited",
                                              "April 01, 2025",
                                              signatoryNameInput ||
                                                "Mihir Gupta",
                                              signatoryDesignationInput ||
                                                "Co-Founder & CEO",
                                              grantLetterCompanyAddressInput ||
                                                "5th Floor, North Wing, SJR The HUB, Survey No. 8/2 & 9, Sarjapur Road, Bengaluru, Karnataka - 560103",
                                              grantLetterCompanyCINInput ||
                                                "CIN: U62099KA2020PTC135305",
                                              "TE-1259",
                                              "Associate Vice President - Human Resources & CISO",
                                              "Human Resources & Security",
                                              dummyVestingTableHtml,
                                            ).replace(/\n/g, "<br/>"),
                                          }}
                                        />
                                      </div>

                                      {/* Signatory Verification Panel */}
                                      <div
                                        className={`pt-4 p-3 border-t border-dashed border-slate-200 dark:border-slate-800 grid grid-cols-2 text-[7px] font-sans font-bold relative cursor-pointer transition-all ${
                                          pdfActiveHighlight === "signatory"
                                            ? "ring-2 ring-brand-primary bg-brand-primary/[0.03] shadow-md border-brand-primary rounded-xl"
                                            : ""
                                        }`}
                                        onMouseEnter={() =>
                                          setPdfActiveHighlight("signatory")
                                        }
                                        onMouseLeave={() =>
                                          setPdfActiveHighlight(null)
                                        }
                                        onClick={() =>
                                          setPdfEditorSection("footer")
                                        }
                                      >
                                        {pdfActiveHighlight === "signatory" && (
                                          <span className="absolute -top-2.5 right-3 bg-brand-primary text-white font-black uppercase text-[6px] tracking-wider py-0.5 px-1.5 rounded shadow">
                                            Signatures
                                          </span>
                                        )}
                                        <div>
                                          <p className="text-[6px] text-slate-400 uppercase mb-0.5">
                                            Authorised Signatory
                                          </p>
                                          <span className="text-emerald-500 font-extrabold flex items-center gap-0.5 text-[8px] uppercase">
                                            ✓ Digitally Signed
                                          </span>
                                          <p className="text-slate-900 dark:text-slate-100 uppercase font-black mt-1">
                                            {signatoryNameInput || "Sanju T"}
                                          </p>
                                          <p className="text-[6px] text-slate-400">
                                            {signatoryDesignationInput ||
                                              "Director"}
                                          </p>
                                        </div>
                                        <div className="border-l border-dashed border-slate-200 dark:border-slate-800 pl-4">
                                          <p className="text-[6px] text-slate-400 uppercase mb-0.5">
                                            Employee E-Signature
                                          </p>
                                          <span className="text-slate-400">
                                            Pending Execution...
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 p-4 rounded-2xl text-[10px] tracking-wide leading-relaxed font-bold mt-4 flex items-start gap-2">
                                    <AlertCircle
                                      size={14}
                                      className="mt-0.5 flex-shrink-0"
                                    />
                                    <span>
                                      This interactive replica updates in
                                      real-time as you format blocks. Saving
                                      persists this layout worldwide for new and
                                      active stakeholders.
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                      {/* SIGNATORY DESK SUB-TAB */}
                      {settingsSubTab === "signatory" && (
                        <div className="space-y-8 animate-fadeIn">
                          <div className="p-8 rounded-[32px] bg-bg-base dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                              <div>
                                <span className="font-extrabold text-slate-950 dark:text-white tracking-tight text-xl block">
                                  Authorised Corporate Signatory
                                </span>
                                <p className="text-xs text-slate-700 dark:text-slate-300 font-extrabold uppercase tracking-widest mt-0.5">
                                  Corporate officer approved to execute option
                                  offering documents
                                </p>
                              </div>
                              <span className="text-[10px] font-extrabold text-blue-600 bg-blue-100 dark:bg-blue-950/40 px-4 py-1.5 rounded-full uppercase tracking-widest">
                                Sign-off Authority
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="space-y-1.5 col-span-1">
                                <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] block">
                                  Full Corporate Name
                                </label>
                                <input
                                  type="text"
                                  id="settings-signatory-name"
                                  value={signatoryNameInput}
                                  onChange={(e) =>
                                    setSignatoryNameInput(e.target.value)
                                  }
                                  className="w-full px-5 py-4 rounded-[16px] bg-bg-surface border border-slate-200 dark:border-slate-700 font-bold text-sm text-text-main focus:ring-4 focus:ring-brand-primary/5 outline-none transition-all"
                                />
                              </div>

                              <div className="space-y-1.5 col-span-1">
                                <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] block font-extrabold">
                                  Professional Designation
                                </label>
                                <input
                                  type="text"
                                  id="settings-signatory-designation"
                                  value={signatoryDesignationInput}
                                  onChange={(e) =>
                                    setSignatoryDesignationInput(e.target.value)
                                  }
                                  className="w-full px-5 py-4 rounded-[16px] bg-bg-surface border border-slate-200 dark:border-slate-700 font-bold text-sm text-text-main focus:ring-4 focus:ring-brand-primary/5 outline-none transition-all"
                                />
                              </div>

                              <div className="space-y-1.5 col-span-1">
                                <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] block">
                                  Official Email Address
                                </label>
                                <input
                                  type="email"
                                  id="settings-signatory-email"
                                  value={signatoryEmailInput}
                                  onChange={(e) =>
                                    setSignatoryEmailInput(e.target.value)
                                  }
                                  className="w-full px-5 py-4 rounded-[16px] bg-bg-surface border border-slate-200 dark:border-slate-700 font-bold text-sm text-text-main focus:ring-4 focus:ring-brand-primary/5 outline-none transition-all"
                                />
                              </div>
                            </div>

                            {/* Signatory platform administrator on the fly creator box */}
                            <div className="p-6 bg-brand-primary/5 border border-brand-primary/10 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                              <div className="space-y-1 md:max-w-xl">
                                <div className="text-xs font-black text-brand-primary uppercase tracking-wider">
                                  Configure Signatory Login Privileges
                                </div>
                                <p className="text-xs text-text-muted leading-relaxed">
                                  Check this to create an active administrative
                                  account for the signatory with password{" "}
                                  <strong>'signatory123'</strong> so they may
                                  login to TeachVest using their official email
                                  to execute and e-sign outstanding employee
                                  certificates directly.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUpdateSignatory(true)}
                                className="px-6 py-3 whitespace-nowrap bg-brand-primary text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-primary/15 hover:scale-[1.02] transition-all"
                              >
                                Save & Provision Admin
                              </button>
                            </div>

                            <div className="flex justify-end pt-2 gap-4">
                              <button
                                type="button"
                                onClick={() => handleUpdateSignatory(false)}
                                className="px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 rounded-xl text-xs font-bold transition-all"
                              >
                                Save Signatory Details Only
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* CORPORATE ESOP POLICY SUB-TAB */}
                      {settingsSubTab === "policy" && (
                        <div className="space-y-8 animate-fadeIn">
                          <div className="p-8 rounded-[32px] bg-bg-base dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                              <div>
                                <span className="font-extrabold text-text-main tracking-tight text-lg">
                                  Default Corporate ESOP Policy Document
                                </span>
                                <p className="text-xs text-text-muted font-bold uppercase tracking-widest mt-0.5">
                                  Published globally for all stakeholders to
                                  view & download
                                </p>
                              </div>
                            </div>

                            {/* Current Active global policy document details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Left upload card */}
                              <div className="p-8 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 bg-bg-surface dark:bg-slate-950 flex flex-col justify-between min-h-[220px]">
                                <div className="space-y-2">
                                  <div className="text-[10px] font-extrabold text-brand-primary uppercase tracking-[0.2em]">
                                    Publish New Policy Document
                                  </div>
                                  <p className="text-xs text-text-muted leading-relaxed">
                                    Upload any custom ESOP instruction or
                                    regulatory guidelines document. This will
                                    dynamically overwrite the default
                                    "Teach_Vest Policy Document" and publish
                                    instant downloads to all stakeholders'
                                    official documents drawer.
                                  </p>
                                </div>

                                <div className="pt-6">
                                  <input
                                    type="file"
                                    accept=".pdf,.txt,.doc,.docx"
                                    id="policy-doc-setup-uploader"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onload = async () => {
                                          const baseDataUrl =
                                            reader.result as string;
                                          await handleUpdatePolicy(
                                            file.name,
                                            baseDataUrl,
                                          );
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    }}
                                    className="hidden"
                                  />
                                  <label
                                    htmlFor="policy-doc-setup-uploader"
                                    className="cursor-pointer inline-flex items-center gap-2 px-6 py-4 bg-slate-900 text-white dark:bg-white dark:text-slate-950 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg hover:scale-[1.02] transition-all"
                                  >
                                    <Upload size={14} />
                                    Choose & Upload Policy File
                                  </label>
                                </div>
                              </div>

                              {/* Right status dashboard card */}
                              <div className="p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between">
                                <div className="space-y-4">
                                  <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.2em]">
                                    Current Active Global Document
                                  </div>

                                  <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                    <div className="w-12 h-12 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center">
                                      <FileText size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-extrabold text-xs text-text-main truncate">
                                        {defaultEsopPolicyFileNameInput}
                                      </p>
                                      <p className="text-[9px] text-text-muted font-bold mt-0.5">
                                        SIZE:{" "}
                                        {defaultEsopPolicyFileUrlInput ===
                                        "/api/settings/policy-download"
                                          ? "Flexible / Managed"
                                          : defaultEsopPolicyFileUrlInput
                                            ? `~${Math.round(defaultEsopPolicyFileUrlInput.length / 1024)} KB`
                                            : "42 KB"}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {defaultEsopPolicyFileUrlInput ? (
                                  <div className="pt-6 flex gap-3">
                                    <a
                                      href={defaultEsopPolicyFileUrlInput}
                                      download={defaultEsopPolicyFileNameInput}
                                      className="flex-1 text-center py-3.5 bg-brand-primary text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-primary/10 hover:scale-[1.01] transition-all"
                                    >
                                      Download Policy
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleUpdatePolicy(
                                          "Teachmint_Global_ESOP_Policy_2025.pdf",
                                          "",
                                        )
                                      }
                                      className="px-5 py-3.5 bg-slate-100 dark:bg-slate-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl text-xs font-bold transition-all"
                                    >
                                      Reset
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-text-muted font-semibold mt-4">
                                    ✓ Currently displaying default fallback
                                    system document. Uploading will activate
                                    dynamic storage downloads.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* APPROVALS LEDGER MASTER SUB-TAB */}
                      {settingsSubTab === "approvals" && (
                        <div className="space-y-8 animate-fadeIn">
                          <div className="p-8 rounded-[32px] bg-bg-base dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                              <div>
                                <span className="font-extrabold text-text-main tracking-tight text-lg">
                                  Sign-off Approvals & Execution Tracking Ledger
                                </span>
                                <p className="text-xs text-text-muted font-bold uppercase tracking-widest mt-0.5">
                                  Global audit view of corporate sign-off loops
                                  and timestamp stamps
                                </p>
                              </div>
                            </div>

                            <div className="overflow-hidden border border-slate-100 dark:border-slate-800 rounded-3xl bg-bg-surface dark:bg-slate-950">
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="bg-slate-100/50 dark:bg-slate-900 border-b border-slate-200/50 dark:border-slate-800 text-[10px] font-extrabold text-text-muted uppercase tracking-wider">
                                      <th className="px-6 py-4">
                                        Stakeholder Profile
                                      </th>
                                      <th className="px-6 py-4">Grant Info</th>
                                      <th className="px-6 py-4 text-center">
                                        Status Index
                                      </th>
                                      <th className="px-6 py-4">
                                        Corporate Signatory (Stamp)
                                      </th>
                                      <th className="px-6 py-4">
                                        Employee Execution (Stamp)
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans text-xs">
                                    {employees.flatMap((emp) => {
                                      const grant = emp.grants?.[0];
                                      if (!grant) return [];

                                      const isSig =
                                        !!grant.signatorySignedDate ||
                                        grant.workflowStatus ===
                                          "Pending Employee Signature" ||
                                        grant.workflowStatus === "Fully Signed";
                                      const isEmp =
                                        !!grant.employeeEsignDate ||
                                        grant.workflowStatus === "Fully Signed";

                                      const totalSharesFmt =
                                        grant.totalShares.toLocaleString();
                                      const fmvText = companySettings.currentFMV
                                        ? `(₹${(grant.totalShares * companySettings.currentFMV).toLocaleString()})`
                                        : "";

                                      return [
                                        <tr
                                          key={grant.id}
                                          className="hover:bg-slate-100/45 dark:hover:bg-slate-900/30 transition-colors"
                                        >
                                          <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                              <Avatar
                                                name={emp.name}
                                                size={32}
                                              />
                                              <div>
                                                <p className="font-black text-text-main text-sm">
                                                  {emp.name}
                                                </p>
                                                <p className="text-[10px] text-text-muted font-bold uppercase mt-0.5">
                                                  {emp.designation}
                                                </p>
                                              </div>
                                            </div>
                                          </td>
                                          <td className="px-6 py-4 font-mono">
                                            <p className="font-black text-xs text-brand-primary">
                                              {grant.id}
                                            </p>
                                            <p className="text-[11px] text-text-main font-bold mt-0.5">
                                              {totalSharesFmt} shares {fmvText}
                                            </p>
                                          </td>
                                          <td className="px-6 py-4 text-center whitespace-nowrap">
                                            <StatusBadge
                                              status={grant.workflowStatus}
                                            />
                                          </td>
                                          <td className="px-6 py-4 font-sans whitespace-nowrap">
                                            {isSig ? (
                                              <div className="text-emerald-500 font-bold space-y-0.5">
                                                <div className="flex items-center gap-1">
                                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                                  <span>✓ E-Signed</span>
                                                </div>
                                                <p className="text-[9.5px] text-slate-400 font-mono font-medium">
                                                  {grant.signatorySignedDate
                                                    ? formatDateTimeSafe(
                                                        grant.signatorySignedDate,
                                                      )
                                                    : formatDateSafe(
                                                        grant.grantDate,
                                                      )}
                                                </p>
                                              </div>
                                            ) : (
                                              <span className="text-amber-500 dark:text-amber-400 font-bold flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" />
                                                <span>Pending Signature</span>
                                              </span>
                                            )}
                                          </td>
                                          <td className="px-6 py-4 font-sans whitespace-nowrap">
                                            {isEmp ? (
                                              <div className="text-emerald-500 font-bold space-y-0.5">
                                                <div className="flex items-center gap-1">
                                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                                  <span>✓ Jointly Signed</span>
                                                </div>
                                                <p className="text-[9.5px] text-slate-400 font-mono font-medium">
                                                  {grant.employeeEsignDate
                                                    ? formatDateTimeSafe(
                                                        grant.employeeEsignDate,
                                                      )
                                                    : "Audit timestamp verified"}
                                                </p>
                                              </div>
                                            ) : (
                                              <span className="text-slate-400 font-bold flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
                                                <span>Pending Employee</span>
                                              </span>
                                            )}
                                          </td>
                                        </tr>,
                                      ];
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* INDIVIDUAL & BULK EMAIL BROADCAST STATION */}
                      {settingsSubTab === "emails" && (
                        <div className="space-y-8 animate-fadeIn">
                          {/* Bulk actions panel */}
                          <div className="p-8 rounded-[36px] bg-bg-base dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                            <span className="font-extrabold text-text-main tracking-tight text-lg block">
                              Enterprise Bulk Notification Broadcasts
                            </span>
                            <p className="text-xs text-text-muted leading-relaxed">
                              Instantly dispatch customized email campaigns to
                              the entire stakeholder network. Reminders are
                              smart-addressed - they will bypass already signed
                              employees and focus only on pending stakeholders.
                            </p>

                            {bulkDispatchSuccess && (
                              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-600 dark:text-blue-400 text-xs font-bold leading-relaxed">
                                {bulkDispatchSuccess}
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                              {/* Option 1: Welcome invitations to everyone */}
                              <div className="p-6 bg-blue-500/[0.02] border border-blue-500/10 hover:border-blue-500/20 rounded-3xl transition-all space-y-4 flex flex-col justify-between">
                                <div className="space-y-1">
                                  <div className="text-xs font-black text-blue-500 uppercase tracking-widest">
                                    Broadcast Invitation Credentials
                                  </div>
                                  <p className="text-[11.5px] text-text-muted leading-relaxed">
                                    Dispatches welcoming mail containing
                                    temporary login credentials and active ESOP
                                    landing URLs to{" "}
                                    <strong>every registered employee</strong> (
                                    {employees.length}) in the registry.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  disabled={bulkDispatching}
                                  onClick={() =>
                                    handleBulkDispatchEmails("welcome")
                                  }
                                  className="w-full py-4 bg-brand-primary text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:scale-[1.01] transition-all disabled:opacity-50"
                                >
                                  {bulkDispatching
                                    ? "Executing campaign..."
                                    : "Dispatch Bulks Credentials Invitation"}
                                </button>
                              </div>

                              {/* Option 2: Reminders only to unsigned profiles */}
                              <div className="p-6 bg-amber-500/[0.02] border border-amber-500/10 hover:border-amber-500/20 rounded-3xl transition-all space-y-4 flex flex-col justify-between">
                                <div className="space-y-1">
                                  <div className="text-xs font-black text-amber-500 uppercase tracking-widest">
                                    Broadcast outstanding Signatures Alert
                                  </div>
                                  <p className="text-[11.5px] text-text-muted leading-relaxed">
                                    Smart campaign dispatches warning reminder
                                    alerts directly to stakeholders currently
                                    pending e-signature of their offering.
                                    Bypasses fully executed contracts.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  disabled={bulkDispatching}
                                  onClick={() =>
                                    handleBulkDispatchEmails("esign_reminder")
                                  }
                                  className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:scale-[1.01] transition-all disabled:opacity-50"
                                >
                                  {bulkDispatching
                                    ? "Executing campaign..."
                                    : "Broadcast Outstanding E-Signs Reminder"}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Individual Stakeholder manual override actions */}
                          <div className="p-8 rounded-[36px] bg-bg-base dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                            <span className="font-extrabold text-text-main tracking-tight text-md block">
                              Individual Stakeholder Alert Station
                            </span>

                            <div className="overflow-hidden border border-slate-100 dark:border-slate-800 rounded-3xl bg-bg-surface dark:bg-slate-950">
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="bg-slate-100/50 dark:bg-slate-900 border-b border-slate-200/50 dark:border-slate-800 text-[10px] font-extrabold text-text-muted uppercase tracking-wider">
                                      <th className="px-6 py-4">Stakeholder</th>
                                      <th className="px-6 py-4">
                                        Credentials Preview
                                      </th>
                                      <th className="px-6 py-4">
                                        ESOP signature Progress
                                      </th>
                                      <th className="px-6 py-4 text-right">
                                        Instant Dispatch Actions
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans text-xs">
                                    {employees.map((emp) => {
                                      const grant = emp.grants?.[0];
                                      return (
                                        <tr
                                          key={emp.id}
                                          className="hover:bg-slate-100/40 dark:hover:bg-slate-900/40 transition-all"
                                        >
                                          <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                              <Avatar
                                                name={emp.name}
                                                size={30}
                                              />
                                              <div>
                                                <p className="font-extrabold text-sm text-text-main">
                                                  {emp.name}
                                                </p>
                                                <p className="text-[10px] text-text-muted font-bold uppercase mt-0.5">
                                                  {emp.email}
                                                </p>
                                              </div>
                                            </div>
                                          </td>
                                          <td className="px-6 py-4">
                                            <p className="text-text-main font-semibold">
                                              PW:{" "}
                                              <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-brand-primary font-mono">
                                                {emp.password || "login123"}
                                              </code>
                                            </p>
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap">
                                            {grant ? (
                                              <span
                                                className={`inline-block text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${grant.workflowStatus === "Fully Signed" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border border-amber-500/20"}`}
                                              >
                                                {grant.workflowStatus}
                                              </span>
                                            ) : (
                                              <span className="text-slate-400 font-bold uppercase">
                                                No Active Grant
                                              </span>
                                            )}
                                          </td>
                                          <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                                            <button
                                              type="button"
                                              onClick={async (e) => {
                                                const btn = e.currentTarget;
                                                btn.disabled = true;
                                                const textBefore =
                                                  btn.innerText;
                                                btn.innerText =
                                                  "Dispatching...";
                                                const ok =
                                                  await handleTriggerIndividualEmail(
                                                    emp,
                                                    "welcome",
                                                  );
                                                btn.innerText = ok
                                                  ? "✓ Welcomed!"
                                                  : "Failed";
                                                setTimeout(() => {
                                                  btn.disabled = false;
                                                  btn.innerText = textBefore;
                                                }, 3000);
                                              }}
                                              className="px-3.5 py-1.5 bg-blue-500/1s text-[10px] font-extrabold tracking-wide uppercase bg-brand-primary/10 hover:bg-brand-primary text-brand-primary hover:text-white rounded-lg transition-all"
                                            >
                                              Send Invitation
                                            </button>

                                            {grant &&
                                              grant.workflowStatus !==
                                                "Fully Signed" && (
                                                <button
                                                  type="button"
                                                  onClick={async (e) => {
                                                    const btn = e.currentTarget;
                                                    btn.disabled = true;
                                                    const textBefore =
                                                      btn.innerText;
                                                    btn.innerText =
                                                      "Dispatching...";
                                                    const ok =
                                                      await handleTriggerIndividualEmail(
                                                        emp,
                                                        "esign_reminder",
                                                      );
                                                    btn.innerText = ok
                                                      ? "✓ Reminded!"
                                                      : "Failed";
                                                    setTimeout(() => {
                                                      btn.disabled = false;
                                                      btn.innerText =
                                                        textBefore;
                                                    }, 3000);
                                                  }}
                                                  className="px-3.5 py-1.5 text-[10px] font-extrabold tracking-wide uppercase bg-amber-500/10 hover:bg-amber-500 text-amber-500 hover:text-white rounded-lg transition-all border border-amber-500/20"
                                                >
                                                  Send E-Sign reminder
                                                </button>
                                              )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>

                          {/* Email Outbox delivery log logs */}
                          <div className="p-8 rounded-[40px] bg-bg-surface dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                            <div className="flex items-center gap-4 mb-4">
                              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 shadow-inner">
                                <Mail size={24} />
                              </div>
                              <div>
                                <span className="font-extrabold text-text-main tracking-tight text-lg">
                                  SMTP Outbox delivery log logs
                                </span>
                                <p className="text-xs text-text-muted font-bold uppercase tracking-widest mt-0.5">
                                  Simulated corporate SMTP email delivery outbox
                                </p>
                              </div>
                            </div>

                            <p className="text-xs text-text-muted leading-relaxed">
                              When system credentials or reminders are
                              triggered, the digital communications containing
                              stakeholders temporary access passwords are logged
                              here in chronological sequence.
                            </p>

                            {emails.length === 0 ? (
                              <div className="py-12 text-center rounded-[32px] bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-800">
                                <Mail
                                  className="mx-auto text-slate-300 dark:text-slate-700 mb-3"
                                  size={40}
                                />
                                <span className="block font-bold text-text-muted text-sm">
                                  No emails sent yet
                                </span>
                                <p className="text-xs text-text-muted mt-1">
                                  Creation of new admins or employee profiles
                                  triggers auto-dispatch.
                                </p>
                              </div>
                            ) : (
                              <div className="overflow-hidden border border-slate-100 dark:border-slate-800 rounded-3xl bg-bg-base dark:bg-slate-950/45">
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left border-collapse">
                                    <thead>
                                      <tr className="bg-slate-100/50 dark:bg-slate-900 border-b border-slate-200/50 dark:border-slate-800 text-[10px] font-extrabold text-text-muted uppercase tracking-wider">
                                        <th className="px-6 py-4">
                                          Status & ID
                                        </th>
                                        <th className="px-6 py-4">
                                          Recipient Stakeholder
                                        </th>
                                        <th className="px-6 py-4">Subject</th>
                                        <th className="px-6 py-4">
                                          Dispatched At
                                        </th>
                                        <th className="px-6 py-4 text-right">
                                          Actions
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans text-xs">
                                      {emails.map((email) => (
                                        <tr
                                          key={email.id}
                                          className="hover:bg-slate-100/40 dark:hover:bg-slate-900/30 transition-colors"
                                        >
                                          <td className="px-6 py-4 font-mono font-bold text-text-muted">
                                            <div className="flex items-center gap-2">
                                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                              <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2.5 py-0.5 rounded-full uppercase font-extrabold">
                                                DELIVERED
                                              </span>
                                            </div>
                                            <div className="mt-1 text-[10px] tracking-wide text-slate-400">
                                              ID: {email.id}
                                            </div>
                                          </td>
                                          <td className="px-6 py-4">
                                            <div className="font-extrabold text-text-main text-sm">
                                              {email.name}
                                            </div>
                                            <div className="text-text-muted font-medium mt-0.5">
                                              {email.recipient}
                                            </div>
                                            <span
                                              className={`inline-block mt-1 text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${email.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}
                                            >
                                              {email.role}
                                            </span>
                                          </td>
                                          <td className="px-6 py-4 max-w-xs truncate">
                                            <span className="font-semibold text-text-main">
                                              {email.subject}
                                            </span>
                                            <div className="text-text-muted mt-0.5 truncate text-[11px]">
                                              Passcode:{" "}
                                              <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-black text-brand-primary">
                                                {email.password}
                                              </code>
                                            </div>
                                          </td>
                                          <td className="px-6 py-4 text-text-muted font-bold whitespace-nowrap">
                                            {formatTimeSafe(email.sentAt)}
                                            <div className="text-[10.5px] font-normal text-text-muted mt-0.5">
                                              {formatDateSafe(email.sentAt)}
                                            </div>
                                          </td>
                                          <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setSelectedMail(email)
                                              }
                                              className="px-4 py-2 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 rounded-xl text-[11px] font-extrabold uppercase tracking-wider transition-all"
                                            >
                                              Inspect Render
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

                      {/* SYSTEM EMAIL DRAFT TEMPLATES SUB-TAB */}
                      {settingsSubTab === "email_templates" && (
                        <div className="space-y-8 animate-fadeIn">
                          <div className="p-8 rounded-[32px] bg-bg-base dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                            <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
                              <span className="font-extrabold text-text-main tracking-tight text-lg flex items-center gap-2">
                                <Sliders className="text-brand-primary" size={20} />
                                Customizable System Email Templates
                              </span>
                              <p className="text-xs text-text-muted font-bold uppercase tracking-widest mt-0.5">
                                Draft custom subjects and body HTML for company-wide notifications & alerts
                              </p>
                            </div>

                            {/* Error & Success indicators */}
                            {settingsSuccess && (
                              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 text-xs font-bold leading-relaxed">
                                {settingsSuccess}
                              </div>
                            )}
                            {settingsError && (
                              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 text-xs font-bold leading-relaxed">
                                {settingsError}
                              </div>
                            )}

                            {/* Tab selector for the 4 emails inside templates tab */}
                            <div className="grid grid-cols-1 gap-8">
                              {/* 1. Employee Welcome Invite Email Template card */}
                              <div className="p-6 rounded-[24px] bg-bg-surface dark:bg-slate-950 border border-slate-150 dark:border-slate-800 space-y-4">
                                <div className="flex items-center justify-between">
                                  <div className="space-y-0.5">
                                    <span className="text-sm font-black text-text-main">
                                      Employee Welcome Invitation Email
                                    </span>
                                    <p className="text-[11px] text-text-muted">
                                      Sent automatically when a new employee profile is registered in the cap-table
                                    </p>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                                      Subject Line
                                    </label>
                                    <input
                                      type="text"
                                      value={employeeInviteSubjectInput}
                                      onChange={(e) => setEmployeeInviteSubjectInput(e.target.value)}
                                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-bg-base text-sm text-text-main font-semibold outline-none"
                                      placeholder="Welcome to Teachmint"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                                      Email Body (HTML Supported)
                                    </label>
                                    <textarea
                                      rows={6}
                                      value={employeeInviteBodyInput}
                                      onChange={(e) => setEmployeeInviteBodyInput(e.target.value)}
                                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-bg-base text-xs font-mono text-text-main outline-none"
                                    />
                                  </div>
                                  {/* Placeholders badge list */}
                                  <div className="flex flex-wrap gap-2 pt-1">
                                    <span className="text-[10px] font-extrabold text-text-muted uppercase">Placeholders:</span>
                                    {["{{NAME}}", "{{EMAIL}}", "{{PASSWORD}}", "{{DESIGNATION}}", "{{DEPARTMENT}}", "{{PORTAL_URL}}"].map((p) => (
                                      <span key={p} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-805 text-[10px] font-mono text-brand-primary font-bold">{p}</span>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* 2. Admin Welcome Invite Email Template card */}
                              <div className="p-6 rounded-[24px] bg-bg-surface dark:bg-slate-950 border border-slate-150 dark:border-slate-800 space-y-4">
                                <div className="flex items-center justify-between">
                                  <div className="space-y-0.5">
                                    <span className="text-sm font-black text-text-main">
                                      Administrator Registration Email
                                    </span>
                                    <p className="text-[11px] text-text-muted">
                                      Dispatched when corporate team access is granted to a newly elevated platform admin
                                    </p>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                                      Subject Line
                                    </label>
                                    <input
                                      type="text"
                                      value={adminInviteSubjectInput}
                                      onChange={(e) => setAdminInviteSubjectInput(e.target.value)}
                                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-bg-base text-sm text-text-main font-semibold outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                                      Email Body (HTML Supported)
                                    </label>
                                    <textarea
                                      rows={6}
                                      value={adminInviteBodyInput}
                                      onChange={(e) => setAdminInviteBodyInput(e.target.value)}
                                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-bg-base text-xs font-mono text-text-main outline-none"
                                    />
                                  </div>
                                  {/* Placeholders badge list */}
                                  <div className="flex flex-wrap gap-2 pt-1">
                                    <span className="text-[10px] font-extrabold text-text-muted uppercase">Placeholders:</span>
                                    {["{{EMAIL}}", "{{PASSWORD}}", "{{PORTAL_URL}}"].map((p) => (
                                      <span key={p} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-805 text-[10px] font-mono text-brand-primary font-bold">{p}</span>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* 3. E-Sign Reminder Email Template card */}
                              <div className="p-6 rounded-[24px] bg-bg-surface dark:bg-slate-950 border border-slate-150 dark:border-slate-800 space-y-4">
                                <div className="flex items-center justify-between">
                                  <div className="space-y-0.5">
                                    <span className="text-sm font-black text-text-main">
                                      Pending E-Sign Signature Reminder
                                    </span>
                                    <p className="text-[11px] text-text-muted">
                                      Sent to stakeholders reminding them to complete digital sign executions of pending options
                                    </p>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                                      Subject Line
                                    </label>
                                    <input
                                      type="text"
                                      value={eSignReminderSubjectInput}
                                      onChange={(e) => setESignReminderSubjectInput(e.target.value)}
                                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-bg-base text-sm text-text-main font-semibold outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                                      Email Body (HTML Supported)
                                    </label>
                                    <textarea
                                      rows={6}
                                      value={eSignReminderBodyInput}
                                      onChange={(e) => setESignReminderBodyInput(e.target.value)}
                                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-bg-base text-xs font-mono text-text-main outline-none"
                                    />
                                  </div>
                                  {/* Placeholders badge list */}
                                  <div className="flex flex-wrap gap-2 pt-1">
                                    <span className="text-[10px] font-extrabold text-text-muted uppercase">Placeholders:</span>
                                    {["{{NAME}}", "{{EMAIL}}", "{{GRANT_ID}}", "{{SHARES}}", "{{PORTAL_URL}}"].map((p) => (
                                      <span key={p} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-805 text-[10px] font-mono text-brand-primary font-bold">{p}</span>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* 4. Vesting Alert Email Template card */}
                              <div className="p-6 rounded-[24px] bg-bg-surface dark:bg-slate-950 border border-slate-150 dark:border-slate-800 space-y-4">
                                <div className="flex items-center justify-between">
                                  <div className="space-y-0.5">
                                    <span className="text-sm font-black text-text-main">
                                      Vesting Milestone Dispatch Notification
                                    </span>
                                    <p className="text-[11px] text-text-muted">
                                      Triggered automatically on scheduled vesting intervals advising employees of newly vested options details
                                    </p>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                                      Subject Line
                                    </label>
                                    <input
                                      type="text"
                                      value={vestingAlertSubjectInput}
                                      onChange={(e) => setVestingAlertSubjectInput(e.target.value)}
                                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-bg-base text-sm text-text-main font-semibold outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                                      Email Body (HTML Supported)
                                    </label>
                                    <textarea
                                      rows={6}
                                      value={vestingAlertBodyInput}
                                      onChange={(e) => setVestingAlertBodyInput(e.target.value)}
                                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-bg-base text-xs font-mono text-text-main outline-none"
                                    />
                                  </div>
                                  {/* Placeholders badge list */}
                                  <div className="flex flex-wrap gap-2 pt-1">
                                    <span className="text-[10px] font-extrabold text-text-muted uppercase">Placeholders:</span>
                                    {["{{NAME}}", "{{EMAIL}}", "{{SHARES_VESTED}}", "{{VESTING_DATE}}", "{{TOTAL_VESTED}}", "{{UNVESTED_REMAINING}}", "{{PORTAL_URL}}"].map((p) => (
                                      <span key={p} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-805 text-[10px] font-mono text-brand-primary font-bold">{p}</span>
                                    ))}
                                  </div>
                                </div>
                              </div>

                            </div>

                            {/* Save triggers panel */}
                            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    setSettingsSuccess("");
                                    setSettingsError("");
                                    await updateCompanySettings({
                                      employeeInviteSubject: employeeInviteSubjectInput,
                                      employeeInviteBody: employeeInviteBodyInput,
                                      adminInviteSubject: adminInviteSubjectInput,
                                      adminInviteBody: adminInviteBodyInput,
                                      eSignReminderSubject: eSignReminderSubjectInput,
                                      eSignReminderBody: eSignReminderBodyInput,
                                      vestingAlertSubject: vestingAlertSubjectInput,
                                      vestingAlertBody: vestingAlertBodyInput
                                    }, user.email);
                                    setSettingsSuccess("Subject lines and custom email templates successfully saved and published!");
                                    await createAuditLog(
                                      "Update Email Templates",
                                      "Admin dynamically customized the system welcome templates, digital vesting reminders, and billing alert dispatch configurations.",
                                      user.email
                                    );
                                  } catch (e: any) {
                                    setSettingsError(e.message || "Failed to update templates.");
                                  }
                                }}
                                className="px-8 py-4 bg-brand-primary text-white rounded-xl text-xs font-black uppercase tracking-wider hover:scale-[1.01] active:scale-[0.99] transition-all duration-150 shadow-md cursor-pointer"
                              >
                                Save All Email Templates
                              </button>
                            </div>

                          </div>
                        </div>
                      )}

                      {/* GOOGLE WORKSPACE & BACKUPS SUB-TAB */}
                      {settingsSubTab === "integrations" && (
                        <div className="space-y-8 animate-fadeIn">
                          {/* Google Connection & Backup Folder Settings Card */}
                          <div className="p-8 rounded-[32px] bg-bg-base dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                            <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                              <div>
                                <span className="font-extrabold text-text-main tracking-tight text-lg flex items-center gap-2">
                                  <Cloud className="text-brand-primary" size={20} />
                                  Google Drive Automatic Daily Backup Settings
                                </span>
                                <p className="text-xs text-text-muted font-bold uppercase tracking-widest mt-0.5">
                                  Define backup rules, targets, and automatic sync configurations
                                </p>
                              </div>
                              <span className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase border ${googleAuthToken ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-slate-500/10 text-slate-500 border-slate-500/20"}`}>
                                {googleAuthToken ? "Connected" : "Not connected"}
                              </span>
                            </div>

                            {backupSuccess && (
                              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                                <CheckCircle2 size={16} />
                                <span>{backupSuccess}</span>
                              </div>
                            )}

                            {backupError && (
                              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                                <AlertCircle size={16} />
                                <span>{backupError}</span>
                              </div>
                            )}

                            {!googleAuthToken ? (
                              <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-4">
                                <Cloud className="mx-auto text-slate-300 dark:text-slate-700" size={48} />
                                <div className="space-y-1">
                                  <h4 className="font-extrabold text-sm text-text-main">
                                    Google Drive Backup is Currently Offline
                                  </h4>
                                  <p className="text-xs text-text-muted max-w-md mx-auto leading-relaxed">
                                    To enable automatic daily backups of your complete ESOP cap-table, email logs, and company settings, connect your corporate Google Workspace administrator account.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={handleConnectGoogleWorkspace}
                                  className="mx-auto flex items-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-black text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:scale-[1.02] transition-all"
                                >
                                  <Cloud size={16} />
                                  Connect Google Workspace Account
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-6">
                                {/* Connected account strip */}
                                <div className="p-5 rounded-2xl bg-emerald-500/[0.02] border border-emerald-500/15 flex items-center justify-between">
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                      <Cloud size={20} />
                                    </div>
                                    <div>
                                      <p className="font-extrabold text-xs text-text-main">
                                        Google Account Connected
                                      </p>
                                      <p className="text-xs font-medium text-text-muted">
                                        {googleUserEmail}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setGoogleAuthToken(null);
                                      setGoogleUserEmail(null);
                                      setBackupSuccess("Disconnected successfully.");
                                    }}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all"
                                  >
                                    Disconnect
                                  </button>
                                </div>

                                {/* Folder adding options */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {/* Folder Select Dropdown */}
                                  <div className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-bg-surface dark:bg-slate-950 space-y-4">
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-extrabold text-brand-primary uppercase tracking-[0.2em] block">
                                        Add Backup Target Folder
                                      </span>
                                      <p className="text-xs text-text-muted leading-relaxed">
                                        Select an existing Google Drive folder to house the automatic daily backups.
                                      </p>
                                    </div>

                                    {loadingFolders ? (
                                      <div className="text-xs text-text-muted py-2 font-bold animate-pulse">
                                        Fetching active folders list...
                                      </div>
                                    ) : (
                                      <div className="space-y-3">
                                        <select
                                          value={companySettings.backupDriveFolderId || ""}
                                          onChange={async (e) => {
                                            const selectedId = e.target.value;
                                            const selectedFolder = folders.find(f => f.id === selectedId);
                                            if (selectedFolder) {
                                              await updateCompanySettings({
                                                backupDriveFolderId: selectedFolder.id,
                                                backupDriveFolderName: selectedFolder.name
                                              }, user.email);
                                              setBackupSuccess(`Google Drive backup folder successfully targeted: "${selectedFolder.name}"!`);
                                              await createAuditLog(
                                                "Target Backup Folder Set",
                                                `Changed target daily backup Google Drive folder to "${selectedFolder.name}" (ID: ${selectedFolder.id})`,
                                                user.email
                                              );
                                            } else if (selectedId === "") {
                                              await updateCompanySettings({
                                                backupDriveFolderId: "",
                                                backupDriveFolderName: ""
                                              }, user.email);
                                              setBackupSuccess(`Cleared backup target folder.`);
                                            }
                                          }}
                                          className="w-full px-4 py-3 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-bg-base dark:bg-slate-900 text-text-main outline-none focus:ring-4 focus:ring-brand-primary/5 transition-all"
                                        >
                                          <option value="">-- Choose target Google Drive folder --</option>
                                          {folders.map((f) => (
                                            <option key={f.id} value={f.id}>
                                              {f.name} (ID: {f.id.slice(0, 8)}...)
                                            </option>
                                          ))}
                                        </select>
                                        <button
                                          type="button"
                                          onClick={() => fetchFolders(googleAuthToken)}
                                          className="text-[10px] font-black text-brand-primary uppercase tracking-wider flex items-center gap-1 hover:underline"
                                        >
                                          Refresh Folders List
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Auto Create Folder Selection */}
                                  <div className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-bg-surface dark:bg-slate-950 flex flex-col justify-between">
                                    <div className="space-y-1">
                                      <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.2em] block">
                                        Quick Create Folder Option
                                      </span>
                                      <p className="text-xs text-text-muted leading-relaxed">
                                        Don't have a backup folder ready? Generate a dedicated folder named <strong>"TeachVest Backups"</strong> in your Google Drive with a single click.
                                      </p>
                                    </div>
                                    <div className="pt-4">
                                      <button
                                        type="button"
                                        onClick={handleCreateBackupFolder}
                                        className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-text-main rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                                      >
                                        Create "TeachVest Backups" Folder
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Current selection status + Manual backup trigger */}
                                {companySettings.backupDriveFolderId && (
                                  <div className="p-6 rounded-2xl bg-indigo-500/[0.02] border border-indigo-500/10 space-y-4">
                                    <div className="flex items-center justify-between">
                                      <div className="space-y-0.5">
                                        <div className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-widest">
                                          Active Google Backup Configuration
                                        </div>
                                        <p className="text-xs font-bold text-text-main">
                                          Target Folder: <span className="text-indigo-600 font-black">"{companySettings.backupDriveFolderName || "Custom Folder"}"</span>
                                        </p>
                                        <p className="text-[11px] text-text-muted mt-1 font-semibold">
                                          {companySettings.lastBackupDate 
                                            ? `Last successful execution log: ${formatDateTimeSafe(companySettings.lastBackupDate)}`
                                            : "No daily backup has executed on this folder yet."
                                          }
                                        </p>
                                      </div>
                                      <div className="flex flex-col items-end text-right">
                                        <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-bold mb-1">
                                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                          Auto Snapshot Active
                                        </span>
                                      </div>
                                    </div>

                                    <div className="pt-2 flex items-center justify-end">
                                      <button
                                        type="button"
                                        disabled={isPerformingBackup}
                                        onClick={() => executeBackupToDrive(
                                          googleAuthToken,
                                          companySettings.backupDriveFolderId!,
                                          companySettings.backupDriveFolderName || "Selected Folder"
                                        )}
                                        className="px-6 py-3.5 bg-brand-primary text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:scale-[1.01] transition-all disabled:opacity-50"
                                      >
                                        {isPerformingBackup ? "Uploading Database Snapshot..." : "Trigger Backup Check & Upload Snapshot Now"}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* 9 AM Automated Vesting Notification Config Card */}
                          <div className="p-8 rounded-[32px] bg-bg-base dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                            <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                              <div>
                                <span className="font-extrabold text-text-main tracking-tight text-lg flex items-center gap-2">
                                  <Mail className="text-brand-primary" size={20} />
                                  Automated Vesting Email Alerts (09:00 AM AST/IST)
                                </span>
                                <p className="text-xs text-text-muted font-bold uppercase tracking-widest mt-0.5">
                                  Define sender email configurations and schedule triggers
                                </p>
                              </div>
                              <span className="px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                Active at 9:00 AM
                              </span>
                            </div>

                            <p className="text-xs text-text-muted leading-relaxed">
                              When employees exceed cliff timelines and reach options vesting dates, the system automatically dispatches email notification summaries to their registered emails. Backed up by server checking sweeps.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                              {/* Left column: Define From email ID */}
                              <div className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-bg-surface dark:bg-slate-950 space-y-4">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-extrabold text-brand-primary uppercase tracking-[0.2em] block">
                                    Set Automated From Email Address
                                  </label>
                                  <p className="text-xs text-text-muted leading-relaxed">
                                    Define the official company "from" email id representing your automation triggers.
                                  </p>
                                </div>
                                <div className="space-y-2">
                                  <input
                                    type="email"
                                    value={companySettings.senderEmailId || "hr@teachmint.com"}
                                    onChange={async (e) => {
                                      const emailVal = e.target.value.trim();
                                      await updateCompanySettings({ senderEmailId: emailVal }, user.email);
                                    }}
                                    placeholder="hr@teachmint.com"
                                    className="w-full px-4 py-3 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-800 bg-bg-base dark:bg-slate-900 text-text-main outline-none focus:ring-4 focus:ring-brand-primary/5 transition-all"
                                  />
                                  <p className="text-[10px] text-slate-400 font-medium">
                                    ✓ Standard fallback email when OAuth token is absent: <strong>{companySettings.senderEmailId || "hr@teachmint.com"}</strong>
                                  </p>
                                </div>
                              </div>

                              {/* Right column: Status and Sweeper Test Actions */}
                              <div className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-bg-surface dark:bg-slate-950 flex flex-col justify-between">
                                <div className="space-y-2">
                                  <span className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.2em] block">
                                    Cron Engine Status & Diagnostics
                                  </span>
                                  <div className="space-y-1.5 text-xs">
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-text-muted">Scheduler Loop:</span>
                                      <span className="font-mono bg-indigo-50 dark:bg-indigo-950 text-brand-primary px-2 py-0.5 rounded text-[10px] font-bold">INTERVAL ACTIVE (60S)</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-text-muted">Notification Time:</span>
                                      <span className="text-text-main font-bold">Daily at 09:00 AM IST</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className="font-semibold text-text-muted">Target Recipients:</span>
                                      <span className="text-text-main font-bold">Vested Employee Milestones</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="pt-6">
                                  <button
                                    type="button"
                                    onClick={async (e) => {
                                      const btn = e.currentTarget;
                                      btn.disabled = true;
                                      const prevText = btn.innerText;
                                      btn.innerText = "Running Sweeper Process...";
                                      try {
                                        const res = await fetch("/api/trigger-vesting-emails", {
                                          method: "POST"
                                        });
                                        if (res.ok) {
                                          setBackupSuccess("Vesting check sweep triggered! All employees verified and any unnotified vested milestones are notified.");
                                          btn.innerText = "✓ Sweep Complete!";
                                        } else {
                                          throw new Error("Trigger endpoint error");
                                        }
                                      } catch (err) {
                                        setBackupError("Sweeper manual run failed to contact server API.");
                                        btn.innerText = "Error";
                                      }
                                      setTimeout(() => {
                                        btn.disabled = false;
                                        btn.innerText = prevText;
                                      }, 3000);
                                    }}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                                  >
                                    Execute Vesting Sweeper Right Now
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Personal administrator Profile Settings Card (General Info) */}
                  {settingsSubTab === "general" && (
                    <>
                      <div className="bg-bg-surface border border-slate-100 dark:border-slate-800 rounded-[40px] p-12 shadow-sm transition-colors space-y-8 animate-fadeIn">
                        <div className="flex items-center gap-6 mb-4">
                          <div className="w-16 h-16 rounded-[24px] bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner overflow-hidden">
                            <Avatar name={user.name} size={48} />
                          </div>
                          <div>
                            <h3 className="text-3xl font-extrabold text-text-main tracking-tight">
                              Personal Admin Profile
                            </h3>
                            <p className="text-sm text-text-muted font-bold uppercase tracking-widest mt-1">
                              Manage your administrator details
                            </p>
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

                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            setAdminSuccess("");
                            setAdminError("");
                            const form = e.currentTarget;
                            const adminName = (
                              form.elements.namedItem(
                                "adminName",
                              ) as HTMLInputElement
                            ).value;
                            const adminPassword = (
                              form.elements.namedItem(
                                "adminPassword",
                              ) as HTMLInputElement
                            ).value;

                            try {
                              const currentUid =
                                auth.currentUser?.uid ||
                                user.email.toLowerCase();
                              const updatedAdmin: Admin = {
                                ...user,
                                name: adminName,
                                ...(adminPassword
                                  ? { password: adminPassword }
                                  : {}),
                              };

                              await createAdmin(updatedAdmin, currentUid);
                              setUser(updatedAdmin);
                              setAdminSuccess(
                                "Admin profile updated successfully!",
                              );
                              const pwInput = form.elements.namedItem(
                                "adminPassword",
                              ) as HTMLInputElement;
                              if (pwInput) pwInput.value = "";
                            } catch (err) {
                              setAdminError(
                                "Failed to update profile. Please check connection.",
                              );
                            }
                          }}
                          className="grid grid-cols-1 md:grid-cols-2 gap-6"
                        >
                          <div className="space-y-1.5 col-span-1">
                            <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] block">
                              Email Address (Immutable)
                            </label>
                            <input
                              type="text"
                              disabled
                              value={user.email}
                              className="w-full px-5 py-4 rounded-[20px] bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-text-muted font-bold text-sm outline-none"
                            />
                          </div>
                          <div className="space-y-1.5 col-span-1">
                            <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] block">
                              Full Name
                            </label>
                            <input
                              type="text"
                              name="adminName"
                              required
                              defaultValue={user.name}
                              className="w-full px-5 py-4 rounded-[20px] bg-bg-surface border border-slate-200 dark:border-slate-700 text-text-main font-bold text-sm focus:ring-4 focus:ring-brand-primary/5 outline-none transition-all"
                            />
                          </div>
                          <div className="space-y-1.5 col-span-1">
                            <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] block">
                              New Secret Password
                            </label>
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
                      <div className="bg-bg-surface border border-slate-100 dark:border-slate-800 rounded-[40px] p-12 shadow-sm transition-colors space-y-10 animate-fadeIn">
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 rounded-[24px] bg-brand-primary/10 flex items-center justify-center text-brand-primary shadow-inner">
                            <ShieldCheck size={36} />
                          </div>
                          <div>
                            <h3 className="text-3xl font-extrabold text-text-main tracking-tight">
                              Administrative Accounts
                            </h3>
                            <p className="text-sm text-text-muted font-bold uppercase tracking-widest mt-1">
                              Add additional admins and view permissions
                            </p>
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
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            setNewAdminSuccess("");
                            setNewAdminError("");

                            const form = e.currentTarget;
                            const newEmail = (
                              form.elements.namedItem(
                                "newEmail",
                              ) as HTMLInputElement
                            ).value.trim();
                            const newName = (
                              form.elements.namedItem(
                                "newName",
                              ) as HTMLInputElement
                            ).value.trim();
                            const newPassword = (
                              form.elements.namedItem(
                                "newPassword",
                              ) as HTMLInputElement
                            ).value;

                            if (!newEmail || !newName || !newPassword) {
                              setNewAdminError(
                                "All fields are required to register an administrator",
                              );
                              return;
                            }

                            try {
                              const newAdmin: Admin = {
                                email: newEmail,
                                name: newName,
                                password: newPassword,
                                role: "admin",
                              };

                              await createAdmin(
                                newAdmin,
                                newEmail.toLowerCase(),
                                user.email,
                              );
                              setNewAdminSuccess(
                                `Admin '${newName}' created successfully!`,
                              );
                              form.reset();
                            } catch (err) {
                              setNewAdminError(
                                "Failed to register administrator document on database.",
                              );
                            }
                          }}
                          className="p-8 rounded-[32px] bg-bg-base dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6"
                        >
                          <div className="text-xs font-extrabold text-brand-primary uppercase tracking-[0.2em]">
                            Register New Administrator
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1.5 col-span-1">
                              <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] block">
                                Admin Full Name
                              </label>
                              <input
                                type="text"
                                name="newName"
                                required
                                placeholder="John Doe"
                                className="w-full px-5 py-4 rounded-[20px] bg-bg-surface border border-slate-200 dark:border-slate-700 text-text-main font-bold text-sm focus:ring-4 focus:ring-brand-primary/5 outline-none transition-all"
                              />
                            </div>
                            <div className="space-y-1.5 col-span-1">
                              <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] block">
                                Email Address (Login ID)
                              </label>
                              <input
                                type="email"
                                name="newEmail"
                                required
                                placeholder="admin@teachmint.com"
                                className="w-full px-5 py-4 rounded-[20px] bg-bg-surface border border-slate-200 dark:border-slate-700 text-text-main font-bold text-sm focus:ring-4 focus:ring-brand-primary/5 outline-none transition-all"
                              />
                            </div>
                            <div className="space-y-1.5 col-span-1">
                              <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] block">
                                Account Password
                              </label>
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
                          <div className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.2em] ml-1">
                            Current Active Administrators ({adminsList.length})
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {adminsList.map((adm, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between p-5 rounded-3xl border border-slate-100 dark:border-slate-800 bg-bg-base dark:bg-slate-900 shadow-sm"
                              >
                                <div className="flex items-center gap-4">
                                  <Avatar name={adm.name} size={40} />
                                  <div>
                                    <div className="font-extrabold text-text-main leading-tight flex items-center gap-2">
                                      {adm.name}
                                      {adm.email.toLowerCase() ===
                                        "sanju@sanju-t.com" && (
                                        <span className="bg-red-500/10 text-red-500 text-[8px] font-black px-1.5 py-0.5 rounded tracking-widest uppercase">
                                          Super Admin
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-xs text-text-muted font-bold uppercase tracking-wider mt-0.5">
                                      {adm.email}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {adm.email.toLowerCase() !==
                                    user.email.toLowerCase() && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteAdmin(adm.email)
                                      }
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
                    </>
                  )}
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
            existingEmployees={employees}
          />
        )}
        {isEditModalOpen && selectedEmployee && (
          <EditEmployeeModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            employee={selectedEmployee}
            onSave={handleEditEmployee}
            existingEmployees={employees}
          />
        )}
        {isBulkModalOpen && (
          <BulkUploadModal
            isOpen={isBulkModalOpen}
            onClose={() => setIsBulkModalOpen(false)}
            onSuccess={handleBulkUpload}
            existingEmployees={employees}
          />
        )}
        {isGrantsModalOpen && selectedEmployee && (
          <ManageGrantsModal
            isOpen={isGrantsModalOpen}
            onClose={() => setIsGrantsModalOpen(false)}
            employee={selectedEmployee}
            onSave={handleEditEmployee}
            existingEmployees={employees}
          />
        )}

        {/* Custom Delete Employee Confirmation Modal */}
        {deleteEmployeeConfirmId && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteEmployeeConfirmId(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 overflow-hidden shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-red-500">
                <AlertCircle size={24} />
                <h3 className="text-lg font-bold">
                  Delete Stakeholder Profile?
                </h3>
              </div>
              <p className="text-sm text-text-muted">
                Are you sure you want to permanently delete this employee? This
                will purge all associated grants and history. This action cannot
                be undone.
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteAdminConfirmEmail(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 overflow-hidden shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-red-500">
                <AlertCircle size={24} />
                <h3 className="text-lg font-bold">Revoke Admin Privileges?</h3>
              </div>
              <p className="text-sm text-text-muted">
                Are you sure you want to permanently revoke admin access for{" "}
                <strong className="text-text-main">
                  {deleteAdminConfirmEmail}
                </strong>
                ? They will immediately lose access to the administrator portal.
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAlertMessage(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 overflow-hidden shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-brand-primary">
                <AlertCircle size={24} />
                <h3 className="text-lg font-bold text-text-main">
                  Action Restricted
                </h3>
              </div>
              <p className="text-sm text-text-muted">{alertMessage}</p>
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMail(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl p-6 overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-text-main flex items-center gap-2">
                    <Mail size={20} className="text-brand-primary" />
                    Inspect Dispatched Mail
                  </h3>
                  <p className="text-xs text-text-muted">
                    Security Audited SMTP Mail Delivery Packet
                  </p>
                </div>
                <button
                  onClick={() => setSelectedMail(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-text-muted text-xl font-bold"
                >
                  &times;
                </button>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 mb-4 text-xs font-semibold">
                <div>
                  <span className="text-text-muted">Recipient:</span>{" "}
                  <strong className="text-text-main">
                    {selectedMail.name} ({selectedMail.recipient})
                  </strong>
                </div>
                <div>
                  <span className="text-text-muted">Subject:</span>{" "}
                  <strong className="text-text-main">
                    {selectedMail.subject}
                  </strong>
                </div>
                <div>
                  <span className="text-text-muted">Sent At:</span>{" "}
                  <strong className="text-text-main">
                    {formatDateTimeSafe(selectedMail.sentAt)}
                  </strong>
                </div>
                <div>
                  <span className="text-text-muted">Security Credentials:</span>{" "}
                  Password:{" "}
                  <code className="font-mono bg-indigo-50 dark:bg-indigo-950 text-indigo-600 px-1.5 py-0.5 rounded font-black text-xs">
                    {selectedMail.password}
                  </code>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">
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
