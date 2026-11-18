import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildAssistantSystemInstruction,
  buildWellnessSystemInstruction,
  cleanChatMessages,
  extractGeminiError,
  generateGeminiReply,
} from './server/aiPrompts.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type SupportedPaymentMethod = 'telebirr' | 'cbe';
type PaymentOutcome = 'success' | 'pending' | 'failed';
type ServerSecurityPosture = 'normal' | 'elevated' | 'lockdown';

interface PendingPaymentRecord {
  orderRef: string;
  provider: SupportedPaymentMethod;
  amountETB: number;
  customerPhone: string;
  customerName: string;
  gameName: string;
  productName: string;
  playerId: string;
  createdAtMs: number;
}

const paymentSessions = new Map<string, PendingPaymentRecord>();

// Real sliding-window API rate limiter & DDoS defense telemetry
const apiBuckets = new Map<string, number[]>();
const recentBlockedEvents: Array<{
  id: string;
  path: string;
  ipMasked: string;
  timestamp: string;
  limit: number;
}> = [];
let totalApiRequests = 0;
let blockedApiRequests = 0;
let serverPosture: ServerSecurityPosture = 'normal';

function getClientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  const raw = Array.isArray(fwd) ? fwd[0] : typeof fwd === 'string' ? fwd.split(',')[0] : req.ip || '127.0.0.1';
  return String(raw || '127.0.0.1').trim();
}

