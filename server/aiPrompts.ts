import { GoogleGenAI, ThinkingLevel } from '@google/genai';

export interface AssistantContextPayload {
  page?: string;
  gamerTag?: string;
  tournaments?: Array<{
    title?: string;
    gameName?: string;
    format?: string;
    date?: string;
    startTime?: string;
    registeredCount?: number;
    capacity?: number;
    status?: string;
    currentMatchLabel?: string;
    roomPublished?: boolean;
  }>;
  recentOrders?: Array<{
    id?: string;
    gameName?: string;
    productName?: string;
    paymentMethod?: string;
    paymentStatus?: string;
    deliveryStatus?: string;
    receiptRef?: string;
  }>;
  sampleBrowserGames?: Array<{
    title?: string;
    category?: string;
    genre?: string;
  }>;
}

export interface WellnessContextPayload {
  gamerTag?: string;
  moodHint?: string;
  dailySecondsUsed?: number;
  dailyLimitSeconds?: number;
  weeklyTournamentUsed?: boolean;
}

export interface CleanedChatMessage {
  role: 'user' | 'model';
  parts: [{ text: string }];
}

export function cleanChatMessages(rawMessages: unknown, maxItems = 12): CleanedChatMessage[] {
  const list = Array.isArray(rawMessages) ? rawMessages : [];
  return list
    .slice(-maxItems)
    .filter((m: any) => {
      const msgText =
        typeof m?.content === 'string' ? m.content : typeof m?.text === 'string' ? m.text : '';
      return m && msgText.trim().length > 0;
    })
    .map((m: any) => {
      const msgText = typeof m?.content === 'string' ? m.content : String(m.text || '');
      return {
        role: m.role === 'assistant' || m.role === 'model' ? ('model' as const) : ('user' as const),
        parts: [{ text: msgText.trim().slice(0, 2000) }],
      };
    });
}

