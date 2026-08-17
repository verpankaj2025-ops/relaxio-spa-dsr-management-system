import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { DSREntry } from '../types.js';
import { Users, Search, Phone, Trash2 } from 'lucide-react';
import { getCurrencySymbol } from '../lib/exportUtils.js';
import { useAuth } from '../context/AuthContext.js';

interface AggregatedCustomer {
  id: string;
  name: string;
  mobile: string;
  totalVisits: number;
  totalSpent: number;
  lastVisit: string;
}

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<AggregatedCustomer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const { isSuperAdmin } = useAuth();

  useEffect(() => {
    fetchCustomers();
    api.getSettings().then(s => {
      if (s?.currency) setCurrencySymbol(getCurrencySymbol(s.currency));
    }).catch(() => {});
  }, [search]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const entries: DSREntry[] = await api.getEntries({ searchTerm: search });
      
      // Aggregate by mobile number or name
      const map = new Map<string, AggregatedCustomer>();

      entries.forEach((e) => {
        const key = (e.mobileNumber || '').trim() || (e.customerName || '').toLowerCase().trim();
        if (map.has(key)) {
          const existing = map.get(key)!;
          existing.totalVisits += 1;
          existing.totalSpent += e.amount;
          if (e.visitDate > existing.lastVisit) {
            existing.lastVisit = e.visitDate;
          }
        } else {
          map.set(key, {
            id: key,
            name: e.customerName,
            mobile: e.mobileNumber,
            totalVisits: 1,
            totalSpent: e.amount,
            lastVisit: e.visitDate,
          });
        }
      });

      setCustomers(Array.from(map.values()));
    } catch (e) {
      console.error('Failed to fetch customers:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async (c: AggregatedCustomer) => {
    if (!c) return;
    const identifier = c.mobile && c.mobile.trim() ? { mobile: c.mobile } : { name: (c.name || '').trim() };
    const confirmMsg = `Delete customer?\n\nName: ${c.name}\nMobile: ${c.mobile || '[none]'}\nTotal visits: ${c.totalVisits}\nTotal spent: ${c.totalSpent}\n\nThis will permanently delete all associated DSR records. This action cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await api.deleteCustomer(identifier);
      if (res && (res.deletedCount || res.deletedCount === 0 || res.deletedCount > 0)) {
        // success
        fetchCustomers();
        window.alert(`Customer deleted. ${res.deletedCount} DSR entries removed.`);
      } else if (res && res.success) {
        fetchCustomers();
        window.alert(`Customer deleted. ${res.deletedCount || 0} DSR entries removed.`);
      } else {
        // fallback
        fetchCustomers();
      }
    } catch (err: any) {
      window.alert('Failed to delete customer: ' + (err && err.message ? err.message : String(err)));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-semibold uppercase tracking-widest mb-1">
            <Users className="w-4 h-4" /> Customer Directory
          </div>
          <h1 className="text-xl md:text-2xl font-bold font-serif text-stone-100">
            Customer Directory
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            View customer visit history and total spend computed directly from DSR entries.
          </p>
        </div>

        <div className="w-full sm:w-72 relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search name or mobile..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl pl-9 pr-3 py-2 text-xs text-stone-100 focus:outline-none transition"
          />
        </div>
      </div>

      {/* Customer Directory Table */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-md">
        {loading ? (
          <div className="text-center py-12 text-stone-400 text-xs">Loading customer directory...</div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12 text-stone-500 text-xs">No customer records found matching search query.</div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-300">
                <thead className="bg-stone-950 text-stone-400 font-mono uppercase text-[10px] tracking-wider border-b border-stone-800">
                  <tr>
                    <th className="py-3 px-3">#</th>
                    <th className="py-3 px-3">Customer Name</th>
                    <th className="py-3 px-3">Mobile Number</th>
                    <th className="py-3 px-3">Total Visits</th>
                    <th className="py-3 px-3">Total Spent</th>
                    <th className="py-3 px-3">Last Visit</th>
                     <th className="py-3 px-3">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-stone-800/60">
                   {customers.map((c, idx) => (
                     <tr key={c.id} className="hover:bg-stone-800/40 transition">
                       <td className="py-3 px-3 font-mono text-stone-500">{idx + 1}</td>
                       <td className="py-3 px-3 font-bold text-stone-100">{c.name}</td>
                       <td className="py-3 px-3 font-mono text-amber-400">
                         <div className="flex items-center gap-1">
                           <Phone className="w-3 h-3 text-stone-500" />
                           <span>{c.mobile}</span>
                         </div>
                       </td>
                       <td className="py-3 px-3 font-mono">
                         <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-bold">
                           {c.totalVisits} visits
                         </span>
                       </td>
                       <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                         {currencySymbol}{c.totalSpent.toLocaleString('en-IN')}
                       </td>
                       <td className="py-3 px-3 font-mono text-stone-400">
                         {c.lastVisit}
                       </td>
                       <td className="py-3 px-3">
                         {isSuperAdmin ? (
                           <button
                             onClick={() => handleDeleteCustomer(c)}
                             className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-[12px]"
                             title="Delete customer and all associated DSR entries"
                           >
                             <Trash2 className="w-4 h-4" /> Delete
                           </button>
                         ) : null}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
                    </div>

            {/* Mobile Cards View */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {customers.map((c) => (
                <div key={c.id} className="bg-stone-950 border border-stone-800 p-4 rounded-xl space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-stone-100">{c.name}</span>
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                      {c.totalVisits} visits
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-1 text-amber-400">
                      <Phone className="w-3 h-3 text-stone-500" />
                      <span>{c.mobile}</span>
                    </div>
                    <span className="text-emerald-400 font-bold">
                      {currencySymbol}{c.totalSpent.toLocaleString('en-IN')} spent
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-stone-400 pt-2 border-t border-stone-800/80 font-mono">
                    <span>Last Visit: {c.lastVisit}</span>
                    {isSuperAdmin ? (
                      <button
                        onClick={() => handleDeleteCustomer(c)}
                        className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-[12px]"
                        title="Delete customer and all associated DSR entries"
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    ) : null}
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
