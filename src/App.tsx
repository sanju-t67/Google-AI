/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { LoginPage } from "./components/LoginPage";
import { EmployeeDashboard } from "./components/EmployeeDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import { UserSession, Employee, Admin } from "./types";
import { Moon, Sun } from "lucide-react";
import { auth } from "./lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { MOCK_ADMINS, MOCK_EMPLOYEES } from "./constants";

function ThemeToggle({ isDark, toggle }: { isDark: boolean, toggle: () => void }) {
  return (
    <button 
      onClick={toggle}
      className="fixed bottom-6 right-6 z-[200] w-12 h-12 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all"
      title="Toggle Theme"
    >
      {isDark ? <Sun size={24} /> : <Moon size={24} />}
    </button>
  );
}

function AppContent() {
  const [session, setSession] = useState<UserSession>(null);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser?.email) {
        // Try to find in mocks to maintain state on refresh
        const admin = MOCK_ADMINS.find(a => a.email.toLowerCase() === firebaseUser.email?.toLowerCase());
        if (admin) {
          setSession({ user: admin, role: "admin" });
          return;
        }

        const emp = MOCK_EMPLOYEES.find(e => e.email.toLowerCase() === firebaseUser.email?.toLowerCase());
        if (emp) {
          setSession({ user: emp, role: "employee" });
          return;
        }
      }
      // If no firebase user or not in mocks, don't clear session if it was set via manual login
      // but if we want strictly firebase auth, we could clear it.
      // For now, let's allow manual login to persist in memory but Firebase only on refresh.
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = (user: Employee | Admin, role: "employee" | "admin") => {
    setSession({ user, role });
    if (role === "admin") {
      navigate("/admin");
    } else {
      navigate("/employee");
    }
  };

  const handleLogout = () => {
    auth.signOut();
    setSession(null);
    navigate("/");
  };

  // Basic route guard
  useEffect(() => {
    const isRoot = location.pathname === "/" || location.pathname === "";
    if (!session && !isRoot) {
      navigate("/");
    }
  }, [session, location.pathname, navigate]);

  return (
    <>
      <ThemeToggle isDark={isDarkMode} toggle={toggleTheme} />
      <Routes>
        <Route path="/" element={<LoginPage onLogin={handleLogin} />} />
        <Route 
          path="/employee" 
          element={
            session?.role === "employee" 
              ? <EmployeeDashboard user={session.user as Employee} onLogout={handleLogout} /> 
              : <Navigate to="/" />
          } 
        />
        <Route 
          path="/admin" 
          element={
            session?.role === "admin" 
              ? <AdminDashboard user={session.user as Admin} onLogout={handleLogout} /> 
              : <Navigate to="/" />
          } 
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}
