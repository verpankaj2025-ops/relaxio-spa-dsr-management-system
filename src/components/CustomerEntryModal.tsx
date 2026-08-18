import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { PaymentMode, CustomerEntry } from '../types.js';
import { X, Sparkles, AlertCircle, Wallet, Smartphone, CreditCard } from 'lucide-react';

interface CustomerEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: CustomerEntry | null;
}

export const CustomerEntryModal: React.FC<CustomerEntryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Required DSR Fields
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [visitDate, setVisitDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [timeIn, setTimeIn] = useState(() => new Date().toTimeString().substring(0, 5));
  const [staffName, setStaffName] = useState('');
  const [therapyName, setTherapyName] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setCustomerName(initialData.customerName || '');
        setMobileNumber(initialData.mobileNumber || '');
        setVisitDate(initialData.visitDate || new Date().toISOString().split('T')[0]);
        setTimeIn(initialData.timeIn || new Date().toTimeString().substring(0, 5));
        setStaffName(initialData.staffName || initialData.therapistName || '');
        setTherapyName(initialData.therapyName || '');
        setAmount(initialData.amount || '');
        setPaymentMode((initialData.paymentMode as PaymentMode) || 'Cash');
        setRemarks(initialData.remarks || '');
      } else {
        resetForm();
      }
    }
  }, [isOpen, initialData]);

  const resetForm = () => {
    setCustomerName('');
    setMobileNumber('');
    setVisitDate(new Date().toISOString().split('T')[0]);
    setTimeIn(new Date().toTimeString().substring(0, 5));
    setStaffName('');
    setTherapyName('');
    setAmount('');
    setPaymentMode('Cash');
    setRemarks('');
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!customerName.trim()) {
      setErrorMsg('Customer Name is required');
      return;
    }
    if (!mobileNumber.trim()) {
      setErrorMsg('Mobile Number is required');
      return;
    }

    if (!/^\d{10}$/.test(mobileNumber.trim())) {
      setErrorMsg('Mobile Number must contain exactly 10 digits');
      return;
    }
    if (!visitDate) {
      setErrorMsg('Visit Date is required');
      return;
    }
    if (!timeIn) {
      setErrorMsg('Time In is required');
      return;
    }
    if (!staffName.trim()) {
      setErrorMsg('Staff / Therapist Name is required');
      return;
    }
    if (!therapyName.trim()) {
      setErrorMsg('Therapy Name is required');
      return;
    }
    if (amount === '' || Number(amount) <= 0) {
      setErrorMsg('Amount must be greater than 0');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        customerName: customerName.trim(),
        mobileNumber: mobileNumber.trim(),
        visitDate,
        timeIn,
        staffName: staffName.trim(),
        therapyName: therapyName.trim(),
        amount: Number(amount),
        paymentMode,
        remarks: remarks.trim(),
      };

      if (initialData) {
        await api.updateEntry(initialData.id, payload);
      } else {
        await api.createEntry(payload);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/80 backdrop-blur-xs overflow-y-auto">
      <div className="bg-stone-900 border-t sm:border border-stone-800 rounded-t-3xl sm:rounded-2xl w-full max-w-lg shadow-2xl text-stone-100 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="bg-stone-950 px-5 py-4 border-b border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-serif tracking-wide text-stone-100">
                {initialData ? 'Edit Customer Entry' : 'New Customer Entry'}
              </h2>
              <p className="text-xs text-stone-400">Daily Sales Entry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-xl transition cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Customer Name & Mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">Customer Name *</label>
              <input
                type="text"
                required
                placeholder="Enter customer name"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3.5 py-3 text-sm text-stone-100 focus:outline-none transition shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">Mobile Number *</label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                required
                placeholder="Enter 10-digit mobile"
                value={mobileNumber}
                onChange={e => {
                  const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setMobileNumber(digitsOnly);
                }}
                className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3.5 py-3 text-sm text-stone-100 focus:outline-none transition shadow-inner font-mono"
              />
            </div>
          </div>

          {/* Date & Time In */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">Visit Date *</label>
              <input
                type="date"
                required
                value={visitDate}
                onChange={e => setVisitDate(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3.5 py-3 text-sm text-stone-100 font-mono focus:outline-none transition shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">Time In *</label>
              <input
                type="time"
                required
                value={timeIn}
                onChange={e => setTimeIn(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3.5 py-3 text-sm text-stone-100 font-mono focus:outline-none transition shadow-inner"
              />
            </div>
          </div>

          {/* Staff Name & Therapy Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">Staff / Therapist Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Ananya Roy"
                value={staffName}
                onChange={e => setStaffName(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3.5 py-3 text-sm text-stone-100 focus:outline-none transition shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-300 mb-1.5">Therapy Name *</label>
              <input
                type="text"
                required
                list="commonTherapies"
                placeholder="e.g. Swedish Massage"
                value={therapyName}
                onChange={e => setTherapyName(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3.5 py-3 text-sm text-stone-100 focus:outline-none transition shadow-inner"
              />
              <datalist id="commonTherapies">
                <option value="Swedish Massage" />
                <option value="Deep Tissue Massage" />
                <option value="Aromatherapy Session" />
                <option value="Foot Reflexology" />
                <option value="Hot Stone Therapy" />
                <option value="Body Scrub & Polishing" />
                <option value="Signature Facial & Spa" />
                <option value="Head & Shoulder Massage" />
              </datalist>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1.5">Amount (₹) *</label>
            <input
              type="number"
              required
              min="1"
              placeholder="e.g. 2500"
              value={amount}
              onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3.5 py-3 text-sm font-mono text-amber-400 font-bold focus:outline-none transition shadow-inner"
            />
          </div>

          {/* Payment Mode Selector */}
          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1.5">Payment Mode *</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMode('Cash')}
                className={`py-3 px-2 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer ${paymentMode === 'Cash'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
              >
                <Wallet className="w-4 h-4" />
                <span>Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('UPI')}
                className={`py-3 px-2 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer ${paymentMode === 'UPI'
                    ? 'bg-sky-500/20 border-sky-500 text-sky-400 shadow-md'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>UPI</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('Card')}
                className={`py-3 px-2 rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer ${paymentMode === 'Card'
                    ? 'bg-purple-500/20 border-purple-500 text-purple-400 shadow-md'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Card</span>
              </button>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1.5">Remarks</label>
            <input
              type="text"
              placeholder="Optional notes or remarks"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-3.5 py-3 text-sm text-stone-100 focus:outline-none transition shadow-inner"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-stone-800 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{saving ? 'Saving...' : initialData ? 'Update Entry' : 'Save Customer Entry'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
