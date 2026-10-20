import React, { useState } from 'react';
import { User } from '../../types';
import { Eye, EyeOff, Lock, Mail, Shield, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { SplashScreen } from '../common/SplashScreen';
import { BrandMark } from '../common/BrandMark';

interface LoginPageProps {
  onLogin: (user: User) => void;
  availableUsers: User[];
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, availableUsers }) => {
  const [showIntro, setShowIntro] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both your registered staff email and password.');
      return;
    }

    const matchedUser = availableUsers.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );

    if (!matchedUser) {
      setErrorMessage(
        'Staff account not recognized. Only authorized Feyamet administrators can create staff accounts.'
      );
      return;
    }

    if (!matchedUser.isActive) {
      setErrorMessage('This staff account has been deactivated. Please contact your manager or administrator.');
      return;
    }

    onLogin(matchedUser);
  };

  const handleQuickSelect = (user: User) => {
    setEmail(user.email);
    setPassword('••••••••');
    onLogin(user);
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotSuccess(true);
    setTimeout(() => {
      setShowForgotPassword(false);
      setForgotSuccess(false);
      setForgotEmail('');
    }, 2500);
  };

  return (
    <>
      {showIntro && (
        <SplashScreen onFinish={() => setShowIntro(false)} />
      )}

      <div className="min-h-screen bg-[#FFF9F2] flex flex-col justify-center items-center p-4 sm:p-6 font-sans relative">
        <div className="w-full max-w-md">
          {/* Brand Header */}
          <div className="text-center mb-6">
            <div className="inline-flex mb-3">
              <BrandMark className="w-16 h-16 rounded-2xl shadow-md ring-4 ring-sand" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-ink">
              FEYAMET AUTO GARAGE
            </h1>
            
            {/* The requested motto: "Be with us, save your time" */}
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-coral/10 border border-coral/30 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#800020] animate-pulse"></span>
              <span className="text-xs font-bold text-[#800020] uppercase tracking-wide italic">
                &ldquo;Be with us, save your time&rdquo;
              </span>
            </div>

            <p className="text-xs text-ink-muted mt-2">
              Workshop Management, Recorder Intake & SMS Dispatch
            </p>
          </div>


        {/* Login Box */}
        <div className="bg-white rounded-2xl border border-line/80 shadow-xs p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-ink">Staff Portal Login</h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Enter your authorized garage credentials to access your dashboard
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-coral/10 border border-coral/30 flex items-start gap-2.5 text-xs text-brand">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-coral" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">
                Staff Email or Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-muted/70">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@feyamet.com"
                  className="w-full pl-10 pr-3 py-2.5 text-sm bg-sand/40 border border-line rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-transparent transition"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-ink">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs font-medium text-[#800020] hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-ink-muted/70">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-sm bg-sand/40 border border-line rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-transparent transition"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink-muted/70 hover:text-ink-muted cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 px-4 bg-[#800020] hover:bg-[#600018] text-white font-semibold text-sm rounded-xl transition duration-150 flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <span>Sign In to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Staff Role Launcher for Authorized Portal Users */}
          <div className="mt-8 pt-6 border-t border-line">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-semibold text-ink-muted/70 uppercase tracking-wider">
                Select Authorized Staff Role
              </span>
              <span className="text-[10px] text-ink-muted/70">One-tap sign-in</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {availableUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleQuickSelect(u)}
                  className="p-2.5 text-left rounded-lg border border-line bg-sand/40 hover:bg-white hover:border-[#800020] transition-colors cursor-pointer group"
                >
                  <p className="text-xs font-bold text-ink group-hover:text-[#800020]">
                    {u.role === 'reception' ? 'RECORDER' : u.role.toUpperCase()}
                  </p>
                  <p className="text-[11px] text-ink-muted truncate">{u.name}</p>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-ink-muted/70 text-center mt-3">
              Note: Mechanics receive repair tasks directly on their mobile phones via SMS.
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="text-center mt-6">
          <p className="text-xs text-ink-muted/70 flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-ink-muted" />
            <span>Feyamet Garage Internal Network · Restricted Staff Access</span>
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-ink/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-line">
            <h3 className="text-base font-bold text-ink mb-1">Reset Password</h3>
            <p className="text-xs text-ink-muted mb-4">
              Enter your registered garage email. Your workshop administrator will verify and reset your access pin.
            </p>

            {forgotSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-800 space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                <p className="font-semibold">Reset Request Dispatched</p>
                <p>System Administrator has received your reset ticket.</p>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="your.name@feyamet.com"
                  className="w-full px-3 py-2 text-xs border border-line rounded-lg focus:outline-none focus:ring-1 focus:ring-[#800020]"
                  required
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(false)}
                    className="px-3 py-2 text-xs text-ink-muted hover:bg-sand/50 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#800020] hover:bg-[#600018] rounded-lg cursor-pointer"
                  >
                    Send Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  );
};
