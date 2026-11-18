import { parseJsonBody, type ServerlessRequest, type ServerlessResponse } from '../_lib/vercelHttp.js';

function formatEATDate(date = new Date()): string {
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} EAT`;
}

export default function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const body = parseJsonBody(req);
  const orderRef = String(body.orderRef || '').trim();
  const outcome =
    body.outcome === 'failed' || body.outcome === 'pending' ? body.outcome : 'success';

  if (!orderRef) {
    res.status(400).json({ error: 'Missing orderRef for payment verification.' });
    return;
  }

  const provider = orderRef.startsWith('TB') ? 'telebirr' : 'cbe';
  const amountETB = Number(body.amountETB) || 650;
  const paidAt = formatEATDate();
  const providerDisplayName =
    provider === 'telebirr'
      ? 'Telebirr (Ethio Telecom)'
      : 'CBE Birr (Commercial Bank of Ethiopia)';

  if (outcome === 'failed') {
    res.status(200).json({
      success: false,
      status: 'failed',
      transactionRef: orderRef,
      receiptNumber: `FAIL-${orderRef}`,
      paidAt,
      provider,
      providerDisplayName,
      amountETB,
      message: 'Payment declined: Insufficient balance or USSD prompt cancelled.',
    });
    return;
  }

  if (outcome === 'pending') {
    res.status(200).json({
      success: false,
      status: 'pending',
      transactionRef: orderRef,
      receiptNumber: `PND-${orderRef}`,
      paidAt,
      provider,
      providerDisplayName,
      amountETB,
      message: 'Payment pending confirmation: USSD push sent to mobile number.',
    });
    return;
  }

  res.status(200).json({
    success: true,
    status: 'success',
    transactionRef: orderRef,
    receiptNumber: `RCP-${orderRef}`,
    paidAt,
    provider,
    providerDisplayName,
    amountETB,
    message: 'Payment confirmed successfully.',
  });
}
