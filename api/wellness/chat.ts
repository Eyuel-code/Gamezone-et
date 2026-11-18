import type { ServerlessRequest, ServerlessResponse } from '../../server/vercelHttp';
import {
  buildWellnessSystemInstruction,
  cleanChatMessages,
  extractGeminiError,
  generateGeminiReply,
} from '../../server/aiPrompts';

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const apiKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY)?.trim();
  if (!apiKey) {
    res.status(503).json({
      error:
        'Mindful Companion is not configured yet. Add GEMINI_API_KEY (or VITE_GEMINI_API_KEY) in Vercel Environment Variables or AI Studio Secrets to activate live wellness support.',
    });
    return;
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const cleanedMessages = cleanChatMessages(body.messages, 14);

  if (cleanedMessages.length === 0 || cleanedMessages[cleanedMessages.length - 1].role !== 'user') {
    res.status(400).json({ error: 'Share what is on your mind so Mindful Companion can support you.' });
    return;
  }

  const ctx = body.context && typeof body.context === 'object' ? body.context : {};
  const systemInstruction = buildWellnessSystemInstruction(ctx);

  try {
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
  } catch (err: any) {
    const parsed = extractGeminiError(
      err,
      'Mindful Companion is taking a short pause. Please try again in a moment.'
    );
    res.status(parsed.status).json({ error: parsed.message });
  }
}
