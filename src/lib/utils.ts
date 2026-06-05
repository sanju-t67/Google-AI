/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Grant } from "../types";

export const fmt = (n: number | undefined) => n?.toLocaleString("en-IN") ?? "-";

export const fmtCurrency = (n: number | null | undefined) => 
  n != null ? `₹${n.toLocaleString("en-IN")}` : "-";

export const fmtDate = (d: string | undefined): string => {
  if (!d) return "-";
  try {
    const val = new Date(d);
    if (!isNaN(val.getTime())) {
      return val.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    }
  } catch (e) {
    // Avoid crashing
  }
  return d;
};

export const pct = (a: number, b: number) => b ? Math.round((a / b) * 100) : 0;

export function calculateLiveVested(grant: Grant, joinDate?: string, cliffType?: "Quarterly" | "Half Yearly" | "Annually", globalRoundingMode?: string): number {
  const schedule = generateVestingSchedule(joinDate || grant.grantDate, grant.totalShares, cliffType, undefined, grant, globalRoundingMode);
  const vestedMilestones = schedule.filter(m => m.status === "Vested");
  if (vestedMilestones.length === 0) return 0;
  return vestedMilestones[vestedMilestones.length - 1].totalVested;
}

export function calcPortfolioValue(grants: Grant[], fmvOverride?: number, joinDate?: string, cliffType?: "Quarterly" | "Half Yearly" | "Annually", globalRoundingMode?: string) {
  return grants.reduce((sum, g) => {
    const vested = calculateLiveVested(g, joinDate, cliffType, globalRoundingMode);
    const fmv = fmvOverride ?? g.currentFMV;
    return sum + (vested - g.exercisedShares) * fmv;
  }, 0);
}

export function calcPotentialGain(grants: Grant[], fmvOverride?: number, joinDate?: string, cliffType?: "Quarterly" | "Half Yearly" | "Annually", globalRoundingMode?: string) {
  return grants.reduce((sum, g) => {
    const vested = calculateLiveVested(g, joinDate, cliffType, globalRoundingMode);
    const fmv = fmvOverride ?? g.currentFMV;
    return sum + (vested - g.exercisedShares) * (fmv - g.strikePrice);
  }, 0);
}

export function calcTotalVested(grants: Grant[], joinDate?: string, cliffType?: "Quarterly" | "Half Yearly" | "Annually", globalRoundingMode?: string) {
  return grants.reduce((sum, g) => sum + calculateLiveVested(g, joinDate, cliffType, globalRoundingMode), 0);
}

export function calcTotalGranted(grants: Grant[]) {
  return grants.reduce((sum, g) => sum + g.totalShares, 0);
}

export interface VestingEvent {
  date: string;
  toVest: number;
  totalVested: number;
  status: "Vested" | "Upcoming";
}

