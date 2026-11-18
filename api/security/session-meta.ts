import crypto from 'node:crypto';
import { getClientIpFromHeaders, maskIp, type ServerlessRequest, type ServerlessResponse } from '../_lib/vercelHttp.js';

export default function handler(req: ServerlessRequest, res: ServerlessResponse) {
  const ip = getClientIpFromHeaders(req);
  const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
  const userAgent = String(req.headers['user-agent'] || 'web');
  res.status(200).json({
    ipMasked: maskIp(ip),
    ipHash,
    userAgentHash: crypto.createHash('sha256').update(userAgent).digest('hex').slice(0, 12),
    serverTimeIso: new Date().toISOString(),
  });
}
