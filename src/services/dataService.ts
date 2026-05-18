/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  doc, 
  onSnapshot, 
  updateDoc, 
  setDoc, 
  getDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Employee, Grant, Transaction, Admin } from '../types';

export interface CompanySettings {
  currentFMV: number;
  totalPool: number;
  lastUpdated: string;
}

// Helper to handle Firestore errors in a unified way (as per instructions)
const handleFirestoreError = (error: any, operation: string, path: string | null) => {
  const errorInfo = {
    error: error.message || String(error),
    operationType: operation,
    path,
    authInfo: {} // Real auth info would be populated here if needed
  };
  console.error(`Firestore Error: ${operation} at ${path}`, errorInfo);
  throw new Error(JSON.stringify(errorInfo));
};

export const subscribeToCompanySettings = (callback: (settings: CompanySettings) => void) => {
  const path = 'settings/company';
  return onSnapshot(doc(db, path), (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as CompanySettings);
    }
  }, (error) => handleFirestoreError(error, 'get', path));
};

export const updateCompanySettings = async (settings: Partial<CompanySettings>) => {
  const path = 'settings/company';
  try {
    const docRef = doc(db, path);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      await setDoc(docRef, { ...settings, lastUpdated: new Date().toISOString() });
    } else {
      await updateDoc(docRef, { ...settings, lastUpdated: new Date().toISOString() });
    }
  } catch (error) {
    handleFirestoreError(error, 'write', path);
  }
};

export const subscribeToEmployees = (callback: (employees: Employee[]) => void) => {
  const path = 'employees';
  return onSnapshot(collection(db, path), (snapshot) => {
    const employees = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Employee));
    callback(employees);
  }, (error) => handleFirestoreError(error, 'list', path));
};

export const subscribeToEmployee = (employeeId: string, callback: (employee: Employee | null) => void) => {
  const path = `employees/${employeeId}`;
  return onSnapshot(doc(db, path), (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() } as Employee);
    } else {
      callback(null);
    }
  }, (error) => handleFirestoreError(error, 'get', path));
};

export const updateEmployeeData = async (employeeId: string, data: Partial<Employee>) => {
  const path = `employees/${employeeId}`;
  try {
    await updateDoc(doc(db, path), data);
  } catch (error) {
    handleFirestoreError(error, 'write', path);
  }
};

export const createEmployee = async (employee: Employee) => {
  const path = `employees/${employee.id}`;
  try {
    await setDoc(doc(db, path), employee);
  } catch (error) {
    handleFirestoreError(error, 'write', path);
  }
};

export const createAdmin = async (admin: Admin, adminId?: string) => {
  const path = adminId ? `admins/${adminId}` : `admins/${admin.email}`;
  try {
    await setDoc(doc(db, path), admin);
  } catch (error) {
    handleFirestoreError(error, 'write', path);
  }
};

export const getEmployeeByEmail = async (email: string): Promise<Employee | null> => {
  const path = 'employees';
  try {
    const q = query(collection(db, path), where("email", "==", email));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Employee;
  } catch (error: any) {
    // If we're not logged in, this will fail. We treat it as "not found" in the DB.
    console.warn(`Firestore lookup failed for ${email} (expected if not logged in)`, error.message);
    return null;
  }
};

export const getAdminByEmail = async (email: string): Promise<Admin | null> => {
  const path = 'admins';
  try {
    const q = query(collection(db, path), where("email", "==", email));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as Admin;
  } catch (error: any) {
    // If we're not logged in, this will fail. We treat it as "not found" in the DB.
    console.warn(`Firestore lookup failed for ${email} (expected if not logged in)`, error.message);
    return null;
  }
};
