import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { CustomerEntry } from '../types.js';
import { useAuth } from '../context/AuthContext.js';
import { exportDSREntriesToExcel, exportDSREntriesToPDF, printDSRReport } from '../lib/exportUtils.js';
import {
  FileSpreadsheet,
  Search,
  Filter,
  Download,
  Printer,
  FileText,
  Edit2,
  Trash2,
  PlusCircle,
  RefreshCw,
} from 'lucide-react';

interface DailySalesPageProps {
  onOpenNewEntry: () => void;
  onEditEntry: (entry: CustomerEntry) => void;
}

export const DailySalesPage: React.FC<DailySalesPageProps> = ({ onOpenNewEntry, onEditEntry }) => {
  const { isSuperAdmin } = useAuth();
  const [entries, setEntries] = useState<CustomerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Date Filters
  const [presetDate, setPresetDate] = useState<string>('today');
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  const [currency, setCurrency] = useState('INR');

  useEffect(() => {
    fetchEntries();
    api.getSettings().then(s => {
      if (s?.currency) setCurrency(s.currency);
    }).catch(() => {});
  }, [startDate, endDate, paymentMode, search, presetDate]);

  const applyPresetDate = (preset: string) => {
    setPresetDate(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      setStartDate(y.toISOString().split('T')[0]);
      setEndDate(y.toISOString().split('T')[0]);
    } else if (preset === 'this_week') {
      const w = new Date(today);
      w.setDate(w.getDate() - 7);
      setStartDate(w.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'this_month') {
      setStartDate(`${todayStr.substring(0, 7)}-01`);
      setEndDate(todayStr);
    }
  };

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const entriesRes = await api.getEntries({
        startDate,
        endDate,
        paymentMode: paymentMode === 'ALL' ? undefined : paymentMode,
        searchTerm: search,
      });
      setEntries(entriesRes);
    } catch (err) {
      console.error('Failed to fetch DSR entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    try {
      await api.deleteEntry(id);
      fetchEntries();
    } catch (err: any) {
      alert(err.message || 'Failed to delete entry');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-semibold uppercase tracking-widest mb-1">
            <FileSpreadsheet className="w-4 h-4" /> Daily Sales Report (DSR)
          </div>
          <h1 className="text-xl md:text-2xl font-bold font-serif text-stone-100">
            Daily Sales Register
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Real-time customer visits, therapy records, and revenue tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={async () => { try { await exportDSREntriesToExcel(entries, 'The_Cloud_Spa_DSR_Report.xlsx', currency); } catch(err){ console.error('Export Excel failed', err); alert('Export failed'); } }}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Excel
          </button>

          <button
            onClick={async () => { try { await exportDSREntriesToPDF(entries, 'Daily Sales Report', 'The_Cloud_Spa_DSR_Report.pdf', currency); } catch(err){ console.error('Export PDF failed', err); alert('Export failed'); } }}
            className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" /> PDF
          </button>

          <button
            onClick={() => { try { printDSRReport(entries, 'Daily Sales Report', currency); } catch(err){ console.error('Print failed', err); alert('Print failed'); } }}
            className="px-3 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-semibold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" /> Print
          </button>

          <button
            onClick={onOpenNewEntry}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-xl transition shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" /> + New Entry
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-stone-900 border border-stone-800 p-5 rounded-2xl shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
            <Filter className="w-3.5 h-3.5" /> Filter Sales Entries
          </div>

          <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800 text-[11px]">
            {['today', 'yesterday', 'this_week', 'this_month'].map(preset => (
              <button
                key={preset}
                onClick={() => applyPresetDate(preset)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer capitalize ${
                  presetDate === preset
                    ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {preset.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] text-stone-400 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => {
                setStartDate(e.target.value);
                setPresetDate('custom');
              }}
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-2.5 py-1.5 text-xs text-stone-100 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] text-stone-400 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={e => {
                setEndDate(e.target.value);
                setPresetDate('custom');
              }}
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-2.5 py-1.5 text-xs text-stone-100 font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] text-stone-400 mb-1">Payment Mode</label>
            <select
              value={paymentMode}
              onChange={e => setPaymentMode(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-2.5 py-1.5 text-xs text-stone-100"
            >
              <option value="ALL">All Payment Modes</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-stone-400 mb-1">Search Customer / Therapy</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search name, mobile..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-stone-100"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-md">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-stone-400 text-xs gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-400" /> Loading Entries...
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-stone-500 text-xs">
            No DSR entries found matching the filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-300">
              <thead className="bg-stone-950 text-stone-400 font-mono uppercase text-[10px] tracking-wider border-b border-stone-800">
                <tr>
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">Visit Date</th>
                  <th className="py-3 px-3">Time In</th>
                  <th className="py-3 px-3">Customer Name</th>
                  <th className="py-3 px-3">Mobile Number</th>
                  <th className="py-3 px-3">Therapy</th>
                  <th className="py-3 px-3">Staff / Therapist</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Payment</th>
                  <th className="py-3 px-3">Remarks</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60">
                {entries.map((entry, idx) => (
                  <tr key={entry.id} className="hover:bg-stone-800/40 transition">
                    <td className="py-3 px-3 font-mono text-stone-500">{idx + 1}</td>
                    <td className="py-3 px-3 font-mono text-stone-200">{entry.visitDate}</td>
                    <td className="py-3 px-3 font-mono text-stone-400">{entry.timeIn || '10:00'}</td>
                    <td className="py-3 px-3 font-bold text-stone-100">{entry.customerName}</td>
                    <td className="py-3 px-3 font-mono text-amber-400">{entry.mobileNumber}</td>
                    <td className="py-3 px-3 text-stone-100 font-medium">{entry.therapyName}</td>
                    <td className="py-3 px-3 text-stone-300">{entry.staffName}</td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-400">₹{entry.amount.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-3">
                      <span className="bg-stone-950 px-2 py-0.5 rounded border border-stone-800 font-mono text-[10px]">
                        {entry.paymentMode}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-stone-400 text-[11px] truncate max-w-[120px]">{entry.remarks || '-'}</td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onEditEntry(entry)}
                          className="p-1.5 text-stone-400 hover:text-amber-400 hover:bg-stone-800 rounded transition cursor-pointer"
                          title="Edit Entry"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {isSuperAdmin && (
                          <button
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="p-1.5 text-stone-400 hover:text-red-400 hover:bg-red-500/10 rounded transition cursor-pointer"
                            title="Delete Entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
