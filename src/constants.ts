/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Admin, Employee } from "./types";

// SECURE STORAGE - All default user profiles have SHA-256 pre-hashed passwords
export const MOCK_ADMINS: Admin[] = [
  { email: "ashutosh@example.com", password: "a9b40db7376a267e5bbdfbf35520edfb92348ff98e16f3fdbe426be0bc6603de", name: "Ashutosh U", role: "admin" }, // ashu123
  { email: "hr@example.com", password: "9633e6f9fd7af6ca131f42b3648fcca776829774620f340469b61884fe08f62c", name: "HR Manager", role: "admin" }, // hr123
  { email: "sanju.ts@teachmint.com", password: "24075304bc018041ef603a11fe358a9de9b97775a2f58e46123e44026601428f", name: "Sanju T", role: "admin" }, // admin123
  { email: "sanju@sanju-t.com", password: "24075304bc018041ef603a11fe358a9de9b97775a2f58e46123e44026601428f", name: "Sanju T (Admin)", role: "admin" }, // admin123
  { email: "preeta@example.com", password: "24075304bc018041ef603a11fe358a9de9b97775a2f58e46123e44026601428f", name: "Preeta S", role: "admin" }, // admin123
];

export const MOCK_EMPLOYEES: Employee[] = [
  {
    id: "EMP001",
    email: "ashutosh@example.com",
    mobile: "9999900001",
    password: "bcbc15cb82e66691456b3d4f1074e0d4e9da7c9360ccf7a77b8e1f08bc79e658", // emp123
    name: "Ashutosh U",
    department: "CEO's Office",
    designation: "Senior Director",
    joinDate: "2020-09-15",
    grantDate: "2020-09-15",
    grants: [
      {
        id: "GR001",
        grantDate: "2020-09-15",
        totalShares: 2000,
        vestedShares: 2000,
        exercisedShares: 500,
        strikePrice: 85,
        currentFMV: 210,
        vestingSchedule: "4yr/1yr cliff (Quarterly)",
        status: "Active",
      },
      {
        id: "GR002",
        grantDate: "2022-01-01",
        totalShares: 1000,
        vestedShares: 1000,
        exercisedShares: 0,
        strikePrice: 120,
        currentFMV: 210,
        vestingSchedule: "4yr/1yr cliff (Quarterly)",
        status: "Active",
      },
    ],
    transactions: [
      { date: "2022-10-05", type: "Exercise", shares: 500, price: 85, fmv: 150, gain: 325 },
      { date: "2023-04-12", type: "Vesting", shares: 250, price: null, fmv: 170, gain: null },
    ],
  },
  {
    id: "EMP002",
    email: "neeraj@example.com",
    mobile: "9999900002",
    password: "bcbc15cb82e66691456b3d4f1074e0d4e9da7c9360ccf7a77b8e1f08bc79e658", // emp123
    name: "Neeraj K",
    department: "Commercial",
    designation: "Assistant Manager",
    joinDate: "2021-06-01",
    grantDate: "2021-12-01",
    grants: [
      {
        id: "GR003",
        grantDate: "2021-12-01",
        totalShares: 1500,
        vestedShares: 1500,
        exercisedShares: 0,
        strikePrice: 100,
        currentFMV: 210,
        vestingSchedule: "4yr/1yr cliff (Quarterly)",
        status: "Active",
      },
    ],
    transactions: [
      { date: "2022-12-01", type: "Vesting", shares: 375, price: null, fmv: 155, gain: null },
    ],
  },
  {
    id: "EMP003",
    email: "vinay@example.com",
    mobile: "9999900003",
    password: "bcbc15cb82e66691456b3d4f1074e0d4e9da7c9360ccf7a77b8e1f08bc79e658", // emp123
    name: "Vinay B",
    department: "Commercial",
    designation: "Senior Associate",
    joinDate: "2019-11-20",
    grantDate: "2020-05-20",
    grants: [
      {
        id: "GR004",
        grantDate: "2020-05-20",
        totalShares: 3000,
        vestedShares: 3000,
        exercisedShares: 1500,
        strikePrice: 70,
        currentFMV: 210,
        vestingSchedule: "4yr/1yr cliff (Quarterly)",
        status: "Fully Vested",
      },
    ],
    transactions: [
      { date: "2021-06-01", type: "Exercise", shares: 750, price: 70, fmv: 120, gain: 37500 },
      { date: "2022-09-14", type: "Exercise", shares: 750, price: 70, fmv: 175, gain: 78750 },
    ],
  },
  {
    id: "EMP004",
    email: "chinnappa@example.com",
    mobile: "9999900004",
    password: "bcbc15cb82e66691456b3d4f1074e0d4e9da7c9360ccf7a77b8e1f08bc79e658", // emp123
    name: "Chinnappa C",
    department: "Finance",
    designation: "Manager",
    joinDate: "2022-02-14",
    grantDate: "2022-08-14",
    grants: [
      {
        id: "GR005",
        grantDate: "2022-08-14",
        totalShares: 2500,
        vestedShares: 1250,
        exercisedShares: 0,
        strikePrice: 140,
        currentFMV: 210,
        vestingSchedule: "4yr/1yr cliff (Quarterly)",
        status: "Active",
      },
    ],
    transactions: [],
  },
  {
    id: "TE-1259",
    email: "sanju.ts@teachmint.com",
    mobile: "9999900005",
    password: "86af0119b48f68341e8c0fa3e56a73c2419f864e43fec147dfb212f067bc6403", // emp1234
    name: "Sanju T (Employee)",
    department: "Business Finance",
    designation: "Manager",
    joinDate: "2025-04-01",
    grantDate: "2025-04-01",
    cliffType: "Annually",
    grants: [
      {
        id: "GR-TM-2025-1259",
        grantDate: "2025-04-01",
        totalShares: 2.11,
        vestedShares: 1.05,
        exercisedShares: 0,
        strikePrice: 1,
        currentFMV: 210,
        vestingSchedule: "4yr/1yr cliff (Quarterly)",
        status: "Active",
      },
    ],
    transactions: [],
  },
  {
    id: "TE-1260",
    email: "sanju@sanju-t.com",
    mobile: "9999900006",
    password: "86af0119b48f68341e8c0fa3e56a73c2419f864e43fec147dfb212f067bc6403", // emp1234
    name: "Sanju T",
    department: "Business Finance",
    designation: "Manager",
    joinDate: "2025-04-01",
    grantDate: "2025-04-01",
    cliffType: "Annually",
    grants: [
      {
        id: "GR-TM-2025-1260",
        grantDate: "2025-04-01",
        totalShares: 2.11,
        vestedShares: 1.05,
        exercisedShares: 0,
        strikePrice: 1,
        currentFMV: 210,
        vestingSchedule: "4yr/1yr cliff (Quarterly)",
        status: "Active",
      },
    ],
    transactions: [],
  },
  {
    id: "EMP006",
    email: "preeta@example.com",
    mobile: "9999900007",
    password: "a28be1b4be8723730303fed4f0945952f4b46bda7d353995874415cfbbdc14ff", // emp065
    name: "Preeta S",
    department: "Human Resources",
    designation: "Associate Vice President - Human Resources & CISO",
    joinDate: "2024-05-17",
    grantDate: "2024-05-17",
    grants: [
      {
        id: "GR-TM-2024-002",
        grantDate: "2024-05-17",
        totalShares: 0.64,
        vestedShares: 0.32,
        exercisedShares: 0,
        strikePrice: 1,
        currentFMV: 210,
        vestingSchedule: "4yr/1yr cliff (Quarterly)",
        status: "Active",
      },
    ],
    transactions: [],
  },
];