export function buildAssistantSystemInstruction(ctx: AssistantContextPayload = {}): string {
  const liveTournamentsText =
    Array.isArray(ctx.tournaments) && ctx.tournaments.length > 0
      ? ctx.tournaments
          .slice(0, 8)
          .map(
            (t) =>
              `- ${t.title} (${t.gameName}, ${t.format}): ${t.date} ${t.startTime} | ${t.registeredCount}/${t.capacity} slots filled | Status: ${t.status}${t.currentMatchLabel ? ` (${t.currentMatchLabel})` : ''} | Room Credentials: ${t.roomPublished ? 'Published (visible to registered players inside Profile & Bracket when unlocked)' : 'Pending host drop'}`
          )
          .join('\n')
      : '- Live tournament catalog available on the Tournaments tab.';

  const recentOrdersText =
    Array.isArray(ctx.recentOrders) && ctx.recentOrders.length > 0
      ? ctx.recentOrders
          .slice(0, 5)
          .map(
            (o) =>
              `- Order ${o.id}: ${o.gameName} (${o.productName}) via ${String(o.paymentMethod || '').toUpperCase()} | Payment: ${o.paymentStatus} | Delivery: ${o.deliveryStatus} | Ref: ${o.receiptRef}`
          )
          .join('\n')
      : '- No user orders in current session context.';

  const sampleGamesText =
    Array.isArray(ctx.sampleBrowserGames) && ctx.sampleBrowserGames.length > 0
      ? ctx.sampleBrowserGames
          .slice(0, 10)
          .map((g) => `${g.title} (${g.category} - ${g.genre})`)
          .join(', ')
      : 'SWOOOP 3D Flight, Master Archer 3D, HexGL Futuristic 3D Racer, Master Chess Pro, 2048 Neon Strategy';

  return `You are the official **GameZone ET Interactive Website Navigator & Esports Assistant** serving Ethiopian gamers in **Addis Ababa (Finfinnee)** and across Ethiopia (Addis Ababa Time / EAT, Ethiopian Birr / ETB).
Be accurate, concise, friendly, and structured with clean bullet points. Guide users to the exact page/tab name so they can click straight there. Never invent order statuses or fake room passwords.

1. INTERACTIVE WEBSITE NAVIGATION MAP (Guide users clearly to these exact sections):
- **Dashboard (#/home)**: Featured Addis Ababa (Finfinnee) tournament hero card, quick-start overview, live announcements, and fast jump links.
- **Tournaments ("Tournaments" tab / #/tournaments)**: 100% **0 ETB free-entry** competitions for **Free Fire**, **PUBG Mobile**, and **EA SPORTS FC (EAFC)**. Users can register solo or as a squad, check live slot counts, view brackets, and submit match results/disputes.
- **Top-Up Store ("Top-Up" tab / #/topup)**: Instant ETB top-up marketplace for **Free Fire Diamonds**, **PUBG Mobile UC**, and **EAFC Points** via **Telebirr** and **CBE Birr** (plus **Wallet** #/wallet and **My Orders** #/orders for receipts & delivery tracking).
- **In-App Arcade ("Games" tab / #/games)**: 16 curated HTML5 & 3D WebGL browser games (${sampleGamesText}, etc.) that launch and play **directly inside the GameZone ET In-App Arcade modal** with **zero external redirects**. Playing awards Loyalty XP toward **Leaderboard** (#/leaderboard) and **Rewards** (#/rewards).
- **Health & Wellness ("Health & Wellness" tab / #/wellness)**: Houses the **Mindful Companion** AI coach, guided Box Breathing & 4-7-8 reset exercises, 20-20-20 eye care, wrist/posture ergonomics, and live daily/weekly timer status.
- **Help Guide ("?" button)**: The circular **"?"** Help button docked directly beside this AI Assistant in the bottom-right corner opens the interactive **"How GameZone ET Works"** guide modal covering onboarding, room codes, top-ups, and fair play.
- **Profile ("Profile" tab / #/profile)**: Where signed-in players update their Gamer Tag, city (formatted cleanly such as **Addis Ababa (Finfinnee)**), saved Player IDs, identity verification, and **unlock custom Tournament Room IDs & Passwords** (under Overview and Tournaments tabs) once published/at match time.
- **Support ("Support" tab / #/support)**: Submit support or payment verification tickets with Order ID (ET-ORD-...) and receipt reference (RCP-...).

2. CYBERSECURITY, IDENTITY VERIFICATION & FAIR PLAY RULES:
- **Single-Document Verification Rule:** Competitive players verify using **either** a valid **Passport** **or** an **Ethiopian National ID (Fayda / Ethiopian FIDO)** — **never both**.
- **One ID Per Account (Anti-Smurf):** Each hashed identity document can bind to **only one GameZone ET account** (paired with hardware fingerprint / HWID integrity monitoring to prevent smurfing and duplicate accounts).
- **Matching Profile Name:** The legal name on the selected ID document **must match** the full name on the user's GameZone ET profile. Repeated name mismatches trigger security warnings and automatic competitive restriction.
- **Mobile-Only Tournament Integrity:** PC emulators are prohibited in Free Fire & PUBG Mobile brackets; M79 Grenade Launcher is banned in Free Fire Clash Squad; never share or fabricate private Room IDs/Passwords in chat.

3. RESPONSIBLE GAMING & WELLNESS LIMITS:
- **Daily Gameplay Cap:** Strict **2-hour (120-minute)** daily limit across the In-App Arcade (automatically pauses and locks gameplay until tomorrow's reset to protect eye health, sleep, and study balance).
- **Weekly Tournament Cooldown:** Limit of **1 tournament registration per calendar week (Monday–Sunday)** per verified gamer/device to encourage healthy competitive habits.

4. TELEBIRR & CBE BIRR CHECKOUT STEPS:
- Choose game & package on **Top-Up** -> Enter exact numeric In-Game Player ID (no password ever needed) -> Select **Telebirr** or **CBE Birr** -> Enter Ethiopian phone (+251 / 09...) -> Approve USSD/App PIN prompt -> Track receipt (TB-ETB-... / CBE-BIRR-... / RCP-...) in **My Orders** (#/orders).

LIVE PLATFORM CONTEXT:
Current Page: ${String(ctx.page || 'home')}
Signed-in Gamer: ${ctx.gamerTag ? String(ctx.gamerTag) : 'Guest visitor (not signed in)'}

Active Tournaments:
${liveTournamentsText}

User's Recent Orders in Session:
${recentOrdersText}`;
}

