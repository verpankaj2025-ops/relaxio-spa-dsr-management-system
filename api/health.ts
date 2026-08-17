export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed', statusCode: 405 });
  }
  const pkg = {} as any;
  try {
  const { promises: fs } = await import('fs');

  const packageJson = await fs.readFile(
    new URL('../package.json', import.meta.url),
    'utf8'
  );

  Object.assign(pkg, JSON.parse(packageJson));
} catch (_) {}

  const nodeVersion = process.version;
  const environment = process.env.NODE_ENV || 'development';

  // Determine database type
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '';
  const dataFile = 'data/spa_database.json';
  let databaseType = 'file';
  let databaseConnected = false;

  if (supabaseUrl && supabaseKey) {
    databaseType = 'supabase';
    // We cannot perform network call here; assume connected if envs present
    databaseConnected = true;
  } else {
    try {
      const { promises: fs } = await import('fs');
      const stat = await fs.stat(dataFile).catch(() => null);
      databaseConnected = !!stat;
    } catch (_) {
      databaseConnected = false;
    }
  }

  return res.status(200).json({
    status: 'healthy',
    service: pkg.name || 'The Cloud Spa DSR API',
    version: pkg.version || '1.0.0',
    uptime: Math.floor(process.uptime()),
    database: databaseType,
    databaseType,
    databaseConnected,
    storage: databaseType === 'file' ? dataFile : supabaseUrl,
    environment,
    nodeVersion,
    timestamp: new Date().toISOString(),
  });
}