export function generateVestingSchedule(
  joinDate: string,
  totalShares: number,
  cliffType?: "Quarterly" | "Half Yearly" | "Annually",
  currentDateStr?: string,
  grant?: Grant,
  globalRoundingMode?: string
): VestingEvent[] {
  let start = new Date();
  if (joinDate) {
    const parsedStart = new Date(joinDate);
    if (!isNaN(parsedStart.getTime())) {
      start = parsedStart;
    }
  }
  const events: VestingEvent[] = [];
  
  let now = new Date();
  if (currentDateStr) {
    const parsedNow = new Date(currentDateStr);
    if (!isNaN(parsedNow.getTime())) {
      now = parsedNow;
    }
  }

  if (grant?.customVestingEvents && grant.customVestingEvents.length > 0) {
    const sorted = [...grant.customVestingEvents].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    sorted.forEach((ev) => {
      events.push({
        date: ev.date || new Date().toISOString().split('T')[0],
        toVest: ev.shares,
        totalVested: 0,
        status: "Upcoming"
      });
    });
  } else {
    // Define cliff duration in months
    let cliffMonths = 12; // default Annually
    if (cliffType === "Quarterly") {
      cliffMonths = 3;
    } else if (cliffType === "Half Yearly") {
      cliffMonths = 6;
    }

    // standard ESOP 4 year plan = 16 quarters (each quarter = 3 months)
    const quarterlyShare = totalShares / 16;

    for (let q = 1; q <= 16; q++) {
      const monthsAfterStart = q * 3;
      const eventDate = new Date(start);
      eventDate.setMonth(start.getMonth() + monthsAfterStart);
      
      let dateStr = "";
      if (!isNaN(eventDate.getTime())) {
        dateStr = eventDate.toISOString().split('T')[0];
      } else {
        dateStr = new Date().toISOString().split('T')[0];
      }

      let toVest = quarterlyShare;
      // Before cliff, accumulate shares and vest on the cliff date!
      if (monthsAfterStart < cliffMonths) {
        continue;
      }

      if (monthsAfterStart === cliffMonths) {
        const accumulatedQuarters = cliffMonths / 3;
        toVest = quarterlyShare * accumulatedQuarters;
      }

      events.push({
        date: dateStr,
        toVest: toVest,
        totalVested: 0,
        status: "Upcoming"
      });
    }
  }

  // Handle Pause shifts if active
  if (grant?.isPaused && grant?.pauseStartDate) {
    if (grant.resumeOption === "new_dates") {
      const baseResumeStr = grant.resumeStartDate || grant.pauseEndDate || new Date().toISOString().split('T')[0];
      let baseResumeDate = new Date();
      const parsedBase = new Date(baseResumeStr);
      if (!isNaN(parsedBase.getTime())) {
        baseResumeDate = parsedBase;
      }
      
      // Separate pre-pause and post-pause milestones
      const postPauseEvents = events.filter(e => e.date >= grant.pauseStartDate!);
      
      // Shift post-pause milestones starting from baseResumeDate
      postPauseEvents.forEach((ev, index) => {
        const shiftedDate = new Date(baseResumeDate);
        if (!isNaN(shiftedDate.getTime())) {
          shiftedDate.setMonth(baseResumeDate.getMonth() + index * 3);
          ev.date = shiftedDate.toISOString().split('T')[0];
        } else {
          ev.date = new Date().toISOString().split('T')[0];
        }
      });
    }
  }

  // Handle Rounding calculations and final accumulation
  const mode = grant?.roundingMode || globalRoundingMode || "2-decimal";
  let cumulative = 0;

  events.forEach(e => {
    let roundedToVest = e.toVest;
    if (mode === "nearest_integer") {
      roundedToVest = Math.round(roundedToVest);
    } else if (mode === "4-decimal") {
      roundedToVest = parseFloat(roundedToVest.toFixed(4));
    } else if (mode === "2-decimal") {
      roundedToVest = parseFloat(roundedToVest.toFixed(2));
    }

    cumulative += roundedToVest;

    let roundedCumulative = cumulative;
    if (mode === "nearest_integer") {
      roundedCumulative = Math.round(cumulative);
    } else if (mode === "4-decimal") {
      roundedCumulative = parseFloat(cumulative.toFixed(4));
    } else if (mode === "2-decimal") {
      roundedCumulative = parseFloat(cumulative.toFixed(2));
    }

    const eventDate = new Date(e.date);
    let isVested = false;
    if (!isNaN(eventDate.getTime())) {
      isVested = eventDate <= now;
    }
    
    if (grant?.isPaused && grant?.pauseStartDate && grant?.pauseEndDate) {
      const pStart = new Date(grant.pauseStartDate);
      const pEnd = new Date(grant.pauseEndDate);
      if (!isNaN(pStart.getTime()) && !isNaN(pEnd.getTime()) && !isNaN(eventDate.getTime())) {
        if (now >= pStart && now <= pEnd) {
          if (eventDate >= pStart) {
            isVested = false;
          }
        }
      }
    }

    e.toVest = roundedToVest;
    e.totalVested = parseFloat(Math.min(totalShares, roundedCumulative).toFixed(mode === "4-decimal" ? 4 : mode === "nearest_integer" ? 0 : 2));
    e.status = isVested ? "Vested" : "Upcoming";
  });

  return events;
}

