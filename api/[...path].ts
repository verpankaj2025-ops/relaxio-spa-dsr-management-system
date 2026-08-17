export default async function handler(req: any, res: any) {
  return res.status(404).json({
    error: 'API Route Not Found',
    path: req.originalUrl || req.url,
    statusCode: 404,
  });
}
