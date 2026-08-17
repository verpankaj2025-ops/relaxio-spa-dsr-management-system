import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { Sparkles, Sun, Moon, LogOut, ShieldCheck, User as UserIcon, Menu, Clock, TrendingUp } from 'lucide-react';
import { DashboardSummary } from '../types.js';

interface HeaderProps {
  onToggleSidebar?: () => void;
  summary?: DashboardSummary | null;
  onOpenNewEntry?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, summary, onOpenNewEntry }) => {
  const { user, logout, isSuperAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const todayDateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <header className="sticky top-0 z-30 bg-stone-900/95 dark:bg-stone-950/95 backdrop-blur border-b border-stone-800 dark:border-stone-800 text-stone-100 px-4 lg:px-8 py-3.5 flex items-center justify-between shadow-md transition-colors">
      {/* Left section: Logo & Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 text-amber-400 hover:bg-stone-800 rounded-lg transition"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-300 p-0.5 shadow-lg shadow-amber-900/30">
            <div className="w-full h-full bg-stone-950 rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div>
            <span className="font-serif font-bold text-lg tracking-wider text-stone-100 block leading-none">
              THE CLOUD <span className="text-amber-400 font-sans font-light text-sm uppercase">SPA</span>
            </span>
            <span className="text-[10px] text-stone-400 tracking-widest uppercase block mt-0.5 font-mono">
              DSR Management System
            </span>
          </div>
        </div>
      </div>

      {/* Center Section: Live Sales & Clock */}
      <div className="hidden md:flex items-center gap-6">
        <div className="flex items-center gap-2 bg-stone-950/80 px-3.5 py-1.5 rounded-full border border-stone-800 text-xs text-stone-300 font-mono">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>{todayDateStr}</span>
          <span className="text-amber-400 font-semibold">{timeStr}</span>
        </div>

        {summary && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-full text-xs text-amber-300">
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            <span>Today's Sales:</span>
            <span className="font-bold font-mono text-amber-400">₹{summary.todaysRevenue.toLocaleString()}</span>
            <span className="text-stone-400">({summary.todaysCustomers} visits)</span>
          </div>
        )}
      </div>

      {/* Right Section: Actions, Role Badge & User Profile */}
      <div className="flex items-center gap-3">
        {/* Quick New Entry Button */}
        <button
          onClick={onOpenNewEntry}
          className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs px-3.5 py-2 rounded-lg shadow-md shadow-amber-500/20 transition flex items-center gap-1.5 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">+ Customer Entry</span>
          <span className="sm:hidden">+ Entry</span>
        </button>

        {/* Dark/Light mode toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-stone-400 hover:text-amber-400 hover:bg-stone-800 rounded-lg transition"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 text-stone-300" />}
        </button>

        {/* User Info & Logout */}
        <div className="flex items-center gap-3 pl-2 border-l border-stone-800">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-stone-100 flex items-center justify-end gap-1">
              {user?.name}
            </div>
            <div className="flex items-center justify-end gap-1 text-[10px]">
              {isSuperAdmin ? (
                <span className="inline-flex items-center gap-0.5 text-amber-400 font-mono font-medium">
                  <ShieldCheck className="w-3 h-3" /> SUPER ADMIN
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-stone-400 font-mono">
                  <UserIcon className="w-3 h-3" /> ADMIN
                </span>
              )}
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 text-stone-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
            title="Logout of System"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