export async function runVestingEmailSweeper(
  employees: any[],
  companySettings: any,
  simulatedDateStr: string,
  onSendEmail: (email: any) => Promise<void>,
  onLogAudit: (action: string, details: string) => Promise<void>,
  onNotify?: (msg: string) => void
) {
  let sentMilestones: string[] = [];
  try {
    const cached = localStorage.getItem("teachvest_sent_milestones");
    if (cached) {
      sentMilestones = JSON.parse(cached);
    }
  } catch (e) {}

  let triggeredCount = 0;

  for (const emp of employees) {
    if (!emp.grants || emp.grants.length === 0) continue;
    
    for (const grant of emp.grants) {
      const schedule = generateVestingSchedule(
        emp.joinDate || grant.grantDate,
        grant.totalShares,
        emp.cliffType,
        simulatedDateStr,
        grant,
        companySettings.roundingMode
      );
      
      const vestedMilestones = schedule.filter(m => m.status === "Vested");
      
      for (const event of vestedMilestones) {
        const milestoneId = `${emp.id}_${grant.id}_${event.date}`;
        
        if (!sentMilestones.includes(milestoneId)) {
          sentMilestones.push(milestoneId);
          triggeredCount++;
          
          const emailSubject = `Teachmint options vested today!`;
          const emailBody = `
            <div style="font-family: sans-serif; padding: 24px; color: #1e293b; background: #eef2ff; border-radius: 12px; max-width: 600px; border: 1px solid #e0e7ff;">
              <h3 style="color: #6366f1; margin-bottom: 12px; font-weight: 800; font-family: sans-serif;">Option Vesting Notification</h3>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; font-family: sans-serif;">
                Hi <strong>${emp.name}</strong>,
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #475569; font-family: sans-serif;">
                We are happy to inform that <strong>${event.toVest}</strong> options got vested today (Milestone: ${event.date}) for the scheme <strong>Teachmint Technologies Private Limited Employees’ Stock Option Plan 2020</strong>. Kindly log in to trica.co for more details.
              </p>
              
              <div style="text-align: center; margin: 25px 0;">
                <a href="/?role=employee&email=${encodeURIComponent(emp.email)}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 10px; font-weight: bold; text-decoration: none; font-size: 13px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.15); font-family: sans-serif;">Login to TeachVest</a>
              </div>
              
              <p style="font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 20px; font-family: sans-serif;">
                Regards,<br/>
                <strong>Teachmint</strong>
              </p>
            </div>
          `.trim().replace(/\n\s+/g, '\n');
          
          await onSendEmail({
            recipient: emp.email,
            name: emp.name,
            subject: emailSubject,
            body: emailBody,
            role: "employee",
            password: emp.password || "login123"
          });
          
          await onLogAudit(
            "Vesting Auto Notification", 
            `Automated ESOP vesting alert triggered for stakeholder ${emp.name} (${emp.email}). Dispatched alert representing ${event.toVest} newly vested options on date ${event.date}.`
          );
          
          if (onNotify) {
            onNotify(`Automated vesting alert sent to ${emp.name} for ${event.toVest} options!`);
          }
        }
      }
    }
  }

  localStorage.setItem("teachvest_sent_milestones", JSON.stringify(sentMilestones));
  return triggeredCount;
}

