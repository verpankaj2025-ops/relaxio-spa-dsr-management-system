import { db } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase.js';
import {
  isNonEmptyString,
  isValidPhoneNumber,
  isValidDateString,
  sanitizeInput,
  sendValidationError,
  sendInternalError,
} from '../middleware/validate.js';

export default async function handler(req: any, res: any) {
  const user = await requireAuth(req, res);
  if (!user) return;

  // ---------------------------------------------------------
  // GET: Read DSR Entries (with query filters)
  // ---------------------------------------------------------
  if (req.method === 'GET') {
    try {
      const { startDate, endDate, paymentMode, staffName, searchTerm } = req.query || {};

      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        if (!supabase) return res.status(503).json({ error: 'Service Unavailable: Database client initialization failed', statusCode: 503 });

        try {
          let query: any = supabase.from('dsr_entries').select('*').order('visit_date', { ascending: false });

          if (startDate && isValidDateString(startDate)) query = query.gte('visit_date', String(startDate));
          if (endDate && isValidDateString(endDate)) query = query.lte('visit_date', String(endDate));
          if (paymentMode && String(paymentMode).toUpperCase() !== 'ALL') query = query.eq('payment_mode', String(paymentMode));

          const { data, error } = await query;
          if (error) return sendInternalError(res, error, 'Failed to fetch entries from database');

          let results = Array.isArray(data) ? data : [];

          if (staffName && String(staffName).toUpperCase() !== 'ALL') {
            const sName = String(staffName).toLowerCase();
            results = results.filter((e: any) => (e.staff_name || '').toLowerCase().includes(sName));
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
        } catch (err: any) {
          return sendInternalError(res, err, 'Failed to fetch DSR entries from database');
        }
      }

      // Persistent File DB Fallback (development only)
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({ error: 'Service Unavailable: Production database is not configured', statusCode: 503 });
      }

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

    if (errors.length > 0) return sendValidationError(res, errors);

    const payload = {
      customer_name: sanitizeInput(String(customerName).trim()),
      mobile_number: sanitizeInput(String(mobileNumber).trim()),
      visit_date: visitDate && isValidDateString(visitDate) ? visitDate : new Date().toISOString().split('T')[0],
      time_in: sanitizeInput(timeIn || '10:00'),
      therapy_name: sanitizeInput(String(therapyName).trim()),
      staff_name: sanitizeInput(String(staffName).trim()),
      amount: parsedAmount,
      payment_mode: sanitizeInput(pMode),
      remarks: remarks ? sanitizeInput(String(remarks).trim()) : '',
      created_by_user_id: user.id,
      created_by_name: sanitizeInput(user.name),
    };

    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        if (!supabase) return res.status(503).json({ error: 'Service Unavailable: Database client initialization failed', statusCode: 503 });

        const { data, error } = await supabase.from('dsr_entries').insert([payload]).select().single();
        if (error) return sendInternalError(res, error, 'Failed to create DSR entry in database');
        if (!data) return sendInternalError(res, new Error('No data returned after insert'), 'Failed to create DSR entry');

        // Mirror local file DB for development auditing (best-effort)
        try { db.createEntry(payload); } catch (e) {}
        return res.status(201).json(data);
      }

      if (process.env.NODE_ENV === 'production') return res.status(503).json({ error: 'Service Unavailable: Production database is not configured', statusCode: 503 });

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
    if (!entryId) return sendValidationError(res, 'Entry ID parameter (id) is required for updates');

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
    }
    if (amount !== undefined) {
      const parsedAmt = Number(amount);
      if (isNaN(parsedAmt) || parsedAmt < 0) return sendValidationError(res, 'Amount must be a non-negative number');
      updatePayload.amount = parsedAmt;
    }
    if (paymentMode !== undefined) updatePayload.payment_mode = String(paymentMode);
    if (remarks !== undefined) updatePayload.remarks = String(remarks).trim();

    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        if (!supabase) return res.status(503).json({ error: 'Service Unavailable: Database client initialization failed', statusCode: 503 });

        const { data, error } = await supabase
          .from('dsr_entries')
          .update(updatePayload)
          .eq('id', entryId)
          .select()
          .maybeSingle();

        if (error) return sendInternalError(res, error, 'Failed to update DSR entry in database');
        if (!data) return res.status(404).json({ error: 'Entry not found', statusCode: 404 });

        try { db.updateEntry(entryId, updatePayload); } catch (e) {}
        return res.status(200).json(data);
      }

      if (process.env.NODE_ENV === 'production') return res.status(503).json({ error: 'Service Unavailable: Production database is not configured', statusCode: 503 });

      const updated = db.updateEntry(entryId, updatePayload);
      if (!updated) return res.status(404).json({ error: 'Entry not found', statusCode: 404 });
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
    const customerMobile = req.query?.customerMobile || req.body?.customerMobile;
    const customerName = req.query?.customerName || req.body?.customerName;

    // Customer-level deletion: delete all DSR entries for a customer (by mobile or name)
    if (customerMobile || customerName) {
      // Only SUPER_ADMIN may delete customers
      const adminUser = await requireRole(req, res, ['SUPER_ADMIN']);
      if (!adminUser) return;

      try {
        if (isSupabaseConfigured()) {
          const supabase = getSupabaseClient();
          if (!supabase) return res.status(503).json({ error: 'Service Unavailable: Database client initialization failed', statusCode: 503 });

          let result: any;
          if (customerMobile) {
            result = await supabase.from('dsr_entries').delete().eq('mobile_number', String(customerMobile)).select();
          } else {
            result = await supabase.from('dsr_entries').delete().eq('customer_name', String(customerName).trim()).select();
          }

          const { data, error } = result || {};
          if (error) return sendInternalError(res, error, 'Failed to delete customer DSR entries in database');
          const deletedRows = Array.isArray(data) ? data.length : (data ? 1 : 0);
          if (deletedRows === 0) return res.status(404).json({ error: 'No DSR entries found for specified customer', statusCode: 404 });

          // Mirror removal in local file DB for development auditing (best-effort)
          try {
            if (customerMobile) {
              // delete entries with matching mobile
              const entriesToDelete = db.getEntries().filter(e => (e.mobile_number) === String(customerMobile));
              entriesToDelete.forEach(e => db.deleteEntry(e.id));
            } else {
              const normalized = String(customerName).trim();
              const entriesToDelete = db.getEntries().filter(e => (e.customer_name) === normalized);
              entriesToDelete.forEach(e => db.deleteEntry(e.id));
            }
          } catch (e) {}

          return res.status(200).json({ success: true, deletedCount: deletedRows, customerName: customerName || null, mobile: customerMobile || null });
        }

        // File DB fallback (development only)
        if (process.env.NODE_ENV === 'production') return res.status(503).json({ error: 'Service Unavailable: Production database is not configured', statusCode: 503 });

        let deletedCount = 0;
        if (customerMobile) {
          const entries = db.getEntries();
          const toDelete = entries.filter(e => e.mobile_number === String(customerMobile));
          deletedCount = toDelete.length;
          toDelete.forEach(e => db.deleteEntry(e.id));
        } else {
          const normalized = String(customerName).trim();
          const entries = db.getEntries();
          const toDelete = entries.filter(e => e.customer_name === normalized);
          deletedCount = toDelete.length;
          toDelete.forEach(e => db.deleteEntry(e.id));
        }

        if (deletedCount === 0) return res.status(404).json({ error: 'No DSR entries found for specified customer', statusCode: 404 });
        return res.status(200).json({ success: true, deletedCount, customerName: customerName || null, mobile: customerMobile || null });
      } catch (err: any) {
        return sendInternalError(res, err, 'Failed to delete customer DSR entries');
      }
    }

    // Single-entry deletion by id
    if (!entryId) return sendValidationError(res, 'Entry ID parameter (id) is required for deletion');

    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        if (!supabase) return res.status(503).json({ error: 'Service Unavailable: Database client initialization failed', statusCode: 503 });

        const { data, error } = await supabase.from('dsr_entries').delete().eq('id', entryId).select().maybeSingle();
        if (error) return sendInternalError(res, error, 'Failed to delete DSR entry in database');
        if (!data) return res.status(404).json({ error: 'Entry not found', statusCode: 404 });

        try { db.deleteEntry(entryId); } catch (e) {}

        return res.status(200).json({ success: true, message: `DSR entry #${entryId} deleted successfully`, deletedId: entryId });
      }

      if (process.env.NODE_ENV === 'production') return res.status(503).json({ error: 'Service Unavailable: Production database is not configured', statusCode: 503 });

      const deleted = db.deleteEntry(entryId);
      if (!deleted) return res.status(404).json({ error: 'Entry not found', statusCode: 404 });

      return res.status(200).json({ success: true, message: `DSR entry #${entryId} deleted successfully`, deletedId: entryId });
    } catch (err: any) {
      return sendInternalError(res, err, 'Failed to delete DSR entry');
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed', statusCode: 405 });
}