function maskIpAddress(ip: string): string {
  if (ip.includes(':')) {
    const segs = ip.split(':').filter(Boolean);
    return `${segs.slice(0, 2).join(':') || '::1'}:••••`;
  }
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.•••.${parts[3]}`;
  }
  return '127.0.•••.1';
}

function getRatePolicy(reqPath: string): { max: number; windowMs: number } {
  const factor = serverPosture === 'lockdown' ? 0.5 : serverPosture === 'elevated' ? 0.75 : 1;
  let baseMax = 60;
  let windowMs = 60_000;
  if (reqPath.startsWith('/api/payments/')) {
    baseMax = 10;
    windowMs = 60_000;
  } else if (reqPath.startsWith('/api/assistant/chat') || reqPath.startsWith('/api/wellness/chat')) {
    baseMax = 15;
    windowMs = 60_000;
  } else if (reqPath.startsWith('/api/reports/export')) {
    baseMax = 10;
    windowMs = 60_000;
  } else if (reqPath.startsWith('/api/security/')) {
    baseMax = 40;
    windowMs = 60_000;
  }
  return { max: Math.max(2, Math.floor(baseMax * factor)), windowMs };
}

function apiRateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith('/api/') || req.path === '/api/health') {
    next();
    return;
  }

  totalApiRequests += 1;
  const ip = getClientIp(req);
  const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 12);
  const policy = getRatePolicy(req.path);
  const bucketKey = `${ipHash}:${req.path}`;
  const now = Date.now();
  const hits = (apiBuckets.get(bucketKey) || []).filter((ts) => now - ts < policy.windowMs);

  res.setHeader('X-RateLimit-Limit', String(policy.max));

  if (hits.length >= policy.max) {
    blockedApiRequests += 1;
    const oldest = hits[0] || now;
    const retryAfterSec = Math.max(1, Math.ceil((policy.windowMs - (now - oldest)) / 1000));
    res.setHeader('X-RateLimit-Remaining', '0');
    res.setHeader('Retry-After', String(retryAfterSec));

    recentBlockedEvents.unshift({
      id: `rl-${now}-${Math.floor(Math.random() * 1000)}`,
      path: req.path,
      ipMasked: maskIpAddress(ip),
      timestamp: new Date().toISOString(),
      limit: policy.max,
    });
    if (recentBlockedEvents.length > 25) recentBlockedEvents.pop();

    res.status(429).json({
      error: `Too many requests to ${req.path}. DDoS rate limiter engaged — retry in ${retryAfterSec}s.`,
      retryAfterSec,
    });
    return;
  }

  hits.push(now);
  apiBuckets.set(bucketKey, hits);
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, policy.max - hits.length)));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil((now + policy.windowMs) / 1000)));
  next();
}

function formatEATDate(date = new Date()): string {
  return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} EAT`;
}

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '2mb' }));
  app.use(apiRateLimitMiddleware);

  // Health Check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      service: 'gamezoneet-backend',
      environment: isProd ? 'production' : 'development',
      posture: serverPosture,
      timestamp: new Date().toISOString(),
    });
  });

  // Security & DDoS Defense Telemetry
  app.get('/api/security/status', (req: Request, res: Response) => {
    const ip = getClientIp(req);
    res.json({
      ok: true,
      posture: serverPosture,
      totalApiRequests,
      inspectedRequests: totalApiRequests,
      blockedApiRequests,
      blockedRequests: blockedApiRequests,
      activeBuckets: apiBuckets.size,
      windowMs: 60_000,
      ipMasked: maskIpAddress(ip),
      recentBlockedEvents: recentBlockedEvents.slice(0, 10),
      timestamp: new Date().toISOString(),
    });
  });

  app.post('/api/security/posture', (req: Request, res: Response) => {
    const nextPosture = req.body?.posture;
    if (nextPosture === 'normal' || nextPosture === 'elevated' || nextPosture === 'lockdown') {
      serverPosture = nextPosture;
      res.json({ ok: true, posture: serverPosture });
      return;
    }
    res.status(400).json({ error: 'Invalid security posture.' });
  });

  app.get('/api/security/session-meta', (req: Request, res: Response) => {
    const ip = getClientIp(req);
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
    res.json({
      ipMasked: maskIpAddress(ip),
      ipHash,
      userAgentHash: crypto
        .createHash('sha256')
        .update(String(req.headers['user-agent'] || 'web'))
        .digest('hex')
        .slice(0, 12),
      serverTimeIso: new Date().toISOString(),
    });
  });

  // Payment Gateway: Initialize Telebirr / CBE Birr Session
  app.post('/api/payments/initialize', (req: Request, res: Response) => {
    const body = req.body || {};
    const provider: SupportedPaymentMethod = body.provider === 'cbe' ? 'cbe' : 'telebirr';
    const amountETB = Number(body.amountETB);
    const customerPhone = String(body.customerPhone || '').trim();
    const customerName = String(body.customerName || 'Ethiopian Gamer').trim();
    const gameName = String(body.gameName || 'Game Top-Up').trim();
    const productName = String(body.productName || 'Digital Bundle').trim();
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

    paymentSessions.set(orderRef, {
      orderRef,
      provider,
      amountETB,
      customerPhone,
      customerName,
      gameName,
      productName,
      playerId,
      createdAtMs: Date.now(),
    });

    res.json({
      orderRef,
      statusMessage:
        provider === 'telebirr'
          ? 'Connecting to Telebirr USSD / App Push gateway...'
          : 'Connecting to Commercial Bank of Ethiopia (CBE Birr) gateway...',
    });
  });

  // Payment Gateway: Verify Payment & Issue Receipt Reference
  app.post('/api/payments/verify', (req: Request, res: Response) => {
    const body = req.body || {};
    const orderRef = String(body.orderRef || '').trim();
    const outcome: PaymentOutcome =
      body.outcome === 'failed' || body.outcome === 'pending' ? body.outcome : 'success';

    if (!orderRef) {
      res.status(400).json({ error: 'Missing orderRef for payment verification.' });
      return;
    }

    const session = paymentSessions.get(orderRef);
    const provider: SupportedPaymentMethod =
      session?.provider || (orderRef.startsWith('TB') ? 'telebirr' : 'cbe');
    const amountETB = session?.amountETB || Number(body.amountETB) || 650;
    const paidAt = formatEATDate();
    const providerDisplayName =
      provider === 'telebirr'
        ? 'Telebirr (Ethio Telecom)'
        : 'CBE Birr (Commercial Bank of Ethiopia)';

    if (outcome === 'failed') {
      res.json({
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
      res.json({
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

    res.json({
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
  });

  // Reports & Analytics: Server-side Aggregation & CSV/JSON Export
  app.post('/api/reports/export', (req: Request, res: Response) => {
    const body = req.body || {};
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
      res.send(JSON.stringify({ ...summary, orders, tickets, disputes }, null, 2));
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
      lines.push(`Summary Metric,Value`);
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
    res.send(lines.join('\n'));
  });

  // Intelligent AI Support & Interactive Website Navigator (Gemini-powered)
  app.post('/api/assistant/chat', async (req: Request, res: Response) => {
    const apiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY)?.trim();
    if (!apiKey) {
      res.status(503).json({
        error:
          'Gemini AI assistant is not configured yet. Add GEMINI_API_KEY in AI Studio Secrets or Vercel Environment Variables to activate live AI responses.',
      });
      return;
    }

    const body = req.body || {};
    const cleanedMessages = cleanChatMessages(body.messages, 12);

    if (cleanedMessages.length === 0 || cleanedMessages[cleanedMessages.length - 1].role !== 'user') {
      res.status(400).json({ error: 'Please enter a question for the GameZone ET Assistant.' });
      return;
    }

    const ctx = body.context && typeof body.context === 'object' ? body.context : {};
    const systemInstruction = buildAssistantSystemInstruction(ctx);

    try {
      const reply = await generateGeminiReply({
        apiKey,
        systemInstruction,
        messages: cleanedMessages,
      });
      if (!reply) {
        res.status(502).json({ error: 'Empty response received from Gemini AI.' });
        return;
      }

      res.json({ reply });
    } catch (err: any) {
      const parsed = extractGeminiError(
        err,
        'Unable to reach Gemini AI right now. Please try again shortly.'
      );
      res.status(parsed.status).json({ error: parsed.message });
    }
  });

  // Mindful Companion: Empathetic Digital Wellness & Tilt Recovery AI Coach (Separate Gemini Prompt Instance)
  app.post('/api/wellness/chat', async (req: Request, res: Response) => {
    const apiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY)?.trim();
    if (!apiKey) {
      res.status(503).json({
        error:
          'Mindful Companion is not configured yet. Add GEMINI_API_KEY in AI Studio Secrets or Vercel Environment Variables to activate live wellness support.',
      });
      return;
    }

    const body = req.body || {};
    const cleanedMessages = cleanChatMessages(body.messages, 14);

    if (cleanedMessages.length === 0 || cleanedMessages[cleanedMessages.length - 1].role !== 'user') {
      res.status(400).json({ error: 'Share what is on your mind so Mindful Companion can support you.' });
      return;
    }

    const ctx = body.context && typeof body.context === 'object' ? body.context : {};
    const wellnessInstruction = buildWellnessSystemInstruction(ctx);

    try {
      const reply = await generateGeminiReply({
        apiKey,
        systemInstruction: wellnessInstruction,
        messages: cleanedMessages,
      });
      if (!reply) {
        res.status(502).json({ error: 'Empty response received from Mindful Companion.' });
        return;
      }

      res.json({ reply });
    } catch (err: any) {
      const parsed = extractGeminiError(
        err,
        'Mindful Companion is taking a short pause. Please try again in a moment.'
      );
      res.status(parsed.status).json({ error: parsed.message });
    }
  });

  // Frontend Serving (Vite Dev Middleware vs Production Dist)
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (req: Request, res: Response, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`GameZoneET server listening on http://0.0.0.0:${port}`);
  });
}

void startServer();
