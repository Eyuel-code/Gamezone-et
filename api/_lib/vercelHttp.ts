export interface ServerlessRequest {
  method?: string;
  body?: any;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}

export interface ServerlessResponse {
  status: (code: number) => ServerlessResponse;
  json: (payload: unknown) => void;
  send: (payload: string) => void;
  setHeader: (name: string, value: string) => void;
}

export function getClientIpFromHeaders(req: ServerlessRequest): string {
  const fwd = req.headers['x-forwarded-for'];
  const raw = Array.isArray(fwd)
    ? fwd[0]
    : typeof fwd === 'string'
      ? fwd.split(',')[0]
      : req.socket?.remoteAddress || '127.0.0.1';
  return String(raw || '127.0.0.1').trim();
}

export function maskIp(ip: string): string {
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

export function parseJsonBody(req: ServerlessRequest): Record<string, any> {
  try {
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
      return req.body;
    }
    const raw = Buffer.isBuffer(req.body)
      ? req.body.toString('utf8')
      : typeof req.body === 'string'
        ? req.body
        : '';
    if (raw.trim()) {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    }
  } catch {
    return {};
  }
  return {};
}
