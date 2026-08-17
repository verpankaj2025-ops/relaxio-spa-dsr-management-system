import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import {
  LayoutDashboard,
  FileSpreadsheet,
  UserCog,
  ChevronRight,
  PlusCircle,
  UserSearch,
  Settings,
} from 'lucide-react';

export type NavTab = 
  | 'dashboard'
  | 'dsr'
  | 'customers'
  | 'users'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  onOpenNewEntry: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  onCloseMobile,
  onOpenNewEntry,
}) => {
  const { isSuperAdmin, user } = useAuth();

  const handleSelect = (tab: NavTab) => {
    setActiveTab(tab);
    onCloseMobile();
  };

  const navItems = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard, roleReq: 'ALL' },
    { id: 'dsr' as NavTab, label: 'Daily Sales Report (DSR)', icon: FileSpreadsheet, roleReq: 'ALL' },
    { id: 'customers' as NavTab, label: 'Customer Records', icon: UserSearch, roleReq: 'ALL' },
    { id: 'users' as NavTab, label: 'Admin Management', icon: UserCog, roleReq: 'SUPER_ADMIN' },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings, roleReq: 'SUPER_ADMIN' },
  ];

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-stone-950/80 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 z-50 w-64 bg-stone-900 border-r border-stone-800 text-stone-300 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-4 space-y-6 overflow-y-auto">
          {/* Quick Action Box */}
          <div className="bg-gradient-to-br from-stone-950 to-stone-900 p-3.5 rounded-xl border border-amber-500/20 shadow-inner">
            <div className="text-[11px] text-amber-400 font-semibold uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Quick Action</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <button
              onClick={() => {
                onOpenNewEntry();
                onCloseMobile();
              }}
              className="w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 transition shadow-md cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Customer Entry</span>
            </button>
          </div>

          {/* Navigation Links Group */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-mono uppercase tracking-widest text-stone-500 font-semibold">
              System Menu
            </div>
            <nav className="space-y-1">
              {navItems.map(item => {
                if (item.roleReq === 'SUPER_ADMIN' && !isSuperAdmin) {
                  return null;
                }

                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                      isActive
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-semibold'
                        : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-stone-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-amber-400" />}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-stone-800 bg-stone-950/50 text-[11px] text-stone-400">
          <div className="flex items-center justify-between mb-1">
            <span className="text-stone-300 font-semibold">{user?.name}</span>
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono">
              {user?.role}
            </span>
          </div>
          <div className="text-stone-400 text-[10px]">
            The Cloud Spa v1.0.0 &bull; System Active
          </div>
        </div>
      </aside>
    </>
  );
};
