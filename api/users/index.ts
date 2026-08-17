import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { db } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  isNonEmptyString,
  isValidEmail,
  sanitizeInput,
  sendValidationError,
  sendInternalError,
} from '../middleware/validate.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

export default async function handler(req: any, res: any) {

  console.log("STEP 1 - Handler Started");

  const user = await requireAuth(req, res);

  console.log("STEP 2 - Auth Result:", user);

  if (!user) return;

  const supabase = null;

  console.log("SUPABASE ENABLED:", !!supabase);

  // ---------------------------------------------------------
// GET: List users
// ---------------------------------------------------------
if (req.method === 'GET') {
  console.log("USERS API TEST");

  return res.status(200).json(db.getUsers());
}

  // Administrative operations require SUPER_ADMIN role
  const adminUser = await requireRole(req, res, ['SUPER_ADMIN']);
  if (!adminUser) return;

  // ---------------------------------------------------------
  // POST: Create User
  // ---------------------------------------------------------
  if (req.method === 'POST') {
    const { name, email, role, status } = req.body || {};

    const errors: string[] = [];
    if (!isNonEmptyString(name)) errors.push('User name is required');
    if (!isValidEmail(email)) errors.push('Valid email address is required');

    const validRoles = ['SUPER_ADMIN', 'ADMIN'];
    const userRole = isNonEmptyString(role) && validRoles.includes(role.toUpperCase()) ? role.toUpperCase() : 'ADMIN';

    const validStatuses = ['ACTIVE', 'DISABLED'];
    const userStatus = isNonEmptyString(status) && validStatuses.includes(status.toUpperCase()) ? status.toUpperCase() : 'ACTIVE';

    if (errors.length > 0) {
      return sendValidationError(res, errors);
    }

    // Accept either a plaintext `password` or a `password_hash` (bcrypt) in the request.
    const rawPassword = (req.body && req.body.password) || undefined;
    const providedHash = (req.body && req.body.password_hash) || undefined;

    let password_hash: string | undefined = undefined;
    if (isNonEmptyString(rawPassword)) {
      // Hash server-side using bcrypt
      password_hash = bcrypt.hashSync(String(rawPassword), 10);
    } else if (isNonEmptyString(providedHash)) {
      password_hash = String(providedHash).trim();
    }

    if (!password_hash) {
      return sendValidationError(res, 'A password or password_hash (bcrypt) is required to create a user');
    }

    const payload = {
      name: sanitizeInput(String(name).trim()),
      email: sanitizeInput(String(email).trim().toLowerCase()),
      password_hash,
      role: userRole as 'SUPER_ADMIN' | 'ADMIN',
      status: userStatus as 'ACTIVE' | 'DISABLED',
    };

    try {
      if (supabase) {
        try {
          const { data, error } = await supabase.from('users').insert([payload]).select('id, name, email, role, status, created_at').single();
          if (!error && data) {
            db.createUser(payload);
            // Do not expose password_hash in API responses
            const safe = { id: data.id, name: data.name, email: data.email, role: data.role, status: data.status, created_at: data.created_at };
            return res.status(201).json(safe);
          }
        } catch (_) {}
      }

      const newUser = db.createUser(payload);
      // Sanitize response
      const safeUser = { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, status: newUser.status, created_at: newUser.created_at };
      return res.status(201).json(safeUser);
    } catch (err: any) {
      return sendInternalError(res, err, 'Failed to create user');
    }
  }

  // ---------------------------------------------------------
  // PUT / PATCH: Update User Status or Info
  // ---------------------------------------------------------
  if (req.method === 'PUT' || req.method === 'PATCH') {
    const targetUserId = req.query?.id || req.body?.id;
    if (!targetUserId) {
      return sendValidationError(res, 'User ID parameter (id) is required');
    }

    const { status, role, name, email } = req.body || {};
    const updates: any = {};

    if (status !== undefined) {
      if (!['ACTIVE', 'DISABLED'].includes(String(status).toUpperCase())) {
        return sendValidationError(res, 'Status must be ACTIVE or DISABLED');
      }
      updates.status = String(status).toUpperCase();
    }

    if (role !== undefined) {
      if (!['SUPER_ADMIN', 'ADMIN'].includes(String(role).toUpperCase())) {
        return sendValidationError(res, 'Role must be SUPER_ADMIN or ADMIN');
      }
      updates.role = String(role).toUpperCase();
    }

    if (name !== undefined && isNonEmptyString(name)) {
      updates.name = String(name).trim();
    }

    if (email !== undefined) {
      if (!isValidEmail(email)) return sendValidationError(res, 'Invalid email format');
      updates.email = String(email).trim().toLowerCase();
    }

    try {
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', targetUserId)
            .select('id, name, email, role, status, created_at')
            .maybeSingle();

          if (!error && data) {
            db.updateUser(targetUserId, updates);
            return res.status(200).json(data);
          }
        } catch (_) {}
      }

      const updatedUser = db.updateUser(targetUserId, updates);
      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found', statusCode: 404 });
      }

      const safe = { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, role: updatedUser.role, status: updatedUser.status, created_at: updatedUser.created_at };
      return res.status(200).json(safe);
    } catch (err: any) {
      return sendInternalError(res, err, 'Failed to update user');
    }
  }

  // ---------------------------------------------------------
  // DELETE: Remove User
  // ---------------------------------------------------------
  if (req.method === 'DELETE') {
    const targetUserId = req.query?.id || req.body?.id;
    if (!targetUserId) {
      return sendValidationError(res, 'User ID parameter (id) is required');
    }

    if (String(targetUserId) === '1' || String(targetUserId) === String(user.id)) {
      return res.status(400).json({
        error: 'Deletion Safeguard: Cannot delete primary Super Admin or currently logged in account',
        statusCode: 400,
      });
    }

    try {
      if (supabase) {
        try {
          await supabase.from('users').delete().eq('id', targetUserId);
        } catch (_) {}
      }

      db.deleteUser(targetUserId);

      return res.status(200).json({
        success: true,
        message: `User #${targetUserId} removed successfully`,
        deletedId: targetUserId,
      });
    } catch (err: any) {
      return sendInternalError(res, err, 'Failed to delete user');
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed', statusCode: 405 });
}
