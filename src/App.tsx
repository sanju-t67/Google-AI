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
import { AnimatePresence, motion } from "motion/react";

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
    let unsubscribe: (() => void) | undefined;
    
    const initAndSubscribeObj = async () => {
      try {
        const { initializeAndSeedDatabase } = await import("./services/dataService");
        await initializeAndSeedDatabase();
      } catch (e) {
        console.error("Failed to seed database on startup:", e);
      }

      // Pre-load session from local storage for instant access
      try {
        const cached = localStorage.getItem("user_session");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.user && parsed.role) {
            setSession(parsed);
          }
        }
      } catch (err) {
        console.error("Local session recovery failed:", err);
      }

      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser?.email) {
          const email = firebaseUser.email;
          const { getAdminByEmail, getEmployeeByEmail } = await import("./services/dataService");
          
          try {
            const adminObj = await getAdminByEmail(email);
            if (adminObj) {
              const sess = { user: adminObj, role: "admin" as const };
              setSession(sess);
              localStorage.setItem("user_session", JSON.stringify(sess));
              return;
            }
          } catch (e) {
            console.error("Failed to query DB for admin session restore:", e);
          }

          try {
            const empObj = await getEmployeeByEmail(email);
            if (empObj) {
              const sess = { user: empObj, role: "employee" as const };
              setSession(sess);
              localStorage.setItem("user_session", JSON.stringify(sess));
              return;
            }
          } catch (e) {
            console.error("Failed to query DB for employee session restore:", e);
          }
        }
      });
    };

    initAndSubscribeObj();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleLogin = (user: Employee | Admin, role: "employee" | "admin") => {
    const sess = { user, role };
    setSession(sess);
    localStorage.setItem("user_session", JSON.stringify(sess));
    if (role === "admin") {
      navigate("/admin");
    } else {
      navigate("/employee");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user_session");
    auth.signOut().catch(() => {});
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
      <AnimatePresence mode="wait">
        <motion.div 
          key={location.pathname}
          initial="initial"
          animate="animate"
          exit="exit"
          className="contents"
        >
          <Routes location={location}>
            <Route path="/" element={
              <motion.div 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <LoginPage onLogin={handleLogin} />
              </motion.div>
            } />
          <Route 
            path="/employee" 
            element={
              session?.role === "employee" 
                ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <EmployeeDashboard user={session.user as Employee} onLogout={handleLogout} />
                  </motion.div>
                )
                : <Navigate to="/" />
            } 
          />
          <Route 
            path="/admin" 
            element={
              session?.role === "admin" 
                ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ duration: 0.4 }}
                  >
                    <AdminDashboard user={session.user as Admin} onLogout={handleLogout} />
                  </motion.div>
                )
                : <Navigate to="/" />
            } 
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
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
