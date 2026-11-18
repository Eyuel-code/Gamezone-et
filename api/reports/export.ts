import { parseJsonBody, type ServerlessRequest, type ServerlessResponse } from '../../server/vercelHttp';

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const body = parseJsonBody(req);
  const format = body.format === 'json' ? 'json' : 'csv';
  const reportType = String(body.reportType || 'summary');
  const orders = Array.isArray(body.orders) ? body.orders : [];
  const tickets = Array.isArray(body.tickets) ? body.tickets : [];
  const disputes = Array.isArray(body.disputes) ? body.disputes : [];
  const users = Array.isArray(body.users) ? body.users : [];

  const successfulOrders = orders.filter((o: any) => o.paymentStatus === 'success');
  const totalRevenueETB = successfulOrders.reduce(
    (sum: number, o: any) => sum + (Number(o.amountETB) || 0),
    0
  );
  const telebirrTotalETB = successfulOrders
    .filter((o: any) => o.paymentMethod === 'telebirr')
    .reduce((sum: number, o: any) => sum + (Number(o.amountETB) || 0), 0);
  const cbeTotalETB = successfulOrders
    .filter((o: any) => o.paymentMethod === 'cbe')
    .reduce((sum: number, o: any) => sum + (Number(o.amountETB) || 0), 0);

  const summary = {
    generatedAt: new Date().toISOString(),
    reportType,
    metrics: {
      totalUsers: users.length,
      totalOrders: orders.length,
      successfulOrders: successfulOrders.length,
      totalRevenueETB,
      telebirrTotalETB,
      cbeTotalETB,
      openTickets: tickets.filter((t: any) => t.status !== 'resolved').length,
      resolvedTickets: tickets.filter((t: any) => t.status === 'resolved').length,
      openDisputes: disputes.filter((d: any) => d.status === 'open').length,
    },
  };

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="gamezoneet-${reportType}-report.json"`
    );
    res.status(200).send(JSON.stringify({ ...summary, orders, tickets, disputes }, null, 2));
    return;
  }

  const lines: string[] = [];
  if (reportType === 'tickets') {
    lines.push('Ticket ID,Category,User,Email,Subject,Status,Created At,Admin Notes');
    for (const t of tickets) {
      lines.push(
        [t.id, t.category, t.userName, t.email, t.subject, t.status, t.createdAt, t.adminNotes]
          .map(escapeCsvCell)
          .join(',')
      );
    }
  } else if (reportType === 'disputes') {
    lines.push('Dispute ID,Tournament ID,Match ID,Reported By,Reason,Status,Created At,Admin Notes');
    for (const d of disputes) {
      lines.push(
        [d.id, d.tournamentId, d.matchId, d.reportedBy, d.reason, d.status, d.createdAt, d.adminNotes]
          .map(escapeCsvCell)
          .join(',')
      );
    }
  } else {
    lines.push(
      'Order ID,Customer Name,Player ID,Game,Package,Amount (ETB),Method,Payment Status,Delivery Status,Receipt Ref,Date'
    );
    for (const o of orders) {
      lines.push(
        [
          o.id,
          o.customerName,
          o.playerId,
          o.gameName,
          o.productName,
          o.amountETB,
          String(o.paymentMethod || '').toUpperCase(),
          o.paymentStatus,
          o.deliveryStatus,
          o.receiptRef,
          o.createdAt,
        ]
          .map(escapeCsvCell)
          .join(',')
      );
    }
    lines.push('');
    lines.push('Summary Metric,Value');
    lines.push(`Total Revenue (ETB),${totalRevenueETB}`);
    lines.push(`Telebirr Volume (ETB),${telebirrTotalETB}`);
    lines.push(`CBE Birr Volume (ETB),${cbeTotalETB}`);
    lines.push(`Open Support Reports,${summary.metrics.openTickets}`);
    lines.push(`Open Match Disputes,${summary.metrics.openDisputes}`);
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="gamezoneet-${reportType}-report.csv"`
  );
  res.status(200).send(lines.join('\n'));
}
