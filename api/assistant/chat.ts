import type { ServerlessRequest, ServerlessResponse } from '../../server/vercelHttp';
import {
  buildAssistantSystemInstruction,
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
        'Gemini AI assistant is not configured yet. Add GEMINI_API_KEY (or VITE_GEMINI_API_KEY) in Vercel Environment Variables or AI Studio Secrets to activate live AI responses.',
    });
    return;
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
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
    res.status(200).json({ reply });
  } catch (err: any) {
    const parsed = extractGeminiError(
      err,
      'Unable to reach Gemini AI right now. Please try again shortly.'
    );
    res.status(parsed.status).json({ error: parsed.message });
  }
}
