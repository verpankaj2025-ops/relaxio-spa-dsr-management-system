import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { User, UserRole } from '../types.js';
import { UserCog, Plus, ShieldCheck, UserCheck, KeyRound, Ban, Trash2, X, CheckCircle2, AlertCircle } from 'lucide-react';

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Create User Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('ADMIN');
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  // Reset Password Modal
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetMsg, setResetMsg] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.getUsers();
      setUsers(res);
    } catch (e) {
      console.error('Failed to load users:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    if (!name.trim() || !email.trim() || !password) return;

    setCreating(true);
    try {
      await api.createUser({ name: name.trim(), email: email.trim(), status: 'ACTIVE', role });
      setCreateModalOpen(false);
      setName('');
      setEmail('');
      setPassword('');
      loadUsers();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (u: User) => {
    const nextStatus = u.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      await api.updateUserStatus(u.id, nextStatus);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser || !newPassword) return;
    try {
      await api.resetUserPassword(resetUser.id, newPassword);
      setResetMsg('Password reset successfully!');
      setTimeout(() => {
        setResetModalOpen(false);
        setResetMsg('');
        setNewPassword('');
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to reset password');
    }
  };

  const handleDeleteUser = async (u: User) => {
    if (!window.confirm(`Are you sure you want to delete user account "${u.name}"?`)) return;
    try {
      await api.deleteUser(u.id);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-semibold uppercase tracking-widest mb-1">
            <UserCog className="w-4 h-4" /> Super Admin Credentials & Roles
          </div>
          <h1 className="text-xl md:text-2xl font-bold font-serif text-stone-100">
            Staff & Admin Account Management
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Provision new Admin logins, disable accounts, reset staff passwords, and manage permissions.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Provision New Admin
        </button>
      </div>

      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-md">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-300">
            <thead className="bg-stone-950 text-stone-400 font-mono uppercase text-[10px] tracking-wider border-b border-stone-800">
              <tr>
                <th className="py-3 px-3">#</th>
                <th className="py-3 px-3">User Details</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Created On</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60">
              {users.map((u, idx) => (
                <tr key={u.id} className="hover:bg-stone-800/40 transition">
                  <td className="py-3 px-3 font-mono text-stone-500">{idx + 1}</td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-stone-100">{u.name}</div>
                    <div className="text-[10px] font-mono text-amber-400">{u.email}</div>
                  </td>
                  <td className="py-3 px-3">
                    {u.role === 'SUPER_ADMIN' ? (
                      <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                        <ShieldCheck className="w-3 h-3" /> SUPER ADMIN
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-stone-800 text-stone-300 px-2 py-0.5 rounded text-[10px] font-mono">
                        <UserCheck className="w-3 h-3" /> STAFF ADMIN
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                        u.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-stone-400 text-[11px]">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'System Default'}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setResetUser(u);
                          setResetModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 text-[11px] rounded transition flex items-center gap-1 cursor-pointer"
                        title="Reset Password"
                      >
                        <KeyRound className="w-3 h-3 text-amber-400" /> Reset Password
                      </button>

                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`p-1.5 rounded transition cursor-pointer ${
                          u.status === 'ACTIVE'
                            ? 'text-amber-400 hover:bg-amber-500/10'
                            : 'text-emerald-400 hover:bg-emerald-500/10'
                        }`}
                        title={u.status === 'ACTIVE' ? 'Disable Account' : 'Enable Account'}
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteUser(u)}
                        className="p-1.5 text-stone-400 hover:text-red-400 hover:bg-red-500/10 rounded transition cursor-pointer"
                        title="Delete User"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="grid grid-cols-1 gap-3 md:hidden">
          {users.map((u, idx) => (
            <div key={u.id} className="bg-stone-950 border border-stone-800 p-4 rounded-xl space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-stone-100">{u.name}</div>
                  <div className="text-xs font-mono text-amber-400">{u.email}</div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                    u.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}
                >
                  {u.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-800/80">
                {u.role === 'SUPER_ADMIN' ? (
                  <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                    <ShieldCheck className="w-3 h-3" /> SUPER ADMIN
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-stone-800 text-stone-300 px-2 py-0.5 rounded text-[10px] font-mono">
                    <UserCheck className="w-3 h-3" /> STAFF ADMIN
                  </span>
                )}
                <span className="text-[10px] font-mono text-stone-400">
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Default'}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800/80">
                <button
                  onClick={() => {
                    setResetUser(u);
                    setResetModalOpen(true);
                  }}
                  className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs rounded transition flex items-center gap-1 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" /> Reset Pass
                </button>

                <button
                  onClick={() => handleToggleStatus(u)}
                  className={`p-1.5 rounded transition cursor-pointer border ${
                    u.status === 'ACTIVE'
                      ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                      : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                  }`}
                >
                  <Ban className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDeleteUser(u)}
                  className="p-1.5 text-stone-400 hover:text-red-400 hover:bg-red-500/10 border border-red-500/20 rounded transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create User Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-xs">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md p-6 text-stone-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3 mb-4">
              <h3 className="text-base font-bold font-serif">Provision New Admin Account</h3>
              <button onClick={() => setCreateModalOpen(false)} className="p-1 text-stone-400 hover:text-stone-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs text-stone-400 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Staff Name"
                  className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-stone-100"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-400 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="staff@thecloudspa.in"
                  className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-stone-100"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-400 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-stone-100"
                />
              </div>

              <div>
                <label className="block text-xs text-stone-400 mb-1">Account Role *</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value as UserRole)}
                  className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-stone-100"
                >
                  <option value="ADMIN">ADMIN (Staff Entry & DSR)</option>
                  <option value="SUPER_ADMIN">SUPER ADMIN (Full System Control)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 bg-stone-800 text-stone-300 text-xs rounded-xl hover:bg-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl shadow-md"
                >
                  {creating ? 'Provisioning...' : 'Provision Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModalOpen && resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-xs">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-sm p-6 text-stone-100 shadow-2xl">
            <h3 className="text-base font-bold font-serif mb-1">Reset Password for {resetUser.name}</h3>
            <p className="text-xs text-stone-400 mb-4">{resetUser.email}</p>

            {resetMsg ? (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{resetMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs text-stone-400 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-stone-100"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setResetModalOpen(false)}
                    className="px-3 py-2 bg-stone-800 text-stone-300 text-xs rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 text-stone-950 font-bold text-xs rounded-xl shadow"
                  >
                    Reset Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
