import { parseJsonBody, type ServerlessRequest, type ServerlessResponse } from '../../server/vercelHttp';

export default function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const body = parseJsonBody(req);
  const provider = body.provider === 'cbe' ? 'cbe' : 'telebirr';
  const amountETB = Number(body.amountETB);
  const customerPhone = String(body.customerPhone || '').trim();
  const playerId = String(body.playerId || '').trim();

  if (!Number.isFinite(amountETB) || amountETB <= 0 || amountETB > 1000000) {
    res.status(400).json({ error: 'Invalid top-up amount in ETB.' });
    return;
  }
  if (customerPhone.length < 6) {
    res.status(400).json({ error: 'Valid Ethiopian mobile phone number is required.' });
    return;
  }
  if (!playerId) {
    res.status(400).json({ error: 'In-game Player ID is required.' });
    return;
  }

  const prefix = provider === 'telebirr' ? 'TB-ETB-2026' : 'CBE-BIRR-2026';
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  const orderRef = `${prefix}-${randomSuffix}`;

  res.status(200).json({
    orderRef,
    statusMessage:
      provider === 'telebirr'
        ? 'Connecting to Telebirr USSD / App Push gateway...'
        : 'Connecting to Commercial Bank of Ethiopia (CBE Birr) gateway...',
  });
}
