import { getClientIpFromHeaders, maskIp, type ServerlessRequest, type ServerlessResponse } from '../../server/vercelHttp';

export default function handler(req: ServerlessRequest, res: ServerlessResponse) {
  const ip = getClientIpFromHeaders(req);
  res.status(200).json({
    ok: true,
    posture: 'normal',
    totalApiRequests: 1,
    inspectedRequests: 1,
    blockedApiRequests: 0,
    blockedRequests: 0,
    activeBuckets: 1,
    windowMs: 60_000,
    ipMasked: maskIp(ip),
    recentBlockedEvents: [],
    timestamp: new Date().toISOString(),
  });
}
