import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { sendInternalError } from './api/middleware/validate.js';

import healthHandler from './api/health.js';
import loginHandler from './api/auth/login.js';
import meHandler from './api/auth/me.js';
import dashboardSummaryHandler from './api/dashboard/summary.js';
import entriesHandler from './api/entries/index.js';
import settingsHandler from './api/settings/index.js';
import usersHandler from './api/users/index.js';
import notFoundHandler from './api/[...path].js';

const PORT = 3000;

// Ensure critical secrets are provided in environment for production safety
const requiredEnvs = ['JWT_SECRET', 'DEFAULT_ADMIN_PASSWORD', 'DEFAULT_MANAGER_PASSWORD'];
const missing = requiredEnvs.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error('Fatal: Missing required environment variables:', missing.join(', '));
  process.exit(1);
}

// If running in production, ensure ALLOWED_ORIGINS is specified
if (process.env.NODE_ENV === 'production' && !process.env.ALLOWED_ORIGINS) {
  console.error('Fatal: ALLOWED_ORIGINS must be set in production to restrict CORS');
  process.exit(1);
}

// Supabase envs must be provided as pairs when used
if ((process.env.SUPABASE_URL && !process.env.SUPABASE_ANON_KEY) || (!process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)) {
  console.error('Fatal: SUPABASE_URL and SUPABASE_ANON_KEY must be provided together or not at all');
  process.exit(1);
}
if ((process.env.VITE_SUPABASE_URL && !process.env.VITE_SUPABASE_ANON_KEY) || (!process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY)) {
  console.error('Fatal: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be provided together or not at all');
  process.exit(1);
}

// Rate limiting state
const requestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 120; // 120 requests/min

async function startServer() {
  const app = express();

  // 1. Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Content Security Policy - conservative default
    res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline'; img-src * data:; style-src 'self' 'unsafe-inline'; script-src 'self'");
    // Permissions-Policy: restrict powerful features
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // CORS headers - allow specific origins in production
    const allowed = process.env.ALLOWED_ORIGINS || '';
    if (process.env.NODE_ENV === 'production') {
      if (allowed) {
        res.setHeader('Access-Control-Allow-Origin', allowed.split(',')[0].trim());
      }
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  // 2. Simple Rate Limiting Middleware
  app.use((req, res, next) => {
    if (!req.path.startsWith('/api/')) return next();

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const ipKey = Array.isArray(clientIp) ? clientIp[0] : String(clientIp);
    const now = Date.now();

    const record = requestCounts.get(ipKey);
    if (!record || now > record.resetTime) {
      requestCounts.set(ipKey, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
      return next();
    }

    record.count++;
    if (record.count > MAX_REQUESTS_PER_WINDOW) {
      return res.status(429).json({
        error: 'Too Many Requests',
        details: 'Rate limit exceeded. Please try again after 1 minute.',
        statusCode: 429,
      });
    }

    next();
  });

  app.use(express.json({ limit: '2mb' }));

  // Production logging: simple file + console logger
  if (process.env.NODE_ENV === 'production') {
    const logsDir = path.join(process.cwd(), 'logs');
    try { fs.mkdirSync(logsDir, { recursive: true }); } catch (e) {}
    const appLog = path.join(process.cwd(), 'logs', 'app.log');
    const errorLog = path.join(process.cwd(), 'logs', 'error.log');
    app.use((req, res, next) => {
      const start = Date.now();
      // Attach or generate a request id
      const requestId = (req.headers['x-request-id'] as string) || (globalThis.crypto && (globalThis.crypto as any).randomUUID ? (globalThis.crypto as any).randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2,8)}`);
      res.setHeader('X-Request-Id', requestId);
      res.on('finish', () => {
        const duration = Date.now() - start;
        const entry = `${new Date().toISOString()} [${requestId}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms\n`;
        try { fs.appendFileSync(appLog, entry); } catch (e) { console.error('Failed to write app log', e); }
        console.log(entry.trim());
      });
      next();
    });
  }

  // Serve static files from public directory
  app.use(express.static(path.join(process.cwd(), 'public')));

  // API Routes Registration
  app.all('/api/health', healthHandler);
  app.all('/api/auth/login', loginHandler);
  app.all('/api/auth/me', meHandler);
  app.all('/api/dashboard/summary', dashboardSummaryHandler);
  app.all('/api/entries', entriesHandler);
  app.all('/api/settings', settingsHandler);
  app.all('/api/users', usersHandler);
  app.all('/api/*', notFoundHandler);

  // Vite middleware for local development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global error handler (sanitized)
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Unhandled error in request pipeline:', err && err.stack ? err.stack : err);
    return sendInternalError(res, err, 'Internal Server Error');
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

// Process-level handlers to crash safely and log
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  try { fs.appendFileSync(path.join(process.cwd(),'logs','error.log'), `${new Date().toISOString()} ${String(err.stack||err)}\n`); } catch(e){}
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  try { fs.appendFileSync(path.join(process.cwd(),'logs','error.log'), `${new Date().toISOString()} ${String(reason)}\n`); } catch(e){}
});

startServer();

