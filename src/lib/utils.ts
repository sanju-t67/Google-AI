/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Grant } from "../types";

export const fmt = (n: number | undefined) => n?.toLocaleString("en-IN") ?? "-";

export const fmtCurrency = (n: number | null | undefined) => 
  n != null ? `₹${n.toLocaleString("en-IN")}` : "-";

export const fmtDate = (d: string | undefined) => 
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";

export const pct = (a: number, b: number) => b ? Math.round((a / b) * 100) : 0;

export function calculateLiveVested(grant: Grant, joinDate?: string, cliffType?: "Quarterly" | "Half Yearly" | "Annually"): number {
  const schedule = generateVestingSchedule(joinDate || grant.grantDate, grant.totalShares, cliffType);
  const vestedMilestones = schedule.filter(m => m.status === "Vested");
  if (vestedMilestones.length === 0) return 0;
  return vestedMilestones[vestedMilestones.length - 1].totalVested;
}

export function calcPortfolioValue(grants: Grant[], fmvOverride?: number, joinDate?: string, cliffType?: "Quarterly" | "Half Yearly" | "Annually") {
  return grants.reduce((sum, g) => {
    const vested = calculateLiveVested(g, joinDate, cliffType);
    const fmv = fmvOverride ?? g.currentFMV;
    return sum + (vested - g.exercisedShares) * fmv;
  }, 0);
}

export function calcPotentialGain(grants: Grant[], fmvOverride?: number, joinDate?: string, cliffType?: "Quarterly" | "Half Yearly" | "Annually") {
  return grants.reduce((sum, g) => {
    const vested = calculateLiveVested(g, joinDate, cliffType);
    const fmv = fmvOverride ?? g.currentFMV;
    return sum + (vested - g.exercisedShares) * (fmv - g.strikePrice);
  }, 0);
}

export function calcTotalVested(grants: Grant[], joinDate?: string, cliffType?: "Quarterly" | "Half Yearly" | "Annually") {
  return grants.reduce((sum, g) => sum + calculateLiveVested(g, joinDate, cliffType), 0);
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
  currentDateStr?: string
): VestingEvent[] {
  const start = new Date(joinDate || new Date().toISOString());
  const events: VestingEvent[] = [];
  const now = currentDateStr ? new Date(currentDateStr) : new Date();

  // Define cliff duration in months
  let cliffMonths = 12; // default Annually
  if (cliffType === "Quarterly") {
    cliffMonths = 3;
  } else if (cliffType === "Half Yearly") {
    cliffMonths = 6;
  }

  // standard ESOP 4 year plan = 16 quarters (each quarter = 3 months)
  let cumulative = 0;
  const quarterlyShare = totalShares / 16;

  for (let q = 1; q <= 16; q++) {
    const monthsAfterStart = q * 3;
    const eventDate = new Date(start);
    eventDate.setMonth(start.getMonth() + monthsAfterStart);
    
    const dateStr = eventDate.toISOString().split('T')[0];

    let toVest = quarterlyShare;
    // Before cliff, accumulate shares and vest on the cliff date!
    if (monthsAfterStart < cliffMonths) {
      continue;
    }

    if (monthsAfterStart === cliffMonths) {
      const accumulatedQuarters = cliffMonths / 3;
      toVest = quarterlyShare * accumulatedQuarters;
    }

    cumulative += toVest;
    const isVested = eventDate <= now;

    events.push({
      date: dateStr,
      toVest: parseFloat(toVest.toFixed(2)),
      totalVested: parseFloat(Math.min(totalShares, cumulative).toFixed(2)),
      status: isVested ? "Vested" : "Upcoming"
    });
  }

  return events;
}
