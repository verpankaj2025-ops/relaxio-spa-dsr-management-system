import { requireAuth } from '../middleware/auth.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed', statusCode: 405 });
  }

  const user = await requireAuth(req, res);
  if (!user) return;

  return res.status(200).json({
    authenticated: true,
    user,
    timestamp: new Date().toISOString(),
  });
}
