/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Grant {
  id: string;
  grantDate: string;
  totalShares: number;
  vestedShares: number;
  exercisedShares: number;
  strikePrice: number;
  currentFMV: number;
  vestingSchedule: string;
  status: "Active" | "Fully Vested" | "Expired";
  cliffMonths?: number;

  // Pausing & Timeline Shift
  isPaused?: boolean;
  pauseStartDate?: string;
  pauseEndDate?: string;
  resumeOption?: "old_dates" | "new_dates";
  resumeStartDate?: string;

  // Option Rounding Override
  roundingMode?: "2-decimal" | "4-decimal" | "nearest_integer" | "none";

  // Custom Vesting Milestones from Bulk Upload (e.g. 13-vestings schedule)
  customVestingEvents?: { date: string; shares: number }[];

  // Signature Workflow
  workflowStatus?: "Draft" | "Pending Admin Review" | "Pending Signatory Signature" | "Pending Employee Signature" | "Fully Signed";
  reviewerAdminEmail?: string;
  isSignedBySignatory?: boolean;
  isSignedByEmployee?: boolean;
  signedLetterUrl?: string;
  signatoryEsignDate?: string;
  employeeEsignDate?: string;
}

export interface Transaction {
  date: string;
  type: "Exercise" | "Vesting" | "Grant";
  shares: number;
  price: number | null;
  fmv: number;
  gain: number | null;
}

export interface Employee {
  id: string;
  email: string;
  mobile: string;
  password?: string;
  name: string;
  department: string;
  designation: string;
  joinDate: string;
  grantDate: string;
  grants: Grant[];
  transactions: Transaction[];
  disabled?: boolean;
  cliffType?: "Quarterly" | "Half Yearly" | "Annually";
  nomineeName?: string;
  nomineeRelation?: string;
  nomineeContact?: string;
  grantLetterNumber?: string;
  customFields?: { key: string; value: string }[];
  documents?: { id: string; name: string; url: string; uploadDate: string }[];
}

export interface Admin {
  email: string;
  password?: string;
  name: string;
  role: "admin";
}

export interface AuditLog {
  id: string;
  timestamp: string;
  adminEmail: string;
  action: string;
  details: string;
}

export type UserSession = {
  user: Employee | Admin;
  role: "employee" | "admin";
} | null;
