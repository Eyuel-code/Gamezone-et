import {
  parseJsonBody,
  type ServerlessRequest,
  type ServerlessResponse,
} from '../_lib/vercelHttp.js';
import {
  buildWellnessSystemInstruction,
  cleanChatMessages,
  extractGeminiError,
  generateGeminiReply,
} from '../_lib/aiPrompts.js';

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed.' });
      return;
    }

    const rawApiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY)?.trim();
    const apiKey = rawApiKey?.replace(/^["']|["']$/g, '').trim();
    if (!apiKey) {
      res.status(503).json({
        error:
          'Missing GEMINI_API_KEY environment variable on the server. Add GEMINI_API_KEY in Vercel Environment Variables and redeploy.',
      });
      return;
    }

    const body = parseJsonBody(req);
    const cleanedMessages = cleanChatMessages(body.messages, 14);

    if (cleanedMessages.length === 0 || cleanedMessages[cleanedMessages.length - 1].role !== 'user') {
      res.status(400).json({ error: 'Share what is on your mind so Mindful Companion can support you.' });
      return;
    }

    const ctx = body.context && typeof body.context === 'object' ? body.context : {};
    const systemInstruction = buildWellnessSystemInstruction(ctx);

    const reply = await generateGeminiReply({
      apiKey,
      systemInstruction,
      messages: cleanedMessages,
    });
    if (!reply) {
      res.status(502).json({ error: 'Empty response received from Mindful Companion.' });
      return;
    }
    res.status(200).json({ reply });
  } catch (error: any) {
    const fallbackMessage =
      error instanceof Error && error.message
        ? error.message
        : typeof error?.message === 'string' && error.message
          ? error.message
          : String(error || 'Unknown Gemini API error');
    const parsed = extractGeminiError(error, fallbackMessage);
    console.error('[api/wellness/chat]', parsed.status, parsed.message);
    res.status(parsed.status).json({ error: parsed.message || fallbackMessage });
  }
}
