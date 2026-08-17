import React, { useState } from 'react';
import { DashboardSummary, CustomerEntry } from '../types.js';
import { PlusCircle, Search, Users, DollarSign, Sparkles, CreditCard, Wallet, Smartphone, Clock, User, Phone, Edit2 } from 'lucide-react';

interface DashboardProps {
  summary: DashboardSummary | null;
  recentEntries: CustomerEntry[];
  onOpenNewEntry: () => void;
  onNavigateToDsr: () => void;
  onEditEntry: (entry: CustomerEntry) => void;
}

export const AdminDashboard: React.FC<DashboardProps> = ({
  summary,
  recentEntries,
  onOpenNewEntry,
  onNavigateToDsr,
  onEditEntry,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEntries = recentEntries.filter(e => {
    const staff = e.staffName || e.therapistName || '';
    return (
      e.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.mobileNumber.includes(searchTerm) ||
      e.therapyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Welcome & Quick Entry Header */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-900 to-amber-950/40 p-5 md:p-6 rounded-2xl border border-stone-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-semibold uppercase tracking-widest mb-1">
            <Sparkles className="w-4 h-4" /> Daily Sales & Collection Portal
          </div>
          <h1 className="text-xl md:text-2xl font-bold font-serif text-stone-100">
            Daily Sales Dashboard
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Real-time tracking for today's customer entries, collections, and daily revenue.
          </p>
        </div>

        <button
          onClick={onOpenNewEntry}
          className="w-full md:w-auto px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <PlusCircle className="w-5 h-5" />
          <span>+ New Customer Entry</span>
        </button>
      </div>

      {/* 5 Key Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* 1. Today's Customers */}
        <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-stone-400 font-semibold uppercase font-mono">Today's Visits</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono text-stone-100">
              {summary ? summary.todaysCustomers : '0'}
            </div>
            <p className="text-[10px] text-stone-500 mt-0.5">Visits today</p>
          </div>
        </div>

        {/* 2. Today's Revenue */}
        <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-stone-400 font-semibold uppercase font-mono">Today's Total</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono text-amber-400">
              ₹{summary ? summary.todaysRevenue.toLocaleString('en-IN') : '0'}
            </div>
            <p className="text-[10px] text-stone-500 mt-0.5">Total collected today</p>
          </div>
        </div>

        {/* 3. Cash Collection */}
        <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-stone-400 font-semibold uppercase font-mono">Cash</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono text-emerald-400">
              ₹{summary ? summary.cashCollection.toLocaleString('en-IN') : '0'}
            </div>
            <p className="text-[10px] text-stone-500 mt-0.5">Cash in hand</p>
          </div>
        </div>

        {/* 4. UPI Collection */}
        <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-stone-400 font-semibold uppercase font-mono">UPI</span>
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono text-sky-400">
              ₹{summary ? summary.upiCollection.toLocaleString('en-IN') : '0'}
            </div>
            <p className="text-[10px] text-stone-500 mt-0.5">GPay / PhonePe / UPI</p>
          </div>
        </div>

        {/* 5. Card Collection */}
        <div className="bg-stone-900 border border-stone-800 p-4 rounded-2xl shadow-md col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-stone-400 font-semibold uppercase font-mono">Card</span>
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-bold font-mono text-purple-400">
              ₹{summary ? summary.cardCollection.toLocaleString('en-IN') : '0'}
            </div>
            <p className="text-[10px] text-stone-500 mt-0.5">POS Card Machine</p>
          </div>
        </div>
      </div>

      {/* Today's Entries Section */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 md:p-5 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-stone-800 pb-3">
          <div>
            <h3 className="text-sm font-bold font-serif text-stone-100">Today's Customer Entries</h3>
            <p className="text-xs text-stone-400">Logged sales entries for today</p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-stone-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search name, mobile..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-100 focus:outline-none transition"
              />
            </div>

            <button
              onClick={onNavigateToDsr}
              className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-xl transition whitespace-nowrap cursor-pointer shrink-0"
            >
              View Full DSR
            </button>
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="text-center py-8 text-stone-500 text-xs">
            No entries found for today.
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-300">
                <thead className="bg-stone-950 text-stone-400 font-mono uppercase text-[10px] tracking-wider border-b border-stone-800">
                  <tr>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Customer Name</th>
                    <th className="py-2.5 px-3">Mobile Number</th>
                    <th className="py-2.5 px-3">Therapy</th>
                    <th className="py-2.5 px-3">Staff / Therapist</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3">Remarks</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60">
                  {filteredEntries.map(entry => (
                    <tr key={entry.id} className="hover:bg-stone-800/40 transition">
                      <td className="py-2.5 px-3 font-mono text-stone-400">{entry.timeIn || '10:00'}</td>
                      <td className="py-2.5 px-3 font-semibold text-stone-100">{entry.customerName}</td>
                      <td className="py-2.5 px-3 font-mono text-amber-400">{entry.mobileNumber}</td>
                      <td className="py-2.5 px-3 text-stone-200">{entry.therapyName}</td>
                      <td className="py-2.5 px-3 text-stone-300">{entry.staffName || entry.therapistName}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-amber-400">₹{entry.amount.toLocaleString('en-IN')}</td>
                      <td className="py-2.5 px-3">
                        <span className="bg-stone-950 px-2 py-0.5 rounded border border-stone-800 text-[10px] font-mono">
                          {entry.paymentMode}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-stone-400 text-[11px] truncate max-w-[120px]" title={entry.remarks}>
                        {entry.remarks || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => onEditEntry(entry)}
                          className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold rounded-lg transition cursor-pointer"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards List View */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {filteredEntries.map(entry => (
                <div
                  key={entry.id}
                  className="bg-stone-950 border border-stone-800 p-4 rounded-xl space-y-2.5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-stone-100">
                      <User className="w-3.5 h-3.5 text-amber-400" />
                      <span>{entry.customerName}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      ₹{entry.amount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-stone-400 font-mono pt-1 border-t border-stone-800/80">
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-stone-500" />
                      <span>{entry.mobileNumber}</span>
                    </div>
                    <div className="flex items-center gap-1 justify-end text-stone-300">
                      <Clock className="w-3 h-3 text-stone-500" />
                      <span>{entry.timeIn || '10:00'}</span>
                    </div>
                  </div>

                  <div className="text-xs text-stone-300 space-y-0.5">
                    <div><span className="text-stone-500">Therapy:</span> {entry.therapyName}</div>
                    <div><span className="text-stone-500">Staff:</span> {entry.staffName || entry.therapistName}</div>
                    {entry.remarks && (
                      <div className="text-[11px] text-stone-400 italic">"{entry.remarks}"</div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-stone-800/80">
                    <span className="bg-stone-900 border border-stone-800 px-2 py-0.5 rounded text-[10px] font-mono text-stone-300">
                      {entry.paymentMode}
                    </span>
                    <button
                      onClick={() => onEditEntry(entry)}
                      className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Entry</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
