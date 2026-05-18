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

export function calculateLiveVested(grant: Grant): number {
  const start = new Date(grant.grantDate);
  const now = new Date();
  const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  
  if (diffMonths <= 0) return 0;

  const isQuarterly = grant.vestingSchedule.toLowerCase().includes("quarterly");
  const hasCliff = grant.vestingSchedule.toLowerCase().includes("cliff");

  // Handle Cliff (usually 1 year)
  if (hasCliff && diffMonths < 12) {
    return 0;
  }

  // Common pattern: 4 years (48 months or 16 quarters)
  const isFourYear = grant.vestingSchedule.toLowerCase().includes("4yr") || 
                     grant.vestingSchedule.toLowerCase().includes("4 year") ||
                     grant.vestingSchedule.toLowerCase().includes("4year");

  if (isFourYear) {
    if (isQuarterly) {
      const quarters = Math.floor(diffMonths / 3);
      // Even if it's 16 quarters, we cap it
      const quarterlyRate = grant.totalShares / 16;
      return Math.min(grant.totalShares, Math.floor(quarters * quarterlyRate));
    } else {
      const monthlyRate = grant.totalShares / 48;
      return Math.min(grant.totalShares, Math.floor(diffMonths * monthlyRate));
    }
  }
  
  if (isQuarterly) {
    const quarters = Math.floor(diffMonths / 3);
    const quarterlyRate = grant.totalShares / 16; // Default to 4 years if unspecified
    return Math.min(grant.totalShares, Math.floor(quarters * quarterlyRate));
  }

  return grant.vestedShares; // Default to manual if unrecognized
}

export function calcPortfolioValue(grants: Grant[], fmvOverride?: number) {
  return grants.reduce((sum, g) => {
    const vested = calculateLiveVested(g);
    const fmv = fmvOverride ?? g.currentFMV;
    return sum + (vested - g.exercisedShares) * fmv;
  }, 0);
}

export function calcPotentialGain(grants: Grant[], fmvOverride?: number) {
  return grants.reduce((sum, g) => {
    const vested = calculateLiveVested(g);
    const fmv = fmvOverride ?? g.currentFMV;
    return sum + (vested - g.exercisedShares) * (fmv - g.strikePrice);
  }, 0);
}

export function calcTotalVested(grants: Grant[]) {
  return grants.reduce((sum, g) => sum + calculateLiveVested(g), 0);
}

export function calcTotalGranted(grants: Grant[]) {
  return grants.reduce((sum, g) => sum + g.totalShares, 0);
}
