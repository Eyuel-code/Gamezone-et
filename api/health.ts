import type { ServerlessRequest, ServerlessResponse } from './_lib/vercelHttp.js';

export default function handler(_req: ServerlessRequest, res: ServerlessResponse) {
  res.status(200).json({
    ok: true,
    service: 'gamezoneet-vercel-api',
    environment: 'production',
    posture: 'normal',
    timestamp: new Date().toISOString(),
  });
}
