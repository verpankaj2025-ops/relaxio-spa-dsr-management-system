import { db } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { sanitizeInput, sendInternalError } from '../middleware/validate.js';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase.js';

export default async function handler(req: any, res: any) {
  const user = await requireAuth(req, res);
  if (!user) return;

  // ---------------------------------------------------------
  // GET: Read settings
  // ---------------------------------------------------------
  if (req.method === 'GET') {
    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        if (!supabase) return res.status(503).json({ error: 'Service Unavailable: Database client initialization failed', statusCode: 503 });

        const { data, error } = await supabase.from('settings').select('*');
        if (error) return sendInternalError(res, error, 'Failed to retrieve settings from database');

        if (data && data.length > 0) {
          const result: Record<string, string> = {};
          data.forEach((item: any) => {
            if (item.key && item.value !== undefined) {
              result[item.key] = item.value;
            }
          });
          return res.status(200).json(result);
        }

        // Supabase returned zero rows — return empty/default settings (do not fall back to file DB in production)
        return res.status(200).json({});
      }

      return res.status(200).json(db.getSettings());
    } catch (err: any) {
      return sendInternalError(res, err, 'Failed to retrieve settings');
    }
  }

  // Updating settings requires SUPER_ADMIN role
  const adminUser = await requireRole(req, res, ['SUPER_ADMIN']);
  if (!adminUser) return;

  // ---------------------------------------------------------
  // POST / PUT: Update settings
  // ---------------------------------------------------------
  if (req.method === 'POST' || req.method === 'PUT') {
    const settingsObj = req.body || {};
    if (Object.keys(settingsObj).length === 0) {
      return res.status(400).json({ error: 'Settings payload cannot be empty', statusCode: 400 });
    }

    const sanitizedObj: Record<string, string> = {};
    Object.entries(settingsObj).forEach(([k, v]) => {
      sanitizedObj[sanitizeInput(k)] = sanitizeInput(String(v));
    });

    try {
      if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        if (!supabase) return res.status(503).json({ error: 'Service Unavailable: Database client initialization failed', statusCode: 503 });

        const rows = Object.entries(sanitizedObj).map(([key, value]) => ({ key, value: String(value) }));
        const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' });
        if (error) return sendInternalError(res, error, 'Failed to upsert settings into database');

        // Return the sanitized settings object as the source of truth
        return res.status(200).json(sanitizedObj);
      }

      const updatedSettings = db.updateSettings(sanitizedObj);
      return res.status(200).json(updatedSettings);
    } catch (err: any) {
      return sendInternalError(res, err, 'Failed to update settings');
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed', statusCode: 405 });
}
