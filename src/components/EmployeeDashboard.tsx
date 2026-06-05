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
  Gift, 
  History, 
  FileText, 
  LogOut, 
  TrendingUp, 
  DollarSign, 
  CheckCircle2, 
  Download,
  Calendar,
  ChevronRight,
  Shield,
  Users,
  AlertCircle
} from 'lucide-react';
import { Employee } from '../types';
import { Avatar, StatusBadge } from './ui/Shared';
import { MetricCard } from './ui/MetricCard';
import { VestingBar } from './ui/VestingBar';
import { 
  calcPortfolioValue, 
  calcPotentialGain, 
  calcTotalVested, 
  calcTotalGranted, 
  fmtCurrency, 
  fmt, 
  fmtDate,
  calculateLiveVested,
  generateVestingSchedule,
  replaceLetterPlaceholders,
  generateVestingScheduleTableHtml
} from '../lib/utils';
import { subscribeToEmployee, subscribeToCompanySettings, updateEmployeeData, CompanySettings } from '../services/dataService';
import { jsPDF } from 'jspdf';

interface Props {
  user: Employee;
  onLogout: () => void;
}

export const EmployeeDashboard: React.FC<Props> = ({ user: initialUser, onLogout }) => {
  const [user, setUser] = useState<Employee>(initialUser);
  const [activeTab, setActiveTab] = useState("overview");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [nomineeSuccess, setNomineeSuccess] = useState("");

  // Interactive signature states
  const [typedSignature, setTypedSignature] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [esignSuccess, setEsignSuccess] = useState(false);
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    currentFMV: 210,
    totalPool: 10000000,
    lastUpdated: new Date().toISOString()
  });

  React.useEffect(() => {
    const unsubUser = subscribeToEmployee(initialUser.id, (userData) => {
      if (userData) setUser(userData);
    });

    const unsubSettings = subscribeToCompanySettings((settings) => {
      setCompanySettings(settings);
    });

    return () => {
      unsubUser();
      unsubSettings();
    };
  }, [initialUser.id]);

  const portfolioValue = calcPortfolioValue(user.grants, companySettings.currentFMV, user.joinDate, user.cliffType);
  const potentialGain = calcPotentialGain(user.grants, companySettings.currentFMV, user.joinDate, user.cliffType);
  const totalVested = calcTotalVested(user.grants, user.joinDate, user.cliffType);
  const totalGranted = calcTotalGranted(user.grants);
  const totalExercised = user.grants.reduce((sum, g) => sum + (g.exercisedShares || 0), 0);
  
  const totalOutstandingVested = Math.max(0, totalVested - totalExercised);
  const totalOutstandingUnvested = Math.max(0, totalGranted - totalVested);
  
  const totalLapsed = user.grants.reduce((sum, g) => g.status === "Expired" ? sum + (g.totalShares - (g.exercisedShares || 0)) : sum, 0);
  
  const totalBuyback = user.transactions
    .filter(t => t.type.toLowerCase() === "buyback" || t.type.toLowerCase() === "surrender")
    .reduce((sum, t) => sum + t.shares, 0);

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "grants", label: "My Grants", icon: Gift },
    { id: "vesting", label: "Vesting Schedule", icon: Calendar },
    { id: "transactions", label: "History", icon: History },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "profile", label: "Security", icon: Shield },
  ];

  const handleDownloadPDF = (docName: string) => {
    if (docName.toLowerCase().includes("policy")) {
      const doc = new jsPDF();
      
      // Page 1: Beautiful Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(24);
      doc.setTextColor(11, 34, 101); // Teachmint Corporate Deep Navy Blue
      doc.text("Teachmint", 210 / 2, 22, { align: "center" });

      doc.setFontSize(14);
      doc.setTextColor(100, 116, 139);
      doc.text("GLOBAL ESOP POLICY DOCUMENT", 210 / 2, 32, { align: "center" });
      
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.line(20, 38, 190, 38);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      
      const lines = [
        "This describes the corporate parameters, governance, and rules of options offered under the Teachmint Employees' Stock Option Plan (ESOP).",
        "",
        "SECTION I: OBJECTIVE AND PLAN GOVERNANCE",
        "The objective of this scheme is to reward and align employee incentives with the overall appreciation of company equity value. The plan is executed under the sole supervision of the Board of Directors and the designated ESOP Committee.",
        "",
        "SECTION II: VESTING SCHEDULES AND CLIFFS",
        "All options under this grant are subject to the specific schedule outlined in your individualized Letter of Grant (Form I). Under a standard schedule:",
        " - 12-Month Cliff: Exactly 25% of the total options vest on the 1st anniversary of the Grant Date.",
        " - Standard Vesting: The remaining 75% vest in equal quarterly or monthly proportions across the next 36 months.",
        " - Special Accrual: Specific custom vesting configurations might apply as specified in your agreement details.",
        "",
        "SECTION III: EXERCISE POLICY AND GUIDELINES",
        "Vested options can be converted into equity shares of the company at the designated Exercise Price during the exercise windows published by the company, or within a maximum of 5 years from their respective vesting dates.",
        "",
        "SECTION IV: VOLUNTARY & INVOLUNTARY TERMINATION",
        "Upon voluntary termination of employment, any unvested options will immediately lapse. Vested options must be exercised within 30 days from the employee's last active working date, following which they will be permanently expired.",
        "",
        "This policy is published globally to all stakeholders in order to promote absolute transparency."
      ];
      
      let y = 50;
      lines.forEach(line => {
        if (line.startsWith("SECTION")) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor(15, 23, 42);
          y += 3;
        } else {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          doc.setTextColor(71, 85, 105);
        }
        
        const splitText = doc.splitTextToSize(line, 170);
        doc.text(splitText, 20, y);
        y += (splitText.length * 5.5);
      });
      
      // Page footer
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.25);
      doc.line(14, 275, 196, 275);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Teachmint Technologies Private Limited • Official ESOP Guidelines & Rules", 210 / 2, 280, { align: "center" });
      
      doc.save(docName.endsWith(".pdf") ? docName : `${docName}.pdf`);
      return;
    }

    if (docName.includes("Grant Letter")) {
      const doc = new jsPDF();
      const activeGrant = user.grants[0] || {
        id: "TM-ESOP-1259",
        grantDate: user.grantDate || new Date().toISOString(),
        totalShares: 2.11,
        strikePrice: 1,
        vestingSchedule: "4 Year Standard",
        workflowStatus: "Draft"
      };

      const formatDateSafe = (dateStr?: string) => {
        if (!dateStr) return "April 01, 2025";
        try {
          const d = new Date(dateStr);
          if (!isNaN(d.getTime())) {
            return d.toLocaleDateString("en-US", {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
          }
        } catch (e) {}
        return dateStr;
      };

      const gDateFormatted = formatDateSafe(activeGrant.grantDate);

      const fmtShares = (val: number) => {
        return val.toLocaleString("en-US", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 6
        });
      };

      const drawPageLogoText = (pdf: jsPDF, y: number) => {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(24);
        pdf.setTextColor(11, 34, 101); // Teachmint Corporate Deep Navy Blue
        pdf.text("Teachmint", 210 / 2, y + 10, { align: "center" });
      };

      const drawPageFooter = (pdf: jsPDF) => {
        // Horizontal divider line above footer resembling the official letterhead
        pdf.setDrawColor(203, 213, 225);
        pdf.setLineWidth(0.25);
        pdf.line(14, 260, 196, 260);

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7.5);
        pdf.setTextColor(30, 41, 59);
        pdf.text("Teachmint Technologies Private Limited", 210 / 2, 265, { align: "center" });

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6.8);
        pdf.setTextColor(71, 85, 105);
        pdf.text("Regd Office: 5th Floor, North Wing, SJR The HUB, Sy. No. 8/2 & 9, Sarjapur Rd, Bengaluru, Karnataka - 560103", 210 / 2, 269, { align: "center" });
        pdf.text("CIN-U62099KA2020PTC135305", 210 / 2, 273, { align: "center" });
        pdf.text("support@teachmint.com | www.teachmint.com", 210 / 2, 277, { align: "center" });
      };

      let yPos = 80;
      const printParagraph = (text: string, spaceAfter = 4, fontStyle = "normal", size = 9.2, spacing = 4.2) => {
        doc.setFont("helvetica", fontStyle);
        doc.setFontSize(size);
        doc.setTextColor(30, 41, 59);
        const lines = doc.splitTextToSize(text, 170);
        lines.forEach((line: string) => {
          doc.text(line, 20, yPos);
          yPos += spacing;
        });
        yPos += spaceAfter;
      };

      // ================= PAGE 1 =================
      drawPageLogoText(doc, 12);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text("LETTER OF GRANT", 210 / 2, 34, { align: "center" });

      doc.setFontSize(9.5);
      doc.text(`Date: ${gDateFormatted}`, 20, 44);
      doc.text("To,", 20, 52);
      doc.text(user.name, 20, 57);
      doc.text(`Emp ID - ${user.id}`, 20, 62);

      doc.text(`Dear ${user.name},`, 20, 70);

      yPos = 78;
      printParagraph("The Committee of Teachmint ESOP 2020 has the pleasure in inviting you to participate in the Employees’ Stock Option Plan 2020(“ESOP 2020”) of Teachmint Technologies Private Limited, a private limited company incorporated under the provisions of the Companies Act, 2013 and having its registered office at 5-Floor, North Wing, SJR \"The HUB\", Sy. No. 8/2 & 9, Sarjapur Rd, Bengaluru, Karnataka – 560103, having corporate identification number as U62099KA2020PTC135305.", 4);
      printParagraph("By virtue of the ESOP 2020, you are being offered the Options convertible into equity shares.", 4);
      printParagraph("The details of number of Options granted, vesting date, exercise date, exercise price and manner of exercising the Options and other terms and conditions are given in Form I.", 4);
      printParagraph("The offer shall lapse if not accepted on or before the closing date mentioned in Form I. If the offer is acceptable to you, kindly sign the Acceptance Form (enclosed as Form II) in token of your acceptance.", 4);
      printParagraph("You are requested to study the same carefully and familiarize yourself with the scheme enclosed.", 4);
      printParagraph("Thanking you,", 4);
      printParagraph("Yours faithfully,", 4);
      printParagraph("For Teachmint Technologies Private Limited,", 12);

      // Signature block Mihir
      doc.setDrawColor(220, 225, 230);
      doc.setLineWidth(0.2);
      doc.rect(20, yPos, 85, 17);
      doc.setFont("times", "italic");
      doc.setFontSize(11);
      doc.setTextColor(37, 99, 235);
      doc.text("Mihir Gupta", 24, yPos + 4.5);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Signee: Mihir Gupta", 24, yPos + 8.5);
      doc.text("Date: Wed May 28 13:26:58 IST 2025", 24, yPos + 12.5);

      yPos += 23;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text("Mihir Gupta", 20, yPos);
      doc.setFont("helvetica", "normal");
      doc.text("Encl: As above", 20, yPos + 5);

      drawPageFooter(doc);

      // ================= PAGE 2 =================
      doc.addPage();
      drawPageLogoText(doc, 12);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.text("Form I", 210 / 2, 32, { align: "center" });

      // Outer Box border details
      doc.setFillColor(245, 247, 250);
      doc.rect(20, 36, 170, 8, 'F');
      doc.setDrawColor(100, 116, 139);
      doc.setLineWidth(0.25);
      doc.rect(20, 36, 170, 8, 'S');
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(`Name in Full: ${user.name}`, 24, 41.2);

      // Row I. Grant Details heading
      doc.setFillColor(228, 232, 238);
      doc.rect(20, 44, 170, 6, 'F');
      doc.rect(20, 44, 170, 6, 'S');
      doc.text("I. Grant Details", 24, 48.2);

      // Detail Rows
      const rowHeight = 6.2;
      const drawDetailRow = (y: number, label: string, val: string) => {
        doc.rect(20, y, 170, rowHeight, 'S');
        doc.line(90, y, 90, y + rowHeight);
        doc.setFont("helvetica", "normal");
        doc.text(label, 24, y + 4.2);
        doc.setFont("helvetica", "bold");
        doc.text(val, 94, y + 4.2);
      };

      drawDetailRow(50, "Total Options Granted", fmtShares(activeGrant.totalShares));
      drawDetailRow(50 + rowHeight, "Date of Grant", gDateFormatted);
      
      const strikeText = `INR ${activeGrant.strikePrice || 1}/- (${activeGrant.strikePrice === 10 ? "Indian Rupees Ten only" : "Indian Rupees One only"})`;
      drawDetailRow(50 + rowHeight * 2, "Exercise Price per Share", strikeText);

      // Row II. Vesting Details heading
      const dy = 50 + rowHeight * 3;
      doc.setFillColor(228, 232, 238);
      doc.rect(20, dy, 170, 6, 'F');
      doc.rect(20, dy, 170, 6, 'S');
      doc.text("II. Vesting Details", 24, dy + 4.2);

      // Vesting description
      const vestingY = dy + 6;
      doc.rect(20, vestingY, 170, 7.5, 'S');
      doc.line(90, vestingY, 90, vestingY + 7.5);
      doc.setFont("helvetica", "normal");
      doc.text("Vesting", 24, vestingY + 4.8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.2);
      doc.text(`${fmtShares(activeGrant.totalShares)} number of Options will vest as per the schedule below:`, 94, vestingY + 4.8);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Please find below the vesting schedule corresponding to this grant:", 20, vestingY + 14);

      // Table Vesting
      const tableStartY = vestingY + 18;
      doc.setFillColor(248, 250, 252);
      doc.rect(20, tableStartY, 170, 8, 'F');
      doc.setDrawColor(100, 116, 139);
      doc.rect(20, tableStartY, 170, 8, 'S');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text("Vesting Date", 23, tableStartY + 5.2);
      doc.text("Vesting Condition", 55, tableStartY + 5.2);
      doc.text("Options to vest info", 117, tableStartY + 5.2);
      doc.text("Total vested info", 155, tableStartY + 5.2);

      const schedule = generateVestingSchedule(
        user.joinDate || activeGrant.grantDate,
        activeGrant.totalShares,
        user.cliffType || "Annually (Standard)",
        undefined,
        activeGrant,
        companySettings.roundingMode
      );

      const page2Max = 11;
      const page2Count = Math.min(page2Max, schedule.length);

      let tableY = tableStartY + 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.8);
      doc.setTextColor(30, 41, 59);

      for (let i = 0; i < page2Count; i++) {
        const event = schedule[i];
        doc.setDrawColor(160, 170, 180);
        doc.setLineWidth(0.15);
        doc.rect(20, tableY, 170, 11, 'S');

        doc.line(52, tableY, 52, tableY + 11);
        doc.line(114, tableY, 114, tableY + 11);
        doc.line(152, tableY, 152, tableY + 11);

        doc.text(fmtDate(event.date), 23, tableY + 6.8);

        const condLines = doc.splitTextToSize("Continued employment or contract with the company up to vesting date", 58);
        doc.text(condLines[0], 54, tableY + 4.5);
        if (condLines[1]) {
          doc.text(condLines[1], 54, tableY + 8.2);
        }

        doc.text(fmtShares(event.toVest), 117, tableY + 6.8);
        doc.setFont("helvetica", "bold");
        doc.text(fmtShares(event.totalVested), 155, tableY + 6.8);
        doc.setFont("helvetica", "normal");

        tableY += 11;
      }

      drawPageFooter(doc);

      // ================= PAGE 3 =================
      doc.addPage();
      drawPageLogoText(doc, 12);

      let curPy3 = 32;
      const remainingStartIdx = page2Count;
      if (schedule.length > remainingStartIdx) {
        // Draw rest of table
        doc.setFillColor(248, 250, 252);
        doc.rect(20, curPy3, 170, 8, 'F');
        doc.setDrawColor(100, 116, 139);
        doc.rect(20, curPy3, 170, 8, 'S');

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text("Vesting Date", 23, curPy3 + 5.2);
        doc.text("Vesting Condition", 55, curPy3 + 5.2);
        doc.text("Options to vest info", 117, curPy3 + 5.2);
        doc.text("Total vested info", 155, curPy3 + 5.2);

        curPy3 += 8;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.8);
        doc.setTextColor(30, 41, 59);

        for (let i = remainingStartIdx; i < schedule.length; i++) {
          const event = schedule[i];
          doc.setDrawColor(160, 170, 180);
          doc.setLineWidth(0.15);
          doc.rect(20, curPy3, 170, 11, 'S');

          doc.line(52, curPy3, 52, curPy3 + 11);
          doc.line(114, curPy3, 114, curPy3 + 11);
          doc.line(152, curPy3, 152, curPy3 + 11);

          doc.text(fmtDate(event.date), 23, curPy3 + 6.8);

          const condLines = doc.splitTextToSize("Continued employment or contract with the company up to vesting date", 58);
          doc.text(condLines[0], 54, curPy3 + 4.5);
          if (condLines[1]) {
            doc.text(condLines[1], 54, curPy3 + 8.2);
          }

          doc.text(fmtShares(event.toVest), 117, curPy3 + 6.8);
          doc.setFont("helvetica", "bold");
          doc.text(fmtShares(event.totalVested), 155, curPy3 + 6.8);
          doc.setFont("helvetica", "normal");

          curPy3 += 11;
        }
      }

      curPy3 += 6;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text("Terms and conditions:", 20, curPy3);
      curPy3 += 5;

      const pointsPage3 = [
        "Hereinafter, the employees to whom this Letter of Grant is issued shall be referred to as “Option Grantee”.",
        "The Options granted are personal to the Option Grantee and cannot be transferred in any manner whatsoever.",
        "Each Option will entitle the participant to one equity share of the Company and Options issued to the Option Grantee shall always be convertible into equity shares only.",
        "Unless otherwise expressly defined in this Letter of Grant, all capitalised terms shall have the same meaning assigned to it in the ESOP 2020.",
        "Option Grantee, who wishes to accept an offer made must deliver duly filled Acceptance Form (enclosed as Form II) at the registered office of the Company addressed to The ESOP Committee on or before 14 days from the Date of Grant. Further, Option Grantee shall mention his/her name and address precisely in the Acceptance Form.",
        "Option Grantee, who fails to return the Acceptance Form on or before the closing date is deemed to have rejected the offer and Acceptance Form received after the closing date shall not be valid unless the Board determines otherwise.",
        "Options granted shall vest as per the vesting details set forth above.",
        "The Option Grantee shall not have right to receive any dividend or to vote or in any manner or enjoy the benefits of a shareholder in respect of Options granted to him, till shares are issued on Exercise of the Option.",
        `For the purpose of Exercise, Option Grantee must deliver duly filled Exercise Form (enclosed as Form III) in writing along with exercise price of INR ${activeGrant.strikePrice || 1}/- per Option by enclosing cheque in favour of Teachmint Technologies Private Limited on or before aforementioned at the time of Exercise addressed to The ESOP Committee at the registered office of the Company or a demand draft drawn in favor of the Company or in such other manner as the Board may decide.`,
        "The Committee shall verify and accordingly communicate to the Option Grantee about valid Exercise."
      ];

      pointsPage3.forEach((pt, idx) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.6);
        const ptNum = `${idx + 1}.`;
        doc.text(ptNum, 20, curPy3);
        const ptLines = doc.splitTextToSize(pt, 163);
        ptLines.forEach((line: string) => {
          doc.text(line, 26, curPy3);
          curPy3 += 4;
        });
        curPy3 += 1.2;
      });

      drawPageFooter(doc);

      // ================= PAGE 4 =================
      doc.addPage();
      drawPageLogoText(doc, 12);

      let curPy4 = 32;
      const pointsPage4 = [
        "The Option Grantee may nominate any Beneficiary to whom any benefit under the ESOP 2020 is to be delivered in case of Option Grantee’s death or Permanent Incapacitation, before he or she receives all of such benefit by delivering Nomination Form (enclosed as Form IV) to the Company at the registered office of the Company addressed to The ESOP Committee.",
        "For other terms and conditions relating to eligibility of employees, administration of the ESOP 2020, granting of Options, method of acceptance, vesting of Options, exercise price, exercise of Options (including exercise period), termination of employment, notices and correspondence, nomination, non-transferability of Options, corporate action, arbitration, regulatory approvals, miscellaneous provisions, modification of the ESOP 2020 and term of the ESOP 2020, the Option Grantee is requested to study and familiarize with the ESOP 2020 enclosed.",
        "Any Options granted hereunder is subject to the condition that the Option Grantee remains employed by the Company from the time of the grant through the end of the Vesting Period, unless as otherwise provided herein. However, neither such condition nor the grant of Options shall impose upon the Company any obligation to retain the Option Grantee in its employment for any given period or upon any specific terms of employment."
      ];

      pointsPage4.forEach((pt, idx) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.6);
        const ptNum = `${idx + 11}.`;
        doc.text(ptNum, 20, curPy4);
        const ptLines = doc.splitTextToSize(pt, 163);
        ptLines.forEach((line: string) => {
          doc.text(line, 26, curPy4);
          curPy4 += 4;
        });
        curPy4 += 2.5;
      });

      drawPageFooter(doc);

      // ================= PAGE 5 =================
      doc.addPage();
      drawPageLogoText(doc, 12);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text("Form II", 210 / 2, 38, { align: "center" });
      doc.text("ACCEPTANCE FORM", 210 / 2, 44, { align: "center" });

      doc.setFontSize(9);
      doc.text(`From: ${user.name}`, 20, 56);
      doc.text("To,", 20, 64);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text([
        "The ESOP Committee,",
        "Employees’ Stock Option Plan 2020,",
        "Teachmint Technologies Private Limited,",
        "5th Floor, North Wing, SJR The HUB, Survey No. 8/2 & 9,",
        "Sarjapur Road, Bengaluru,",
        "Karnataka - 560103."
      ], 20, 70);

      yPos = 106;
      printParagraph(`This is with reference to the Letter of Grant dated ${gDateFormatted} issued under the Employees’ Stock Option Plan 2020 (“ESOP 2020”) of Teachmint Technologies Private Limited.`, 4);
      printParagraph(`I have read the terms and conditions stipulated in the Letter of Grant and the ESOP 2020 and wish to subscribe to ${fmtShares(activeGrant.totalShares)} Options granted to me.`, 4);
      printParagraph("I undertake to be bound by the terms and conditions of the ESOP 2020 which I confirm to have understood fully.", 6);
      printParagraph("Yours faithfully,", 14);

      // Stakeholder digital signature verified
      if (activeGrant.employeeEsignDate) {
        doc.setDrawColor(16, 185, 129); // emerald green
        doc.setLineWidth(0.2);
        doc.rect(20, yPos, 85, 17);
        doc.setFont("times", "italic");
        doc.setFontSize(11);
        doc.setTextColor(16, 185, 129);
        doc.text(user.name, 24, yPos + 4.5);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Signee: ${user.name}`, 24, yPos + 8.5);
        doc.text(`Date: ${formatDateSafe(activeGrant.employeeEsignDate)}`, 24, yPos + 12.5);
        yPos += 23;
      } else {
        doc.setDrawColor(220, 38, 38);
        doc.setLineWidth(0.2);
        doc.rect(20, yPos, 85, 17);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(220, 38, 38);
        doc.text("✗ AWAITING ACCEPTANCE", 24, yPos + 9.5);
        yPos += 23;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text(user.name, 20, yPos);

      drawPageFooter(doc);

      doc.save(`Signed_ESOP_Grant_Letter_${activeGrant.id}.pdf`);
      return;
    }

    const doc = new jsPDF();
    const primaryColor = "#0052FF";
    
    // Header
    doc.setFillColor( primaryColor );
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("TEACHVEST", 20, 25);
    doc.setFontSize(10);
    doc.text("OFFICIAL EQUITY STATEMENT", 20, 32);
    
    // Body
    doc.setTextColor(51, 51, 51);
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 150, 50);
    
    doc.setFont("helvetica", "bold");
    doc.text("Employee Information", 20, 65);
    doc.setDrawColor(230, 230, 230);
    doc.line(20, 68, 190, 68);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Name: ${user.name}`, 20, 75);
    doc.text(`Employee ID: ${user.id}`, 20, 80);
    doc.text(`Department: ${user.department}`, 20, 85);
    doc.text(`Designation: ${user.designation}`, 20, 90);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Equity Summary", 20, 110);
    doc.line(20, 113, 190, 113);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Total Options Granted: ${fmt(totalGranted)} Shares`, 20, 120);
    doc.text(`Total Options Vested: ${fmt(totalVested)} Shares`, 20, 125);
    doc.text(`Total Options Exercised: ${fmt(totalExercised)} Shares`, 20, 130);
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("This is an electronically generated document. No signature required.", 105, 280, { align: "center" });
    doc.text("© 2024 TeachVest. Confidental & Restricted.", 105, 285, { align: "center" });
    
    doc.save(`${docName.toLowerCase().replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="min-h-screen bg-bg-base transition-colors duration-300">
      {/* Navbar */}
      <header className="bg-bg-surface border-b border-slate-100 dark:border-slate-800 sticky top-0 z-50 shadow-[0_4px_12px_rgba(0,82,255,0.03)] transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 group">
            <motion.div 
              whileHover={{ rotate: -5, scale: 1.05 }}
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

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-3 pr-6 border-r border-slate-100 dark:border-slate-800">
              <Avatar name={user.name} size={40} />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-text-main leading-tight">{user.name}</span>
                <span className="text-[11px] text-brand-primary font-bold uppercase tracking-tight">{user.designation}</span>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="p-2.5 rounded-xl text-text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all border border-transparent hover:border-red-100 dark:hover:border-red-900/50"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
          <div>
            <h1 className="text-4xl font-extrabold text-text-main tracking-tight mb-2">My TeachVest Portfolio</h1>
            <p className="text-text-muted font-medium flex items-center gap-3">
              Member ID: <span className="text-brand-primary font-bold">{user.id}</span>
              <span className="w-1.5 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full"></span>
              Joined {fmtDate(user.joinDate)}
            </p>
          </div>
          
          {/* Tab Navigation */}
          <nav className="flex bg-slate-100/80 dark:bg-slate-800/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 self-start lg:self-auto transition-colors">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-[14px] text-sm font-bold transition-all ${
                  activeTab === tab.id 
                  ? "bg-bg-surface text-brand-primary shadow-lg shadow-brand-primary/10 ring-1 ring-black/5" 
                  : "text-text-muted hover:text-text-main"
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "overview" && (
              <div className="space-y-10">
                {/* Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                  <MetricCard 
                    label="Total Granted Options" 
                    value={fmt(totalGranted)} 
                    sub="Allocated Shares" 
                    icon={<Gift size={20} />} 
                    colorClass="text-brand-accent"
                  />
                  <MetricCard 
                    label="Total Outstanding Vested" 
                    value={fmt(totalOutstandingVested)} 
                    sub="Vested - Exercised" 
                    icon={<CheckCircle2 size={20} />} 
                    colorClass="text-emerald-500"
                  />
                  <MetricCard 
                    label="Total Outstanding Unvested" 
                    value={fmt(totalOutstandingUnvested)} 
                    sub="Vesting Remaining" 
                    icon={<TrendingUp size={20} />} 
                    colorClass="text-brand-primary"
                  />
                  <MetricCard 
                    label="Total Surrendered/Buyback" 
                    value={fmt(totalBuyback)} 
                    sub="Claimed/Returned" 
                    icon={<History size={20} />} 
                    colorClass="text-purple-500"
                  />
                  <MetricCard 
                    label="Total Lapsed Options" 
                    value={fmt(totalLapsed)} 
                    sub="Expired Slots" 
                    icon={<AlertCircle size={20} />} 
                    colorClass="text-rose-500"
                  />
                  <MetricCard 
                    label="Total Exercised Options" 
                    value={fmt(totalExercised)} 
                    sub="Converted to equity" 
                    icon={<CheckCircle2 size={20} />} 
                    colorClass="text-slate-500"
                  />
                </div>

                {/* Grants Section */}
                <div className="bg-bg-surface border border-slate-100 dark:border-slate-800 rounded-3xl p-10 shadow-[0_8px_30px_rgba(0,0,0,0.02)] transition-colors">
                  <div className="flex items-center gap-3 mb-10">
                    <div className="w-2 h-8 bg-brand-primary rounded-full"></div>
                    <h3 className="text-2xl font-extrabold text-text-main">TeachVest Grants</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-8">
                    {user.grants.map(grant => (
                      <div key={grant.id} className="group p-8 rounded-3xl bg-bg-base border border-slate-100 dark:border-slate-800 hover:border-brand-primary/20 hover:shadow-xl hover:shadow-brand-primary/5 transition-all">
                        <div className="flex flex-col lg:flex-row justify-between gap-8 mb-10">
                          <div className="flex gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-bg-surface border border-slate-200 dark:border-slate-700 flex items-center justify-center text-brand-primary group-hover:scale-110 transition-transform shadow-lg shadow-brand-primary/5">
                              <Gift size={28} />
                            </div>
                            <div>
                              <div className="flex items-center gap-4 mb-2">
                                <h4 className="text-xl font-extrabold text-text-main tracking-tight">{grant.id}</h4>
                                <StatusBadge status={grant.status} />
                              </div>
                              <p className="text-sm text-text-muted font-medium flex items-center gap-3">
                                <span className="flex items-center gap-1.5"><Calendar size={16} className="text-slate-400" /> Granted {fmtDate(grant.grantDate)}</span>
                                <span className="w-1.5 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full"></span>
                                <span className="font-bold text-brand-primary/80 uppercase tracking-tighter text-xs">{grant.vestingSchedule}</span>
                              </p>
                            </div>
                          </div>
                                                     <div className="flex flex-wrap gap-4">
                            {[
                              { label: 'Shares Available', value: fmt(calculateLiveVested(grant, user.joinDate, user.cliffType) - grant.exercisedShares) },
                              { label: 'Total Shares', value: fmt(grant.totalShares) },
                              { label: 'Exercised Shares', value: fmt(grant.exercisedShares) },
                            ].map(item => (
                              <div key={item.label} className="px-6 py-3 rounded-2xl bg-bg-surface border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center transition-colors">
                                <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest leading-none mb-2">{item.label}</div>
                                <div className="text-base font-bold text-text-main">{item.value}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <VestingBar vested={calculateLiveVested(grant)} exercised={grant.exercisedShares} total={grant.totalShares} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "grants" && (
              <div className="grid grid-cols-1 gap-6">
                {user.grants.map(grant => (
                  <div key={grant.id} className="bg-bg-surface border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm transition-colors">
                    <div className="flex justify-between items-start mb-10">
                      <div>
                        <h3 className="text-2xl font-extrabold text-text-main tracking-tight mb-2">Allocation Details: {grant.id}</h3>
                        <p className="text-text-muted font-medium">Automated quarterly vesting as per Grant Letter</p>
                      </div>
                      <StatusBadge status={grant.status} />
                    </div>
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
                      {[
                        { label: 'Grant Date', value: fmtDate(grant.grantDate), icon: Calendar },
                        { label: 'Total Granted (Units)', value: fmt(grant.totalShares), icon: Gift },
                        { label: 'Vested (Units)', value: fmt(calculateLiveVested(grant, user.joinDate, user.cliffType)), icon: CheckCircle2 },
                        { label: 'Exercised (Units)', value: fmt(grant.exercisedShares), icon: CheckCircle2 },
                      ].map(item => (
                        <div key={item.label} className="p-5 rounded-2xl bg-bg-base border border-slate-100 dark:border-slate-800 transition-colors">
                          <item.icon size={20} className="text-brand-primary mb-3" />
                          <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">{item.label}</div>
                          <div className="text-xl font-bold text-text-main">{item.value}</div>
                        </div>
                      ))}
                    </div>

                    <VestingBar vested={calculateLiveVested(grant, user.joinDate, user.cliffType)} exercised={grant.exercisedShares} total={grant.totalShares} />
                  </div>
                ))}
              </div>
            )}
             {activeTab === "transactions" && (
              <div className="bg-bg-surface border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm transition-colors">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-xl font-bold text-text-main">Transaction History</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-bg-base">
                        {["Date", "Action Type", "Units/Shares"].map(h => (
                          <th key={h} className="px-8 py-5 text-[11px] font-bold text-text-muted uppercase tracking-widest">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 transition-all">
                      {user.transactions.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="px-8 py-20 text-center text-text-muted font-medium">
                            No transactions recorded yet.
                          </td>
                        </tr>
                      ) : (
                        user.transactions.map((t, idx) => (
                          <tr key={idx} className="group hover:bg-bg-base transition-colors">
                            <td className="px-8 py-6 text-sm font-semibold text-text-main">{fmtDate(t.date)}</td>
                            <td className="px-8 py-6">
                              <StatusBadge status={t.type} />
                            </td>
                            <td className="px-8 py-6 text-sm font-bold text-text-main font-mono">{fmt(t.shares)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "vesting" && (
              <div className="space-y-8 animate-fadeIn">
                {/* Header Information Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 bg-bg-surface shadow-sm rounded-3xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-black tracking-widest text-[#0052FF] block mb-2">Joining Date / ESOP Start</span>
                    <span className="text-2xl font-extrabold text-text-main font-mono">{fmtDate(user.joinDate)}</span>
                  </div>
                  <div className="p-6 bg-bg-surface shadow-sm rounded-3xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-black tracking-widest text-emerald-500 block mb-2">My Vesting Cliff Selection</span>
                    <span className="text-2xl font-extrabold text-text-main font-sans">{user.cliffType || "Annually (Standard)"}</span>
                  </div>
                  <div className="p-6 bg-bg-surface shadow-sm rounded-3xl border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-black tracking-widest text-brand-accent block mb-2">Total Shares Outstanding</span>
                    <span className="text-2xl font-extrabold text-text-main font-mono">{fmt(totalGranted)} Shares</span>
                  </div>
                </div>

                {user.grants.map(grant => {
                  const schedule = generateVestingSchedule(user.joinDate, grant.totalShares, user.cliffType);
                  const nextMilestones = schedule.filter(m => m.status === "Upcoming");
                  const vestedMilestones = schedule.filter(m => m.status === "Vested");

                  return (
                    <div key={grant.id} className="bg-bg-surface border border-slate-200 dark:border-slate-800 rounded-[32px] p-8 shadow-sm transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                          <div className="text-xs font-black text-brand-primary uppercase tracking-widest mb-1">Schedule Forecast for Allocation</div>
                          <h3 className="text-2xl font-extrabold text-text-main tracking-tight">- Grant ID Reference: {grant.id}</h3>
                        </div>
                        <div className="px-5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 font-mono text-sm font-bold text-text-muted">
                          Multiplier: {fmt(grant.totalShares / 16)} Units / Quarter
                        </div>
                      </div>

                      {/* Summary statistics inside schedule */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center">
                          <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-1">Vested Stages</span>
                          <span className="text-sm font-bold text-emerald-600">{vestedMilestones.length} / {schedule.length} Milestones</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center">
                          <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-1">Next Release</span>
                          <span className="text-sm font-bold text-brand-primary">{nextMilestones[0] ? fmtDate(nextMilestones[0].date) : "Fully Vested"}</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center">
                          <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-1">Upcoming Units</span>
                          <span className="text-sm font-bold text-amber-500 font-mono">{nextMilestones[0] ? `${fmt(nextMilestones[0].toVest)} Units` : "—"}</span>
                        </div>
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-center">
                          <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block mb-1">Aggregate Vested</span>
                          <span className="text-sm font-bold text-text-main font-mono">{fmt(totalVested)} Vested Units</span>
                        </div>
                      </div>

                      <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900 transition-colors">
                              <th className="px-8 py-4 text-[10px] font-extrabold text-text-muted uppercase tracking-[0.2em]">Vesting Date</th>
                              <th className="px-8 py-4 text-[10px] font-extrabold text-text-muted uppercase tracking-[0.2em]">To Vest</th>
                              <th className="px-8 py-4 text-[10px] font-extrabold text-text-muted uppercase tracking-[0.2em]">Total Vested</th>
                              <th className="px-8 py-4 text-[10px] font-extrabold text-text-muted uppercase tracking-[0.2em]">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 transition-all">
                            {schedule.map((milestone, idx) => (
                              <tr key={idx} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                                <td className="px-8 py-4.5 text-sm font-bold text-text-main font-mono">{fmtDate(milestone.date)}</td>
                                <td className="px-8 py-4.5 text-sm font-black text-brand-primary font-mono">+{fmt(milestone.toVest)} Units</td>
                                <td className="px-8 py-4.5 text-sm font-extrabold text-text-main font-mono">{fmt(milestone.totalVested)} Units</td>
                                <td className="px-8 py-4.5">
                                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                    milestone.status === "Vested" 
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                  }`}>
                                    <span className={`w-1 h-1 rounded-full ${milestone.status === "Vested" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                                    {milestone.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "documents" && (
              <div className="bg-bg-surface border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm transition-colors">
                {/* Interactive Offer Letter e-Signing Desk - Hidden as per requirement */}
                {false && user.grants && user.grants.length > 0 ? (() => {
                  const activeGrant = user.grants[0];
                  const currentStatus = activeGrant.workflowStatus || "Draft";
                  const isPendingStakeholder = currentStatus === "Pending Employee Signature";
                  const vestingTableHtml = generateVestingScheduleTableHtml(
                    activeGrant,
                    user.joinDate || activeGrant.grantDate,
                    user.cliffType,
                    companySettings.roundingMode
                  );

                  if (currentStatus === "Draft" || currentStatus === "Pending Admin Review" || currentStatus === "Pending Signatory Signature") {
                     return (
                       <div className="mb-8 p-6 bg-amber-500/5 rounded-3xl border border-amber-500/10 text-amber-600 flex items-center gap-3">
                         <AlertCircle size={20} className="shrink-0 animate-bounce" />
                         <p className="text-xs font-semibold">Your ESOP Offer Offering ({activeGrant.id}) is being drafted & reviewed by administrators. It will be available for signature once fully cleared.</p>
                       </div>
                     );
                  }

                  return (
                    <div className="mb-8 p-8 bg-bg-surface dark:bg-slate-900/40 rounded-[32px] border border-slate-100 dark:border-slate-800 space-y-8 shadow-sm">
                      <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800 flex-wrap gap-2">
                        <div>
                          <h4 className="text-sm font-black uppercase text-brand-primary tracking-widest flex items-center gap-2">
                            <Shield className="text-emerald-500" size={16} />
                            Offer Letter E-Signature Desk
                          </h4>
                          <p className="text-[10px] text-text-muted mt-1 font-medium">Verify your Board-certified equity allocation scheme and execute digitally.</p>
                        </div>
                        <span className={`text-[10px] font-black font-mono uppercase px-3 py-1 rounded-full ${
                          currentStatus === "Fully Signed"
                            ? "bg-emerald-500/15 text-emerald-500"
                            : "bg-indigo-500/15 text-indigo-500 animate-pulse"
                        }`}>
                          {currentStatus === "Fully Signed" ? "★ Execution Certified" : "✍️ Awaiting E-Signature Input"}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                        {/* Dynamic Letter Frame */}
                        <div className="lg:col-span-3 bg-white dark:bg-slate-950 p-8 rounded-3xl shadow-inner border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-sans leading-relaxed text-xs space-y-6 max-h-[360px] overflow-y-auto">
                          {!companySettings.grantLetterBodyHeader?.includes("LETTER OF GRANT") && (
                            <>
                              <div className="text-center font-sans space-y-1 border-b pb-4 border-slate-200 dark:border-slate-800">
                                <h3 className="text-xs font-black tracking-widest uppercase text-slate-900 dark:text-slate-100">{companySettings.grantLetterCompanyName || "Teachmint Technologies Private Limited"}</h3>
                                <p className="text-[8px] font-bold text-slate-500 uppercase">{companySettings.grantLetterCompanyAddress || "Regd Office: Bangalore, Landmark Tower, Sector 3A, India"}</p>
                              </div>

                              <div className="flex justify-between font-sans text-[8px] text-slate-500 font-bold uppercase">
                                <span>Ref: TM/ESOP/{activeGrant.id}</span>
                                <span>Date: {fmtDate(activeGrant.grantDate)}</span>
                              </div>

                              <div className="font-sans text-[10px] font-extrabold text-slate-900 dark:text-slate-100">
                                <p>To,</p>
                                <p className="capitalize mt-1">{user.name}</p>
                                <p className="text-slate-500">{user.designation} — {user.department}</p>
                                <p className="text-slate-400">Employee Unique Code: {user.id}</p>
                              </div>

                              <div className="text-center font-sans font-black uppercase text-[10px] tracking-wider text-slate-900 dark:text-slate-100 underline decoration-indigo-500 decoration-2">
                                {companySettings.grantLetterSubject || "Subject: Option offering under Employees’ Stock Option Plan 2020 (ESOP 2020)"}
                              </div>

                              <p>
                                Dear <strong className="font-sans font-extrabold capitalize">{user.name}</strong>,
                              </p>
                            </>
                          )}

                          <div 
                            className="text-slate-700 dark:text-slate-300 leading-relaxed space-y-2 whitespace-pre-wrap text-xs font-sans"
                            dangerouslySetInnerHTML={{
                              __html: replaceLetterPlaceholders(
                                companySettings.grantLetterBodyHeader || "On behalf of Teachmint Technologies Private Limited, we are pleased to offer you options under the Teachmint ESOP Plan 2020. Below are the core parameters of your grant:",
                                user.name,
                                `${fmt(activeGrant.totalShares)} Units`,
                                `₹${activeGrant.strikePrice || 10}`,
                                activeGrant.vestingSchedule,
                                companySettings.grantLetterCompanyName || "Teachmint Technologies",
                                new Date().toLocaleDateString(undefined, {year: 'numeric', month: 'long', day: 'numeric'}),
                                companySettings.signatoryName || "Mihir Gupta",
                                companySettings.signatoryDesignation || "Co-Founder & CEO",
                                companySettings.grantLetterCompanyAddress || "5th Floor, North Wing, SJR The HUB, Survey No. 8/2 & 9, Sarjapur Road, Bengaluru, Karnataka - 560103",
                                companySettings.grantLetterCompanyCIN || "CIN: U62099KA2020PTC135305",
                                user.id,
                                user.designation || "Executive",
                                user.department || "Operations",
                                vestingTableHtml
                              ).replace(/\n/g, "<br/>")
                            }}
                          />

                          <div className="grid grid-cols-2 gap-4 font-sans bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 text-[9px] font-extrabold uppercase text-slate-500">
                            <div>
                              <p className="text-slate-400 text-[8px] font-black text-[7px]">Grant Unique ID</p>
                              <p className="text-slate-900 dark:text-slate-100 text-[11px] font-black">{activeGrant.id}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 text-[8px] font-black text-[7px]">Offered Options Count</p>
                              <p className="text-slate-900 dark:text-slate-100 text-[11px] font-black">{fmt(activeGrant.totalShares)} units</p>
                            </div>
                            <div>
                              <p className="text-slate-400 text-[8px] font-black text-[7px]">Strike Option Price</p>
                              <p className="text-emerald-600 text-[11px] font-black">₹{activeGrant.strikePrice || 10}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 text-[8px] font-black text-[7px]">Vesting Option Period</p>
                              <p className="text-slate-900 dark:text-slate-100 text-[11px] font-black">{activeGrant.vestingSchedule}</p>
                            </div>
                          </div>

                          <div 
                            className="text-slate-700 dark:text-slate-300 leading-relaxed space-y-2 whitespace-pre-wrap text-xs font-sans"
                            dangerouslySetInnerHTML={{
                              __html: replaceLetterPlaceholders(
                                companySettings.grantLetterBodyFooter || "This offer and your participation in the ESOP Plan 2025 are subject to the terms and rules set out by Teachmint and the board of directors. By e-signing this offer letter below, you acknowledge and agree to abide by all the general guidelines of Teachmint.",
                                user.name,
                                `${fmt(activeGrant.totalShares)} Units`,
                                `₹${activeGrant.strikePrice || 10}`,
                                activeGrant.vestingSchedule,
                                companySettings.grantLetterCompanyName || "Teachmint Technologies",
                                new Date().toLocaleDateString(undefined, {year: 'numeric', month: 'long', day: 'numeric'}),
                                companySettings.signatoryName || "Mihir Gupta",
                                companySettings.signatoryDesignation || "Co-Founder & CEO",
                                companySettings.grantLetterCompanyAddress || "5th Floor, North Wing, SJR The HUB, Survey No. 8/2 & 9, Sarjapur Road, Bengaluru, Karnataka - 560103",
                                companySettings.grantLetterCompanyCIN || "CIN: U62099KA2020PTC135305",
                                user.id,
                                user.designation || "Executive",
                                user.department || "Operations",
                                vestingTableHtml
                              ).replace(/\n/g, "<br/>")
                            }}
                          />

                          {/* Signatures Panel */}
                          <div className="grid grid-cols-2 gap-8 pt-6 border-t border-dashed border-slate-200 dark:border-slate-800 font-sans text-[9px]">
                            {/* Signatory */}
                            <div className="space-y-1 font-bold">
                              <p className="text-slate-400 font-black uppercase text-[7px]">Authorized Signatory</p>
                              <p className="text-emerald-500 font-extrabold">✓ Digitally Signed</p>
                              <p className="text-slate-400 font-mono">Date: {fmtDate(activeGrant.signatorySignedDate || activeGrant.grantDate)}</p>
                              <div className="pt-1 text-slate-800 dark:text-slate-200 font-black">
                                <p>{companySettings.signatoryName || "Sanju T"}</p>
                                <p className="text-[7px] text-slate-500 font-medium">{companySettings.signatoryDesignation || "Director"}</p>
                              </div>
                            </div>

                            {/* Employee */}
                            <div className="space-y-1 font-bold">
                              <p className="text-slate-400 font-black uppercase text-[7px]">Stakeholder E-Sign</p>
                              {activeGrant.employeeEsignDate ? (
                                <div className="space-y-0.5">
                                  <p className="text-emerald-500 font-extrabold">✓ Digitally Accepted</p>
                                  <p className="text-slate-400 font-mono">Date: {fmtDate(activeGrant.employeeEsignDate)}</p>
                                </div>
                              ) : (
                                <p className="text-rose-500 font-black animate-pulse">✗ Awaiting Acceptance</p>
                              )}
                              <div className="pt-1 text-slate-800 dark:text-slate-200 font-black">
                                <p>{user.name}</p>
                                <p className="text-[7px] text-slate-500 font-medium">{user.designation}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Signature Input & Script Calligraphy Desk */}
                        <div className="lg:col-span-2 space-y-4 font-mono text-xs">
                          {isPendingStakeholder ? (
                            <div className="space-y-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-text-muted">Type Full Legal Name</label>
                                <input 
                                  type="text"
                                  value={typedSignature}
                                  onChange={(e) => setTypedSignature(e.target.value)}
                                  placeholder="e.g. Preeta Saxena"
                                  className="w-full text-xs font-bold p-2.5 rounded-xl bg-bg-base border border-slate-200 dark:border-slate-800 text-brand-primary text-center focus:outline-none focus:border-indigo-500 text-base uppercase"
                                />
                              </div>

                              {/* Calligraphy Physical Signature Preview */}
                              {typedSignature.trim().length > 0 && (
                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 text-center relative overflow-hidden flex flex-col justify-center min-h-[90px]">
                                  <span className="text-[7px] font-black uppercase text-slate-400 absolute top-2 left-2">Signature Calligraphy Rendering</span>
                                  <span className="text-2xl text-indigo-500 dark:text-indigo-400 italic tracking-widest font-sans block py-2 select-none select-sign text-emerald-500 uppercase">
                                    {typedSignature}
                                  </span>
                                  <span className="text-[7px] font-mono text-slate-400 absolute bottom-2 right-2">SECURED SECURE ELECTRONIC LOCK</span>
                                </div>
                              )}

                              <div className="flex items-start gap-2 pt-1">
                                <input 
                                  type="checkbox"
                                  id="agreeToSignCheck"
                                  checked={agreedToTerms}
                                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                                  className="w-4 h-4 text-brand-primary accent-brand-primary rounded cursor-pointer shrink-0 mt-0.5"
                                />
                                <label htmlFor="agreeToSignCheck" className="text-[10px] font-bold text-text-muted leading-snug cursor-pointer select-none">
                                  I certify that this typed sign-off represents a legally binding electronic seal under Indian IT Act 2000.
                                </label>
                              </div>

                              <button
                                disabled={!agreedToTerms || typedSignature.trim().length === 0}
                                onClick={async () => {
                                  const updatedGrants = user.grants.map(g => g.id === activeGrant.id ? {
                                    ...g,
                                    workflowStatus: "Fully Signed",
                                    employeeEsignDate: new Date().toISOString()
                                  } : g);
                                  
                                  const simulatedFileStr = `Signed ESOP Grant Letter - Ref: TM/ESOP/${activeGrant.id}\nSigned by Authorized Signatory Sanju T and stakeholder ${user.name} digitally. Document Certified.`;
                                  const base64Url = "data:text/plain;base64," + btoa(simulatedFileStr);
                                  
                                  const updatedDocs = [
                                    ...(user.documents || []),
                                    {
                                      name: `Signed_ESOP_Grant_Letter_${activeGrant.id}.txt`,
                                      url: base64Url,
                                      uploadDate: new Date().toISOString().split('T')[0],
                                      isSignedLetter: true
                                    }
                                  ];

                                  const updatedUser = { ...user, grants: updatedGrants, documents: updatedDocs };
                                  setUser(updatedUser);
                                  
                                  const { updateEmployeeData, createAuditLog } = await import("../services/dataService");
                                  await updateEmployeeData(user.id, { grants: updatedGrants, documents: updatedDocs }, user.email);
                                  await createAuditLog(
                                    "Employee Acceptance Registered", 
                                    `Employee ${user.name} accepted and e-signed offer ${activeGrant.id}. Signature stamp added.`
                                  );
                                  setEsignSuccess(true);
                                  setTimeout(() => setEsignSuccess(false), 5000);
                                }}
                                className={`w-full py-2.5 rounded-xl font-black text-xs text-white text-center transition-all shadow-md select-none cursor-pointer outline-none ${
                                  agreedToTerms && typedSignature.trim().length > 0
                                    ? "bg-indigo-600 hover:bg-indigo-700 active:scale-95"
                                    : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                                }`}
                              >
                                ✍️ Sign & Execute Grant Offering
                              </button>
                            </div>
                          ) : (
                            <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 h-full py-12">
                              <span className="text-3xl">✓</span>
                              <p className="font-extrabold uppercase text-[11px]">Agreement Executed</p>
                              <p className="text-[10px] text-zinc-400 font-sans leading-normal">Your options offer letter has been successfully sealed and written to the secure archival ledger.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })() : null}

                <h3 className="text-xl font-bold text-text-main mb-8 font-sans">Official Documentation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { name: "ESOP Grant Letter", date: user.grantDate, type: "Grant Letter · PDF", icon: FileText, custom: false, url: "" },
                    { 
                      name: companySettings.defaultEsopPolicyFileName || "Teachmint_Global_ESOP_Policy_2025.pdf", 
                      date: "2026-06-02", 
                      type: "Guide · PDF", 
                      icon: FileText, 
                      custom: !!companySettings.defaultEsopPolicyFileUrl, 
                      url: companySettings.defaultEsopPolicyFileUrl || "" 
                    },
                    ...(user.documents || [])
                      .filter((doc: any) => !doc.name.endsWith('.txt') && !doc.name.includes("Signed_ESOP_Grant_Letter"))
                      .map((doc: any) => {
                        let fileType = "PDF";
                        if (doc.url && doc.url.startsWith("data:")) {
                          const matchType = doc.url.match(/data:([^;]+);/);
                          if (matchType && matchType[1]) {
                            const ext = matchType[1].split("/")[1];
                            fileType = ext ? ext.toUpperCase() : "DOC";
                          }
                        } else if (doc.url) {
                          fileType = doc.url.split('.').pop()?.toUpperCase() || "PDF";
                        }
                        return {
                          name: doc.name,
                          date: doc.uploadDate || doc.uploadedAt || new Date().toISOString(),
                          type: `Custom Document · ${fileType}`,
                          icon: FileText,
                          custom: true,
                          url: doc.url
                        };
                      })
                  ].map((doc, idx) => (
                    <motion.div 
                      key={idx}
                      whileHover={{ x: 5 }}
                      onClick={() => {
                        if (doc.name.toLowerCase().includes("policy") && (!doc.url || doc.url.startsWith("data:text/plain") || doc.url === "")) {
                          handleDownloadPDF(doc.name);
                        } else if (doc.custom && doc.url) {
                          const link = document.createElement("a");
                          link.href = doc.url;
                          link.download = doc.name;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        } else {
                          handleDownloadPDF(doc.name);
                        }
                      }}
                      className="group flex items-center justify-between p-5 rounded-3xl border border-slate-100 dark:border-slate-800 bg-bg-base hover:bg-brand-secondary/30 dark:hover:bg-brand-secondary/10 hover:border-brand-primary/20 transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-bg-surface border border-slate-200 dark:border-slate-700 flex items-center justify-center text-text-muted group-hover:text-brand-primary transition-colors">
                          <doc.icon size={22} />
                        </div>
                        <div>
                          <h4 className="font-bold text-text-main leading-tight group-hover:text-brand-primary transition-colors">{doc.name}</h4>
                          <p className="text-xs text-text-muted font-medium mt-1">{doc.type} • Last Updated {fmtDate(doc.date)}</p>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-bg-surface border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-300 group-hover:text-emerald-500 transition-colors shadow-sm">
                        <Download size={18} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "profile" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fadeIn">
                <div className="bg-bg-surface border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm transition-colors">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                      <Shield size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-text-main">Security Settings</h3>
                      <p className="text-xs text-text-muted font-bold uppercase tracking-widest mt-0.5">Manage your user profile & password</p>
                    </div>
                  </div>

                  {successMsg && (
                    <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 size={16} />
                      {successMsg}
                    </div>
                  )}
                  {errorMsg && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      {errorMsg}
                    </div>
                  )}

                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setSuccessMsg("");
                    setErrorMsg("");
                    const form = e.currentTarget;
                    const newPassword = (form.elements.namedItem('newPassword') as HTMLInputElement).value;
                    const confirmPassword = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value;
                    
                    if (!newPassword) {
                      setErrorMsg("Password cannot be empty");
                      return;
                    }
                    if (newPassword !== confirmPassword) {
                      setErrorMsg("New passwords do not match");
                      return;
                    }

                    try {
                      await updateEmployeeData(user.id, { password: newPassword });
                      setSuccessMsg("Password reset successfully!");
                      form.reset();
                    } catch (err) {
                      setErrorMsg("Error resetting password. Please check connection.");
                    }
                  }} className="space-y-6">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] block">ID Number</label>
                      <input 
                        type="text" 
                        disabled 
                        value={user.id} 
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-text-muted font-extrabold text-sm outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] block">Email / Username</label>
                      <input 
                        type="text" 
                        disabled 
                        value={user.email} 
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-text-muted font-extrabold text-sm outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] block">New Password</label>
                      <input 
                        type="password" 
                        name="newPassword"
                        required
                        placeholder="Enter new account password"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:border-brand-primary outline-none transition-all font-bold text-sm bg-transparent"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] block">Confirm New Password</label>
                      <input 
                        type="password" 
                        name="confirmPassword"
                        required
                        placeholder="Confirm new account password"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:border-brand-primary outline-none transition-all font-bold text-sm bg-transparent"
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="w-full py-4 bg-brand-primary text-white rounded-xl font-bold shadow-lg shadow-brand-primary/20 hover:scale-[1.01] transition-all"
                    >
                      Reset Password
                    </button>
                  </form>
                </div>

                <div className="bg-bg-surface border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm transition-colors flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                        <Users size={24} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-text-main">Nominee Beneficiary Details</h3>
                        <p className="text-xs text-text-muted font-bold uppercase tracking-widest mt-0.5 font-sans">Set up nominee for settlement claim</p>
                      </div>
                    </div>

                    {nomineeSuccess && (
                      <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                        <CheckCircle2 size={16} />
                        {nomineeSuccess}
                      </div>
                    )}

                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      setNomineeSuccess("");
                      const form = e.currentTarget;
                      const nameVal = (form.elements.namedItem('nomineeName') as HTMLInputElement).value.trim();
                      const relationVal = (form.elements.namedItem('nomineeRelation') as HTMLInputElement).value.trim();
                      const contactVal = (form.elements.namedItem('nomineeContact') as HTMLInputElement).value.trim();

                      try {
                        await updateEmployeeData(user.id, {
                          nomineeName: nameVal,
                          nomineeRelation: relationVal,
                          nomineeContact: contactVal
                        });
                        setNomineeSuccess("Nominee details updated successfully!");
                      } catch (err) {
                        console.error(err);
                      }
                    }} className="space-y-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] block">Nominee Full Name</label>
                        <input 
                          type="text" 
                          name="nomineeName"
                          defaultValue={user.nomineeName || ""}
                          required
                          placeholder="e.g. Suman Gupta" 
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:border-brand-primary outline-none transition-all font-bold text-sm bg-transparent"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] block">Relationship</label>
                        <input 
                          type="text" 
                          name="nomineeRelation"
                          defaultValue={user.nomineeRelation || ""}
                          required
                          placeholder="e.g. Spouse / Mother / Brother" 
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:border-brand-primary outline-none transition-all font-bold text-sm bg-transparent"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-extrabold text-text-muted uppercase tracking-[0.15em] block">Contact Number / Email</label>
                        <input 
                          type="text" 
                          name="nomineeContact"
                          defaultValue={user.nomineeContact || ""}
                          required
                          placeholder="e.g. +91 9988776655" 
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 focus:border-brand-primary outline-none transition-all font-bold text-sm bg-transparent"
                        />
                      </div>

                      <button 
                        type="submit" 
                        className="w-full py-4 bg-brand-primary text-white rounded-xl font-bold shadow-lg shadow-brand-primary/20 hover:scale-[1.01] transition-all"
                      >
                        Save Nominee Details
                      </button>
                    </form>
                  </div>

                  {(() => {
                    const fields = (
                      Array.isArray(user.customFields)
                        ? user.customFields
                        : user.customFields
                          ? Object.entries(user.customFields).map(([k, v]) => ({
                              key: k,
                              value: String(v),
                            }))
                          : []
                    ).filter((f) => f.key !== "Value of Options Granted");
                    if (fields.length === 0) return null;
                    return (
                      <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 animate-fadeIn">
                        <h4 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-widest mb-4">
                          Additional Information (Custom Profiles)
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          {fields.map((f, i) => (
                            <div
                              key={i}
                              className="p-4 rounded-2xl bg-bg-base border border-slate-100 dark:border-slate-800"
                            >
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-0.5">
                                {f.key}
                              </span>
                              <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                                {f.value || "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
