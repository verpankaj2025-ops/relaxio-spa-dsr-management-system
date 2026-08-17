import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Sparkles, Lock, Mail, Eye, EyeOff, ShieldCheck, AlertCircle, KeyRound, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Forgot Password Modal
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim()) {
      setErrorMsg('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await login({ email: email.trim(), password });
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickCredentials = (role: 'SUPER_ADMIN' | 'ADMIN') => {
    if (role === 'SUPER_ADMIN') {
      setEmail('admin@thecloudspa.in');
      setPassword('admin123');
    } else {
      setEmail('manager@thecloudspa.in');
      setPassword('manager123');
    }
    setErrorMsg('');
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    setForgotMsg('');
    setTimeout(() => {
      setForgotMsg('Password reset request logged. Please contact Super Admin to reset password.');
      setForgotLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen w-full bg-stone-950 text-stone-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-stone-900 border border-stone-800 rounded-3xl p-8 shadow-2xl relative z-10">
        {/* Header Logo */}
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex p-3 bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-300 rounded-2xl shadow-xl shadow-amber-900/30">
            <div className="w-10 h-10 bg-stone-950 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold font-serif tracking-wider text-stone-100">
              THE CLOUD <span className="text-amber-400 font-sans font-light text-base">SPA</span>
            </h1>
            <p className="text-xs text-stone-400 uppercase tracking-widest mt-1 font-mono">
              Daily Sales Report (DSR) System
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="mb-6 bg-stone-950/70 p-3 rounded-2xl border border-stone-800 text-xs">
          <div className="text-[10px] font-mono text-stone-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Staff Quick Login Presets:</span>
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillQuickCredentials('SUPER_ADMIN')}
              className="py-1.5 px-2 bg-stone-900 hover:bg-amber-500/15 border border-stone-700 hover:border-amber-500/40 rounded-xl text-stone-200 text-[11px] font-medium transition cursor-pointer text-center"
            >
              Super Admin
            </button>
            <button
              type="button"
              onClick={() => fillQuickCredentials('ADMIN')}
              className="py-1.5 px-2 bg-stone-900 hover:bg-amber-500/15 border border-stone-700 hover:border-amber-500/40 rounded-xl text-stone-200 text-[11px] font-medium transition cursor-pointer text-center"
            >
              Spa Manager
            </button>
          </div>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs text-stone-400 mb-1 font-medium">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                placeholder="admin@thecloudspa.in"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-stone-100 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs text-stone-400 font-medium">Password</label>
              <button
                type="button"
                onClick={() => setForgotModalOpen(true)}
                className="text-[11px] text-amber-400 hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl pl-10 pr-10 py-2.5 text-xs text-stone-100 focus:outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 p-1 text-stone-500 hover:text-stone-300 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs py-3 rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <KeyRound className="w-4 h-4" />
            <span>{loading ? 'Authenticating...' : 'Sign In to The Cloud Spa'}</span>
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-stone-800/80 text-center text-[11px] text-stone-500">
          Internal Restricted System &bull; Authorized Personnel Only
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-xs">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-sm p-6 text-stone-100 shadow-2xl">
            <h3 className="text-base font-bold font-serif mb-2">Reset Account Password</h3>
            <p className="text-xs text-stone-400 mb-4">
              Enter your registered email address. Instructions will be routed to Super Admin.
            </p>

            {forgotMsg ? (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{forgotMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-stone-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    placeholder="registered@thecloudspa.in"
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs py-2.5 rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  {forgotLoading ? 'Submitting...' : 'Submit Password Reset Request'}
                </button>
              </form>
            )}

            <button
              onClick={() => {
                setForgotModalOpen(false);
                setForgotMsg('');
              }}
              className="w-full mt-3 py-2 bg-stone-800 text-stone-300 text-xs rounded-xl hover:bg-stone-700 transition cursor-pointer"
            >
              Back to Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
