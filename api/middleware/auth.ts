import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase.js';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('Fatal: JWT_SECRET environment variable is not set. Aborting startup.');
  throw new Error('JWT_SECRET environment variable is required');
}

export interface AuthUser {
  id: number | string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN';
  status: 'ACTIVE' | 'DISABLED';
}

/**
 * Extract and cryptographically verify the JWT authentication token.
 * When Supabase is configured, resolve the user against Supabase to ensure
 * current role/status are authoritative. Fall back to local file DB only in
 * non-production when Supabase is not configured.
 */
export async function getAuthUser(req: any): Promise<AuthUser | null> {
  const authHeader = req.headers['authorization'] || req.headers['x-auth-token'] || '';
  const rawToken = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : String(authHeader).trim();

  if (!rawToken) return null;

  let decoded: any;
  try {
    decoded = jwt.verify(rawToken, JWT_SECRET) as any;
  } catch (e) {
    return null;
  }

  if (!decoded?.id || !decoded?.email) return null;
  const decodedId = decoded.id;
  const decodedEmail = String(decoded.email).trim().toLowerCase();

  // If Supabase is configured, prefer the canonical user from Supabase
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client initialization failed');

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`id.eq.${decodedId},email.eq.${decodedEmail}`)
      .maybeSingle();

    if (error) {
      // Propagate error to caller so the middleware can return 503 in production
      throw error;
    }

    if (!data) return null;
    if (data.status !== 'ACTIVE') return null;

    return {
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role as 'SUPER_ADMIN' | 'ADMIN',
      status: data.status as 'ACTIVE' | 'DISABLED',
    };
  }

  // Fallback to local DB for development when Supabase is not configured
  const userInDb = db.getUsers().find(u => String(u.id) === String(decodedId) || u.email.toLowerCase() === decodedEmail);
  if (!userInDb) return null;
  return {
    id: userInDb.id,
    name: userInDb.name,
    email: userInDb.email,
    role: userInDb.role,
    status: userInDb.status,
  };
}

/**
 * Require a valid authenticated user.
 */
export async function requireAuth(req: any, res: any): Promise<AuthUser | null> {
  // In production the Supabase datasource must be configured.
  if (process.env.NODE_ENV === 'production' && !isSupabaseConfigured()) {
    res.status(503).json({ error: 'Service Unavailable: Production database is not configured', statusCode: 503 });
    return null;
  }

  try {
    const user = await getAuthUser(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized: Authentication token is missing, expired, or invalid', statusCode: 401 });
      return null;
    }

    if (user.status !== 'ACTIVE') {
      res.status(403).json({ error: 'Forbidden: User account is disabled or inactive', statusCode: 403 });
      return null;
    }

    return user;
  } catch (err: any) {
    // Database or network error when checking Supabase
    console.error('Authentication error:', err && err.message ? err.message : err);
    res.status(503).json({ error: 'Service Unavailable: Authentication database error', statusCode: 503 });
    return null;
  }
}

/**
 * Require authentication plus one of the specified roles.
 */
export async function requireRole(
  req: any,
  res: any,
  allowedRoles: Array<'SUPER_ADMIN' | 'ADMIN'>
): Promise<AuthUser | null> {
  const user = await requireAuth(req, res);
  if (!user) return null;

  if (!allowedRoles.includes(user.role)) {
    res.status(403).json({ error: `Forbidden: Requires one of the following roles: ${allowedRoles.join(', ')}`, statusCode: 403 });
    return null;
  }

  return user;
}