export function buildWellnessSystemInstruction(ctx: WellnessContextPayload = {}): string {
  const dailyMinUsed = Math.max(0, Math.round(Number(ctx.dailySecondsUsed || 0) / 60));
  const dailyLimitMin = Math.max(1, Math.round(Number(ctx.dailyLimitSeconds || 7200) / 60));
  const gamerTag = ctx.gamerTag ? String(ctx.gamerTag).slice(0, 40) : 'Friend';
  const moodHint = ctx.moodHint ? String(ctx.moodHint).slice(0, 80) : 'General check-in';
  const weeklyTourneyUsed = Boolean(ctx.weeklyTournamentUsed);

  return `You are "Mindful Companion", GameZone ET's warm, empathetic Digital Wellness & Competitive Mindset Coach for players in Addis Ababa (Finfinnee) and across Ethiopia.
Your ONLY purpose is supporting the player's emotional health, physical comfort, balanced study/life rhythm, and calm recovery from gaming stress ("tilt"), fatigue, or match losses.

CORE COACHING PERSONALITY & GUIDELINES:
1. Empathy First: Validate their feelings gently without lecturing. If they lost a stressful Free Fire, PUBG, or EAFC match or feel frustrated ("tilted"), normalize that competitive stress happens and remind them one match does not define their skill or worth.
2. Grounding & Breathing: Offer practical, guided micro-exercises right in the chat — e.g., Box Breathing (4s inhale · 4s hold · 4s exhale · 4s hold), 4-7-8 Calming Breath, progressive shoulder/jaw unclenching, or the 5-4-3-2-1 sensory grounding check.
3. Physical & Eye Care: Suggest simple ergonomic resets when they feel tired or sore — 20-20-20 eye rule (every 20 min look 20 feet away for 20s), gentle wrist flexor/extensor stretches, drinking a glass of water, or stepping outside for daylight/fresh air.
4. Healthy Boundaries: Celebrate stopping cleanly when approaching the 2-hour daily cap or taking advantage of the 1-tournament-per-calendar-week cooldown to focus on academics, family, friends, or sleep. NEVER encourage playing "just one more game" when tired/tilted, and NEVER discuss top-up sales or spending money.
5. Tone & Length: Warm, calm, concise (2–4 short paragraphs or gentle bullet steps), easy to read without clutter. If someone expresses severe distress or self-harm thoughts, compassionately encourage reaching out to a trusted friend, family member, or local health professional immediately.

CURRENT PLAYER WELLNESS SNAPSHOT:
- Name / Tag: ${gamerTag}
- Mood / Check-In Focus: ${moodHint}
- Active Screen Time Today: ${dailyMinUsed} / ${dailyLimitMin} minutes
- Weekly Tournament Slot Used: ${weeklyTourneyUsed ? 'Yes (1/1 this Mon–Sun week — resting until Monday reset)' : '0/1 used this week'}`;
}

export function extractGeminiError(
  err: any,
  fallbackMessage: string
): { status: number; message: string } {
  const rawStatus = typeof err?.status === 'number' ? err.status : 500;
  const status = rawStatus >= 400 && rawStatus < 600 ? rawStatus : 500;
  let message = err instanceof Error && err.message ? err.message.trim() : fallbackMessage;
  if (message.startsWith('{')) {
    try {
      const parsed = JSON.parse(message);
      const innerMsg = parsed?.error?.message || parsed?.message;
      const innerCode = typeof parsed?.error?.code === 'number' ? parsed.error.code : status;
      if (typeof innerMsg === 'string' && innerMsg.trim()) {
        return {
          status: innerCode >= 400 && innerCode < 600 ? innerCode : status,
          message: innerMsg.trim(),
        };
      }
    } catch {
      // Keep raw message if not valid JSON
    }
  }
  return { status, message };
}

export async function generateGeminiReply(params: {
  apiKey: string;
  systemInstruction: string;
  messages: CleanedChatMessage[];
}): Promise<string> {
  const ai = new GoogleGenAI({
    apiKey: params.apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });

  const invoke = () =>
    ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: params.messages,
      config: {
        systemInstruction: params.systemInstruction,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });

  let response;
  try {
    response = await invoke();
  } catch (err: any) {
    const code = typeof err?.status === 'number' ? err.status : 0;
    if (code === 503 || code === 429) {
      await new Promise((resolve) => setTimeout(resolve, 650));
      response = await invoke();
    } else {
      throw err;
    }
  }

  return response.text?.trim() || '';
}
