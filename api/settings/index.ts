import { createClient } from '@supabase/supabase-js';
import { db } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { sanitizeInput, sendInternalError } from '../middleware/validate.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

export default async function handler(req: any, res: any) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

  // ---------------------------------------------------------
  // GET: Read settings
  // ---------------------------------------------------------
  if (req.method === 'GET') {
    try {
      if (supabase) {
        try {
          const { data, error } = await supabase.from('settings').select('*');
          if (!error && data && data.length > 0) {
            const result: Record<string, string> = { ...db.getSettings() };
            data.forEach((item: any) => {
              if (item.key && item.value !== undefined) {
                result[item.key] = item.value;
              }
            });
            return res.status(200).json(result);
          }
        } catch (_) {}
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
      if (supabase) {
        try {
          const rows = Object.entries(sanitizedObj).map(([key, value]) => ({
            key,
            value: String(value),
          }));
          await supabase.from('settings').upsert(rows, { onConflict: 'key' });
        } catch (_) {}
      }

      const updatedSettings = db.updateSettings(sanitizedObj);
      return res.status(200).json(updatedSettings);
    } catch (err: any) {
      return sendInternalError(res, err, 'Failed to update settings');
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed', statusCode: 405 });
}