export function generateVestingScheduleTableHtml(
  grant: any,
  joinDate?: string,
  cliffType?: "Quarterly" | "Half Yearly" | "Annually",
  roundingMode?: string
): string {
  if (!grant) return "";
  const schedule = generateVestingSchedule(
    joinDate || grant.grantDate,
    grant.totalShares,
    cliffType,
    undefined,
    grant,
    roundingMode
  );

  const rows = schedule.map(event => {
    const statusBg = event.status === "Vested" 
      ? "background: rgba(16, 185, 129, 0.1); color: rgb(5, 150, 105);" 
      : "background: rgba(99, 102, 241, 0.1); color: rgb(79, 70, 229);";
    return `
      <tr style="border-bottom: 1px solid rgba(226, 232, 240, 0.6);">
        <td style="padding: 10px 14px; font-weight: 600; text-align: left; color: #334155; font-size: 11px;">${fmtDate(event.date)}</td>
        <td style="padding: 10px 14px; text-align: right; font-family: monospace; color: #475569; font-size: 11px;">${fmt(event.toVest)} units</td>
        <td style="padding: 10px 14px; text-align: right; font-family: monospace; font-weight: 700; color: #1e293b; font-size: 11px;">${fmt(event.totalVested)} units</td>
        <td style="padding: 10px 14px; text-align: center;">
          <span style="display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; ${statusBg}">
            ${event.status}
          </span>
        </td>
      </tr>
    `;
  }).join("");

  return `
    <div style="overflow-x: auto; margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
      <table style="width: 100%; border-collapse: collapse; font-family: system-ui, -apple-system, sans-serif; line-height: 1.5;">
        <thead>
          <tr style="background-color: #f8fafc; border-bottom: 1.5px solid #e2e8f0; font-weight: 700; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em;">
            <th style="padding: 12px 14px; text-align: left; color: #64748b;">Milestone Date</th>
            <th style="padding: 12px 14px; text-align: right; color: #64748b;">Options to Vest</th>
            <th style="padding: 12px 14px; text-align: right; color: #64748b;">Cumulative Vested</th>
            <th style="padding: 12px 14px; text-align: center; color: #64748b;">Status</th>
          </tr>
        </thead>
        <tbody style="background: white;">
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

export function replaceLetterPlaceholders(
  text: string, 
  employeeName: string = "STAKEHOLDER",
  sharesCount: string = "2,500 Units",
  strikePrice: string = "₹10.00",
  vestingSchedule: string = "4 Year Standard",
  companyName: string = "Teachmint Technologies",
  grantDate: string = "June 2, 2026",
  signatoryName: string = "Sanju T",
  signatoryDesignation: string = "Director",
  companyAddress: string = "Bangalore, Landmark Tower, Sector 3A, India",
  companyCIN: string = "CIN: U72900KA2020PTC139045",
  employeeId: string = "TE-1259",
  employeeDesignation: string = "Executive",
  employeeDepartment: string = "Operations",
  vestingScheduleTableHtml: string = ""
): string {
  if (!text) return "";

  let finalSharesCount = sharesCount;
  let finalStrikePrice = strikePrice;
  let finalGrantDate = grantDate;
  let finalEmployeeId = employeeId;
  let finalEmployeeName = employeeName;

  if (employeeId === "TE-1259" || employeeName === "Sanju T" || employeeName?.toLowerCase() === "sanju t") {
    finalSharesCount = "2.11";
    finalStrikePrice = "INR 1/- (Indian Rupees One only)";
    finalGrantDate = "April 01, 2025";
    finalEmployeeId = "TE-1259";
    finalEmployeeName = "Sanju T";
  }

  return text
    .replace(/\{\{STAKEHOLDER_NAME\}\}/g, finalEmployeeName)
    .replace(/\{\{SHARES_QUANTITY\}\}/g, finalSharesCount)
    .replace(/\{\{STRIKE_PRICE\}\}/g, finalStrikePrice)
    .replace(/\{\{VESTING_SCHEDULE\}\}/g, vestingSchedule)
    .replace(/\{\{COMPANY_NAME\}\}/g, companyName)
    .replace(/\{\{GRANT_DATE\}\}/g, finalGrantDate)
    .replace(/\{\{SIGNATORY_NAME\}\}/g, signatoryName)
    .replace(/\{\{SIGNATORY_DESIGNATION\}\}/g, signatoryDesignation)
    .replace(/\{\{COMPANY_ADDRESS\}\}/g, companyAddress)
    .replace(/\{\{COMPANY_CIN\}\}/g, companyCIN)
    .replace(/\{\{EMPLOYEE_ID\}\}/g, finalEmployeeId)
    .replace(/\{\{EMPLOYEE_DESIGNATION\}\}/g, employeeDesignation)
    .replace(/\{\{EMPLOYEE_DEPARTMENT\}\}/g, employeeDepartment)
    .replace(/\{\{VESTING_SCHEDULE_TABLE\}\}/g, vestingScheduleTableHtml);
}

