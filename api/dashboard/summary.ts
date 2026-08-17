import { createClient } from '@supabase/supabase-js';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { isValidDateString, sendValidationError, sendInternalError } from '../middleware/validate.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed', statusCode: 405 });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  const targetDate = req.query?.date ? String(req.query.date) : new Date().toISOString().split('T')[0];
  if (req.query?.date && !isValidDateString(targetDate)) {
    return sendValidationError(res, 'Invalid date query parameter format (expected YYYY-MM-DD)');
  }

  try {
    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabase
          .from('dsr_entries')
          .select('*')
          .eq('visit_date', targetDate);

        if (!error && data && data.length > 0) {
          let todaysRevenue = 0;
          let todaysCustomers = data.length;
          let cashCollection = 0;
          let upiCollection = 0;
          let cardCollection = 0;
          let mixedCollection = 0;

          data.forEach((e: any) => {
            const amt = Number(e.amount || 0);
            todaysRevenue += amt;
            const mode = (e.payment_mode || '').toUpperCase();
            if (mode === 'CASH') cashCollection += amt;
            else if (mode === 'UPI') upiCollection += amt;
            else if (mode === 'CARD') cardCollection += amt;
            else mixedCollection += amt;
          });

          return res.status(200).json({
            date: targetDate,
            todaysRevenue,
            todaysCustomers,
            cashCollection,
            upiCollection,
            cardCollection,
            mixedCollection,
          });
        }
      } catch (_) {}
    }

    // Persistent File Database
    const summary = db.getDashboardSummary(targetDate);
    return res.status(200).json(summary);
  } catch (err: any) {
    return sendInternalError(res, err, 'Error fetching dashboard summary');
  }
}
