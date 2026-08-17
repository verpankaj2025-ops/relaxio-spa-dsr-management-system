import { createClient } from '@supabase/supabase-js';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import {
  isNonEmptyString,
  isValidPhoneNumber,
  isValidDateString,
  sanitizeInput,
  sendValidationError,
  sendInternalError,
} from '../middleware/validate.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

export default async function handler(req: any, res: any) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  // ---------------------------------------------------------
  // GET: Read DSR Entries (with query filters)
  // ---------------------------------------------------------
  if (req.method === 'GET') {
    try {
      const { startDate, endDate, paymentMode, staffName, searchTerm } = req.query || {};

      if (supabase) {
        try {
          let query = supabase.from('dsr_entries').select('*').order('visit_date', { ascending: false });

          if (startDate && isValidDateString(startDate)) {
            query = query.gte('visit_date', String(startDate));
          }
          if (endDate && isValidDateString(endDate)) {
            query = query.lte('visit_date', String(endDate));
          }
          if (paymentMode && String(paymentMode).toUpperCase() !== 'ALL') {
            query = query.eq('payment_mode', String(paymentMode));
          }

          const { data, error } = await query;
          if (!error && data && data.length > 0) {
            let results = data;

            if (staffName && String(staffName).toUpperCase() !== 'ALL') {
              const sName = String(staffName).toLowerCase();
              results = results.filter((e: any) =>
                (e.staff_name || '').toLowerCase().includes(sName)
              );
            }

            if (searchTerm) {
              const term = String(searchTerm).toLowerCase();
              results = results.filter(
                (e: any) =>
                  (e.customer_name || '').toLowerCase().includes(term) ||
                  (e.mobile_number || '').includes(term) ||
                  (e.therapy_name || '').toLowerCase().includes(term) ||
                  (e.staff_name || '').toLowerCase().includes(term)
              );
            }

            return res.status(200).json(results);
          }
        } catch (_) {}
      }

      // Persistent File DB Fallback
      const fileDbEntries = db.getEntries({
        startDate: startDate ? String(startDate) : undefined,
        endDate: endDate ? String(endDate) : undefined,
        paymentMode: paymentMode ? String(paymentMode) : undefined,
        staffName: staffName ? String(staffName) : undefined,
        searchTerm: searchTerm ? String(searchTerm) : undefined,
      });

      return res.status(200).json(fileDbEntries);
    } catch (err: any) {
      return sendInternalError(res, err, 'Failed to fetch DSR entries');
    }
  }

  // ---------------------------------------------------------
  // POST: Create DSR Entry
  // ---------------------------------------------------------
  if (req.method === 'POST') {
    const {
      customerName,
      mobileNumber,
      visitDate,
      timeIn,
      therapyName,
      staffName,
      amount,
      paymentMode,
      remarks,
    } = req.body || {};

    const errors: string[] = [];
    if (!isNonEmptyString(customerName)) errors.push('Customer name is required');
    if (!isValidPhoneNumber(mobileNumber)) errors.push('Valid mobile phone number is required');
    if (!isNonEmptyString(therapyName)) errors.push('Therapy name is required');
    if (!isNonEmptyString(staffName)) errors.push('Staff therapist name is required');
    
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) errors.push('Amount must be a valid positive number');

    const validModes = ['Cash', 'UPI', 'Card', 'Mixed', 'Other'];
    const pMode = isNonEmptyString(paymentMode) ? String(paymentMode) : 'Cash';
    if (!validModes.map(m => m.toLowerCase()).includes(pMode.toLowerCase())) {
      errors.push(`Payment mode must be one of: ${validModes.join(', ')}`);
    }

    if (errors.length > 0) {
      return sendValidationError(res, errors);
    }

    const payload = {
      customer_name: sanitizeInput(String(customerName).trim()),
      mobile_number: sanitizeInput(String(mobileNumber).trim()),
      visit_date: visitDate && isValidDateString(visitDate) ? visitDate : new Date().toISOString().split('T')[0],
      time_in: sanitizeInput(timeIn || '10:00'),
      therapy_name: sanitizeInput(String(therapyName).trim()),
      staff_name: sanitizeInput(String(staffName).trim()),
      therapist_name: sanitizeInput(String(staffName).trim()),
      amount: parsedAmount,
      payment_mode: sanitizeInput(pMode),
      remarks: remarks ? sanitizeInput(String(remarks).trim()) : '',
      created_by_user_id: user.id,
      created_by_name: sanitizeInput(user.name),
    };

    try {
      if (supabase) {
        try {
          const { data, error } = await supabase.from('dsr_entries').insert([payload]).select().single();
          if (!error && data) {
            db.createEntry(payload); // Mirror in persistent store
            return res.status(201).json(data);
          }
        } catch (_) {}
      }

      const created = db.createEntry(payload);
      return res.status(201).json(created);
    } catch (err: any) {
      return sendInternalError(res, err, 'Failed to create DSR entry');
    }
  }

  // ---------------------------------------------------------
  // PUT / PATCH: Update existing DSR Entry
  // ---------------------------------------------------------
  if (req.method === 'PUT' || req.method === 'PATCH') {
    const entryId = req.query?.id || req.body?.id;
    if (!entryId) {
      return sendValidationError(res, 'Entry ID parameter (id) is required for updates');
    }

    const {
      customerName,
      mobileNumber,
      visitDate,
      timeIn,
      therapyName,
      staffName,
      amount,
      paymentMode,
      remarks,
    } = req.body || {};

    const updatePayload: any = {};
    if (customerName !== undefined) updatePayload.customer_name = String(customerName).trim();
    if (mobileNumber !== undefined) {
      if (!isValidPhoneNumber(mobileNumber)) return sendValidationError(res, 'Invalid mobile number format');
      updatePayload.mobile_number = String(mobileNumber).trim();
    }
    if (visitDate !== undefined) updatePayload.visit_date = visitDate;
    if (timeIn !== undefined) updatePayload.time_in = timeIn;
    if (therapyName !== undefined) updatePayload.therapy_name = String(therapyName).trim();
    if (staffName !== undefined) {
      updatePayload.staff_name = String(staffName).trim();
      updatePayload.therapist_name = String(staffName).trim();
    }
    if (amount !== undefined) {
      const parsedAmt = Number(amount);
      if (isNaN(parsedAmt) || parsedAmt < 0) return sendValidationError(res, 'Amount must be a non-negative number');
      updatePayload.amount = parsedAmt;
    }
    if (paymentMode !== undefined) updatePayload.payment_mode = String(paymentMode);
    if (remarks !== undefined) updatePayload.remarks = String(remarks).trim();

    try {
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('dsr_entries')
            .update(updatePayload)
            .eq('id', entryId)
            .select()
            .maybeSingle();

          if (!error && data) {
            db.updateEntry(entryId, updatePayload);
            return res.status(200).json(data);
          }
        } catch (_) {}
      }

      const updated = db.updateEntry(entryId, updatePayload);
      if (!updated) {
        return res.status(404).json({ error: 'Entry not found', statusCode: 404 });
      }
      return res.status(200).json(updated);
    } catch (err: any) {
      return sendInternalError(res, err, 'Failed to update DSR entry');
    }
  }

  // ---------------------------------------------------------
  // DELETE: Delete DSR Entry
  // ---------------------------------------------------------
  if (req.method === 'DELETE') {
    const entryId = req.query?.id || req.body?.id;
    if (!entryId) {
      return sendValidationError(res, 'Entry ID parameter (id) is required for deletion');
    }

    try {
      if (supabase) {
        try {
          await supabase.from('dsr_entries').delete().eq('id', entryId);
        } catch (_) {}
      }

      db.deleteEntry(entryId);

      return res.status(200).json({
        success: true,
        message: `DSR entry #${entryId} deleted successfully`,
        deletedId: entryId,
      });
    } catch (err: any) {
      return sendInternalError(res, err, 'Failed to delete DSR entry');
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed', statusCode: 405 });
}
