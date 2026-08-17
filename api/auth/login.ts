import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import { db } from '../db.js';
import { isValidEmail, isNonEmptyString, sendValidationError, sendInternalError } from '../middleware/validate.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('Fatal: JWT_SECRET environment variable is not set. Aborting startup.');
  throw new Error('JWT_SECRET environment variable is required');
}
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed', statusCode: 405 });
  }

  const { email, password } = req.body || {};
  const validationErrors: string[] = [];

  if (!isNonEmptyString(email)) {
    validationErrors.push('Email is required');
  } else if (!isValidEmail(email)) {
    validationErrors.push('Invalid email format');
  }

  if (!isNonEmptyString(password)) {
    validationErrors.push('Password is required');
  }

  if (validationErrors.length > 0) {
    return sendValidationError(res, validationErrors);
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    // 1. Check persistent database users
    const dbUser = db.getUserByEmail(normalizedEmail);
    if (dbUser) {
      if (dbUser.status !== 'ACTIVE') {
        return res.status(403).json({
          error: 'User account is inactive or disabled. Contact administrator.',
          statusCode: 403,
        });
      }

      // Verify password — require valid bcrypt hash comparison
      if (dbUser.password_hash && dbUser.password_hash.startsWith('$2a$')) {
        const isValid = await bcrypt.compare(String(password), dbUser.password_hash).catch(() => false);
        if (!isValid) {
          return res.status(401).json({ error: 'Invalid credentials provided', statusCode: 401 });
        }
      } else {
        // Missing or invalid stored hash
        return res.status(401).json({ error: 'Invalid credentials provided', statusCode: 401 });
      }

      // Mint signed JWT token
      const token = jwt.sign(
        {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
          status: dbUser.status,
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.status(200).json({
        token,
        user: {
          id: dbUser.id,
          name: dbUser.name,
          email: dbUser.email,
          role: dbUser.role,
          status: dbUser.status,
          createdAt: dbUser.created_at,
        },
      });
    }

    // 2. Attempt Supabase lookup if configured
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', normalizedEmail)
        .single();

      if (!error && data) {
        if (data.status !== 'ACTIVE') {
          return res.status(403).json({
            error: 'User account is inactive or disabled. Contact administrator.',
            statusCode: 403,
          });
        }

        const token = jwt.sign(
          {
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role,
            status: data.status,
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        return res.status(200).json({
          token,
          user: {
            id: data.id,
            name: data.name,
            email: data.email,
            role: data.role,
            status: data.status,
            createdAt: data.created_at,
          },
        });
      }
    }

    return res.status(401).json({
      error: 'Invalid email or password credentials provided',
      statusCode: 401,
    });
  } catch (err: any) {
    return sendInternalError(res, err, 'Authentication Failure');
  }
}

