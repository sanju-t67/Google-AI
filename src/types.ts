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
}

export interface Admin {
  email: string;
  password?: string;
  name: string;
  role: "admin";
}

export type UserSession = {
  user: Employee | Admin;
  role: "employee" | "admin";
} | null;
