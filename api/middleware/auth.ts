import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { db } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('Fatal: JWT_SECRET environment variable is not set. Aborting startup.');
  // Fail fast during module load to prevent the server from running without a secret
  throw new Error('JWT_SECRET environment variable is required');
}
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

export interface AuthUser {
  id: number | string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  status: 'ACTIVE' | 'DISABLED';
}

/**
 * Extracts and cryptographically verifies the JWT authentication token from request headers.
 */
export async function getAuthUser(req: any): Promise<AuthUser | null> {

  console.log("GETAUTH STEP 1");

  const authHeader = req.headers['authorization'] || req.headers['x-auth-token'] || '';
  const rawToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : String(authHeader).trim();

    console.log("GETAUTH STEP 2 Token:", rawToken.substring(0,20));

  if (!rawToken) {
    return null;
  }

  // 1. Verify standard JWT signature only (no legacy fallbacks)
  try {

    console.log("GETAUTH STEP 3 Before Verify");

    const decoded = jwt.verify(rawToken, JWT_SECRET) as any;

    console.log("GETAUTH STEP 4 After Verify", decoded);

    if (decoded && decoded.id && decoded.email) {
      // Confirm user status in database (do not leak password_hash)

      console.log("GETAUTH STEP 5 Looking in DB");

      const userInDb = db.getUsers().find(u => u.id === decoded.id || u.email.toLowerCase() === decoded.email.toLowerCase());

      console.log("GETAUTH STEP 6 Found:", userInDb);

      if (userInDb) {
        return {
          id: userInDb.id,
          name: userInDb.name,
          email: userInDb.email,
          role: userInDb.role,
          status: userInDb.status,
        };
      }
      return {
        id: decoded.id,
        name: decoded.name || 'Authenticated User',
        email: decoded.email,
        role: decoded.role || 'ADMIN',
        status: decoded.status || 'ACTIVE',
      };
    }
  } catch (e) {
    // verification failed — return null below
  }

  // JWT already verified successfully.
// Do NOT perform an additional Supabase lookup here.

  return null;
}

/**
 * Enforces authentication requirement on protected routes.
 */
export async function requireAuth(req: any, res: any): Promise<AuthUser | null> {

  console.log("AUTH STEP 1");
  const user = await getAuthUser(req);
  console.log("AUTH STEP 2", user);

  if (!user) {
    res.status(401).json({
      error: 'Unauthorized: Authentication token is missing, expired, or invalid',
      statusCode: 401,
    });
    return null;
  }
  if (user.status !== 'ACTIVE') {
    res.status(403).json({
      error: 'Forbidden: User account is disabled or inactive',
      statusCode: 403,
    });
    return null;
  }
  return user;
}

/**
 * Enforces role-based permissions on administrative routes.
 */
export async function requireRole(
  req: any,
  res: any,
  allowedRoles: Array<'SUPER_ADMIN' | 'ADMIN'>
): Promise<AuthUser | null> {
  const user = await requireAuth(req, res);
  if (!user) return null;

  if (!allowedRoles.includes(user.role)) {
    res.status(403).json({
      error: `Forbidden: Requires one of the following roles: ${allowedRoles.join(', ')}`,
      statusCode: 403,
    });
    return null;
  }

  return user;
}

