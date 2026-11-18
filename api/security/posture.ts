import { parseJsonBody, type ServerlessRequest, type ServerlessResponse } from '../../server/vercelHttp';

export default function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const body = parseJsonBody(req);
  const nextPosture = body.posture;
  if (nextPosture === 'normal' || nextPosture === 'elevated' || nextPosture === 'lockdown') {
    res.status(200).json({ ok: true, posture: nextPosture });
    return;
  }
  res.status(400).json({ error: 'Invalid security posture.' });
}
