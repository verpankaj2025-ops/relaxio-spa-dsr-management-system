import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../lib/api.js';
import {
  Settings,
  CreditCard,
  ShieldCheck,
  Building,
  Save,
  CheckCircle2,
  Database,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { exportDSREntriesToExcel } from '../lib/exportUtils.js';

export const SettingsPage: React.FC = () => {
  const { isSuperAdmin } = useAuth();
  const [spaName, setSpaName] = useState('The Cloud Spa');
  const [address, setAddress] = useState('4/526 Vivek Khand, Gomti Nagar, Lucknow, 226010, India');
  const [phone, setPhone] = useState('9455671995');
  const [taxRate, setTaxRate] = useState('0');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const [paymentModes] = useState([
    { id: 'Cash', name: 'Cash Collection', status: 'ACTIVE' },
    { id: 'UPI', name: 'UPI (Google Pay / PhonePe / Paytm)', status: 'ACTIVE' },
    { id: 'Card', name: 'Credit / Debit Card Machine', status: 'ACTIVE' },
  ]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const s = await api.getSettings();
      if (s) {
        if (s.spa_name) setSpaName(s.spa_name);
        else if (s.spaName) setSpaName(s.spaName);

        if (s.spa_address) setAddress(s.spa_address);
        else if (s.address) setAddress(s.address);

        if (s.spa_phone) setPhone(s.spa_phone);
        else if (s.phone) setPhone(s.phone);

        if (s.taxRate !== undefined) setTaxRate(String(s.taxRate));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateSettings({
        spa_name: spaName,
        spaName: spaName,
        spa_address: address,
        address: address,
        spa_phone: phone,
        phone: phone,
        taxRate: String(taxRate),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    }
  };

  const handleExportData = async () => {
    try {
      const entries = await api.getEntries({});
      await exportDSREntriesToExcel(entries);
    } catch (err: any) {
      alert('Failed to export DSR data');
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="bg-stone-900 border border-stone-800 p-8 rounded-2xl text-center space-y-3">
        <ShieldCheck className="w-10 h-10 text-red-400 mx-auto" />
        <h2 className="text-lg font-bold text-stone-100 font-serif">Access Restricted</h2>
        <p className="text-xs text-stone-400">Only Super Admin can access System Settings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-semibold uppercase tracking-widest mb-1">
            <Settings className="w-4 h-4" /> System Configuration & Data Export
          </div>
          <h1 className="text-xl md:text-2xl font-bold font-serif text-stone-100">
            Super Admin Settings
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Manage spa business profile, payment modes, and system data backups.
          </p>
        </div>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-400 flex items-center gap-2 font-medium">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>System settings updated successfully!</span>
        </div>
      )}

      {/* Data Export / Backup Card */}
      <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold font-serif text-stone-100">
                Data Backup & Export
              </h2>
              <p className="text-xs text-stone-400">
                Export full DSR dataset as Excel report for safe offline archiving.
              </p>
            </div>
          </div>

          <button
            onClick={handleExportData}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export All DSR Records</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spa Profile Settings */}
        <form onSubmit={handleSaveSettings} className="bg-stone-900 border border-stone-800 p-6 rounded-2xl space-y-4 shadow-md">
          <div className="text-sm font-bold font-serif text-stone-100 flex items-center gap-2 border-b border-stone-800 pb-3">
            <Building className="w-4 h-4 text-amber-400" /> Spa Business Profile
          </div>

          <div>
            <label className="block text-xs text-stone-400 mb-1">Spa / Business Name</label>
            <input
              type="text"
              value={spaName}
              onChange={e => setSpaName(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-stone-100"
            />
          </div>

          <div>
            <label className="block text-xs text-stone-400 mb-1">Business Address</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-stone-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-stone-400 mb-1">Contact Phone</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-stone-100 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-400 mb-1">Tax Rate (%)</label>
              <input
                type="number"
                value={taxRate}
                onChange={e => setTaxRate(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-stone-100 font-mono"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Save Profile
            </button>
          </div>
        </form>

        {/* Payment Modes Master */}
        <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl space-y-4 shadow-md">
          <div className="text-sm font-bold font-serif text-stone-100 flex items-center gap-2 border-b border-stone-800 pb-3">
            <CreditCard className="w-4 h-4 text-amber-400" /> Active Payment Modes Master
          </div>

          <p className="text-xs text-stone-400">
            Supported payment methods accepted during customer entry creation.
          </p>

          <div className="space-y-2.5">
            {paymentModes.map(pm => (
              <div key={pm.id} className="bg-stone-950 border border-stone-800/80 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-stone-100">{pm.name}</div>
                  <div className="text-[10px] font-mono text-stone-500">Code: {pm.id}</div>
                </div>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold">
                  {pm.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
