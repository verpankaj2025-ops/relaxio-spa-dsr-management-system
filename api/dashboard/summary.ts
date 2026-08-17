import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { isValidDateString, sendValidationError, sendInternalError } from '../middleware/validate.js';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed', statusCode: 405 });

  const user = await requireAuth(req, res);
  if (!user) return;

  const targetDate = req.query?.date ? String(req.query.date) : new Date().toISOString().split('T')[0];
  if (req.query?.date && !isValidDateString(targetDate)) return sendValidationError(res, 'Invalid date query parameter format (expected YYYY-MM-DD)');

  try {
    if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (!supabase) return res.status(503).json({ error: 'Service Unavailable: Database client initialization failed', statusCode: 503 });

      const { data, error } = await supabase
        .from('dsr_entries')
        .select('*')
        .eq('visit_date', targetDate);

      if (error) return sendInternalError(res, error, 'Failed to fetch DSR entries for dashboard');

      const rows = Array.isArray(data) ? data : [];

      let todaysRevenue = 0;
      let todaysCustomers = rows.length;
      let cashCollection = 0;
      let upiCollection = 0;
      let cardCollection = 0;
      let mixedCollection = 0;

      rows.forEach((e: any) => {
        const amt = Number(e.amount || 0);
        todaysRevenue += amt;
        const mode = (e.payment_mode || '').toUpperCase();
        if (mode === 'CASH') cashCollection += amt;
        else if (mode === 'UPI') upiCollection += amt;
        else if (mode === 'CARD') cardCollection += amt;
        else mixedCollection += amt;
      });

      return res.status(200).json({ date: targetDate, todaysRevenue, todaysCustomers, cashCollection, upiCollection, cardCollection, mixedCollection });
    }

    // Fallback to local DB only in non-production when Supabase is not configured
    if (process.env.NODE_ENV === 'production') return res.status(503).json({ error: 'Service Unavailable: Production database is not configured', statusCode: 503 });

    const summary = db.getDashboardSummary(targetDate);
    return res.status(200).json(summary);
  } catch (err: any) {
    return sendInternalError(res, err, 'Error fetching dashboard summary');
  }
}
