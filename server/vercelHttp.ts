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
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}
