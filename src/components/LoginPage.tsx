/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Eye, EyeOff, User, ArrowRight, Loader2, AlertCircle, LogIn } from 'lucide-react';
import { Admin, Employee } from '../types';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signInAnonymously } from 'firebase/auth';
import { getAdminByEmail, getEmployeeByEmail } from '../services/dataService';

const logoUrl = "https://lh3.googleusercontent.com/d/1Lj5Gm67qUfIYizVoGVdPsXwC6yt-WxgB";
const otherLogoUrl = "https://lh3.googleusercontent.com/d/1FeJm6poQPXmoYKLJd94gGnqdJmkwhiHL";

interface LoginPageProps {
  onLogin: (user: Employee | Admin, role: "employee" | "admin") => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [tab, setTab] = useState<"employee" | "admin">("employee");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      if (tab === "admin") {
        const admin = await getAdminByEmail(identifier);
        
        if (admin && (admin.password === password || !admin.password)) {
          // Sign in anonymously to satisfy Firestore rules for demo
          try {
            await signInAnonymously(auth);
          } catch (e) {
            console.warn("Failed to sign in anonymously (expected if disabled on console):", e);
          }
          onLogin(admin, "admin");
        } else {
          setError("Invalid admin credentials.");
        }
      } else {
        const emp = await getEmployeeByEmail(identifier);
        
        if (emp && (emp.password === password || !emp.password)) {
          if (emp.disabled) {
            setError("Your access has been disabled by the administrator.");
            setLoading(false);
            return;
          }
          // Sign in anonymously to satisfy Firestore rules for demo
          try {
            await signInAnonymously(auth);
          } catch (e) {
            console.warn("Failed to sign in anonymously (expected if disabled on console):", e);
          }
          onLogin(emp, "employee");
        } else {
          setError("Invalid email/mobile or password.");
        }
      }
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user.email;
      
      if (!email) {
        throw new Error("No email returned from Google");
      }

      // Check Firestore FIRST
      const admin = await getAdminByEmail(email);
      if (admin) {
        onLogin(admin, "admin");
        return;
      }

      const emp = await getEmployeeByEmail(email);
      if (emp) {
        if (emp.disabled) {
          setError("Your access has been disabled by the administrator.");
          return;
        }
        onLogin(emp, "employee");
        return;
      }

      setError(`No account found for ${email}. Please contact HR.`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to sign in with Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-6 relative transition-colors duration-300">
      {/* Soft decorative elements */}
      <div className="absolute top-20 right-[15%] w-64 h-64 bg-brand-primary/5 rounded-full blur-3xl dark:bg-brand-primary/10" />
      <div className="absolute bottom-20 left-[15%] w-80 h-80 bg-brand-accent/10 rounded-full blur-3xl" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[480px] relative z-10"
      >
        <div className="bg-bg-surface rounded-3xl p-10 shadow-[0_20px_50px_rgba(0,82,255,0.08)] border border-slate-100 dark:border-slate-800 transition-all">
          <div className="text-center mb-10">
            <div className="flex justify-center mb-6">
               <motion.div 
                 whileHover={{ scale: 1.05, rotate: 2 }}
                 className="w-24 h-24 rounded-[28px] overflow-hidden shadow-[0_20px_40px_rgba(0,82,255,0.2)] bg-white p-1"
               >
                 <img 
                   src={logoUrl} 
                   alt="TeachVest Logo" 
                   className="w-full h-full object-contain rounded-[24px]"
                   referrerPolicy="no-referrer"
                 />
               </motion.div>
            </div>
            <div className="flex justify-center mb-2">
              <img 
                src={otherLogoUrl} 
                alt="TeachVest" 
                className="h-12 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          <div className="flex bg-slate-100/50 dark:bg-slate-800/50 p-1.5 rounded-[22px] mb-8 backdrop-blur-xl border border-slate-200/20 shadow-inner">
            <button 
              onClick={() => { setTab("employee"); setError(""); }}
              className={`flex-1 py-3.5 px-4 rounded-[18px] text-sm font-extrabold transition-all duration-300 ${
                tab === "employee" 
                ? "bg-white dark:bg-slate-700 text-brand-primary shadow-[0_4px_12px_rgba(0,0,0,0.08)] ring-1 ring-black/5" 
                : "text-text-muted hover:text-text-main"
              }`}
            >
              Employee
            </button>
            <button 
              onClick={() => { setTab("admin"); setError(""); }}
              className={`flex-1 py-3.5 px-4 rounded-[18px] text-sm font-extrabold transition-all duration-300 ${
                tab === "admin" 
                ? "bg-white dark:bg-slate-700 text-brand-primary shadow-[0_4px_12px_rgba(0,0,0,0.08)] ring-1 ring-black/5" 
                : "text-text-muted hover:text-text-main"
              }`}
            >
              Admin
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-widest ml-1">
                {tab === "admin" ? "Admin Email" : "Email or Mobile"}
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors">
                  <User size={20} />
                </div>
                <input 
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={tab === "admin" ? "admin@teachmint.com" : "Email / mobile number"}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-bg-base border border-slate-100 dark:border-slate-800 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 outline-none transition-all placeholder:text-slate-400 text-text-main"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-widest ml-1">Password</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors">
                  <Shield size={20} />
                </div>
                <input 
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-4 rounded-2xl bg-bg-base border border-slate-100 dark:border-slate-800 focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 outline-none transition-all placeholder:text-slate-400 text-text-main"
                />
                <button 
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-text-main transition-colors"
                >
                  {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-2xl text-sm font-medium border border-red-100 dark:border-red-900/50 flex items-center gap-2"
                >
                  <AlertCircle size={18} className="shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-brand-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-brand-primary/25 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:scale-100"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Authenticating...
                </>
              ) : (
                <>
                  Login
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative mb-8 text-center">
               <span className="bg-bg-surface px-4 text-[10px] text-text-muted font-extrabold tracking-[0.2em] relative z-10 uppercase">Enterprise SSO</span>
               <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100 dark:border-slate-800"></div></div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-text-main py-5 rounded-[24px] font-extrabold flex items-center justify-center gap-4 transition-all hover:border-brand-primary/30 hover:shadow-lg active:scale-[0.98] disabled:opacity-70"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              Continue with Google
            </button>
          </div>
        </div>
        <p className="mt-10 text-center text-sm font-bold text-text-muted">
          Secure infrastructure for <span className="text-brand-primary cursor-pointer hover:underline">ESOP Management</span>
        </p>
      </motion.div>
    </div>
  );
};
