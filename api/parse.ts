/**
 * /api/parse — DeepSeek 服务端代理
 *
 * DEEPSEEK_API_KEY 只在服务端环境变量，绝不进客户端 bundle。
 * 客户端 POST { text, history?, mode? }
 * mode: 'capture' (default) | 'greeting'
 *
 * 封装成一个函数，以后换模型只改这一处。
 */

declare const process: any;

const DEEPSEEK_BASE  = 'https://api.deepseek.com';
const DEEPSEEK_MODEL = 'deepseek-chat';
const TIMEOUT_MS     = 8000;   // 8s: Vercel Hobby 函数上限 10s，留 2s 给函数本身开销

function send(res: any, status: number, body: Record<string, unknown>) {
  res.status(status).json(body);
}

// ── DeepSeek call (换模型只改这个函数) ──────────────────────────────────────

async function callDeepSeek(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt   },
        ],
        temperature: 0.3,
        max_tokens: 600,  // B-2: larger schema needs more output tokens
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`DeepSeek HTTP ${response.status}`);
    const json: any = await response.json();
    return json.choices?.[0]?.message?.content ?? '';
  } finally {
    clearTimeout(timer);
  }
}

// ── Prompts ──────────────────────────────────────────────────────────────────

const CAPTURE_SYSTEM = `\
You are a life-tracking AI embedded in QuestLife. The user has logged a single-line entry.
Respond with ONLY valid JSON — no markdown fences, no prefix, no suffix text.

Required JSON schema:
{
  "type": "training" | "reading" | "state" | "misc",
  "fields": {},
  "matchedSkillIds": [],
  "linkedGoalId": null,
  "insightType": "skill_progress" | "goal_link" | "cross_link" | "encourage",
  "crossLinks": [{ "captureId": "string", "reason": "string" }],
  "insight": { "zh": "...", "en": "..." }
}

Additional context provided in the user message (may be absent for new users — handle gracefully):
• skillsCatalog: [{id, name}] — the user's skills. Match the log entry to skill IDs → matchedSkillIds.
• goalsSnapshot: [{id, name, progressPercent, targetSummary}] — active goals. If this entry advances a goal, set linkedGoalId.
• skillHistory: [{skillId, skillName, recentLogs:[{date, durationMinutes, qualityRating?}]}] — recent execution logs for candidate skills (≤5 per skill). Use for longitudinal comparison.

Rules:
• type: classify as training/reading/state/misc.
• fields: extract structured data (numbers as numbers). E.g. for training: {exercise, reps, weight, duration}; for reading: {title, pages, topic}; for state: {energy, mood, stress}.
• matchedSkillIds: from skillsCatalog, identify which skill(s) this entry is about. Return their IDs. Empty array if none match.
• linkedGoalId: if entry clearly advances a goal from goalsSnapshot, return that goal's id. Otherwise null.
• insightType (choose the HIGHEST applicable):
  1. "skill_progress" — matched skill has history in skillHistory. MUST use specific numbers: compare today's metric to past records (e.g. weight went from 75→80kg, or duration increased). This is the highest-value insight.
  2. "goal_link" — entry connects to a goal and linkedGoalId is set. Show how it moves the needle toward the goal.
  3. "cross_link" — crossLinks is non-empty. Connect this entry to the related past entry.
  4. "encourage" — insufficient data for the above. Confirm + encourage with a specific hook about what to log next.
• crossLinks: from provided history entries, find semantically meaningful connections. Empty if none.
• insight: 1–2 sentences, MUST use specific numbers/names from the entry AND history when available. Never start with "It seems" or "It appears". Match language of the log entry (Chinese or English).
`;

const GREETING_SYSTEM = `\
You are a warm, concise life coach in a habit-tracking app.
Based on the user's recent entries and current time block, write ONE short sentence (~15 words max) that:
- References something specific from their recent logs if available
- Invites them to log their current activity or state
- Sounds natural and human
Match language of the recent entries (Chinese if entries are in Chinese, English if in English).
Return ONLY the sentence — no quotes, no JSON, no explanation.
`;

// ── JSON parser (strips possible ```json fences) ─────────────────────────────

function safeParseJSON(raw: string): Record<string, any> | null {
  try {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/,           '')
      .trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  try {
    const body    = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {});
    const mode    = body?.mode === 'greeting' ? 'greeting' : 'capture';
    const text    = typeof body?.text === 'string' ? body.text.trim() : '';
    const apiKey  = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      console.warn('[parse] DEEPSEEK_API_KEY not configured — graceful degradation');
      return send(res, 503, { ok: false, error: 'not_configured' });
    }

    // ── Greeting mode ─────────────────────────────────────────────────────────
    if (mode === 'greeting') {
      const history: any[]  = Array.isArray(body?.history) ? body.history.slice(0, 3) : [];
      const timeBlock        = typeof body?.timeBlock === 'string' ? body.timeBlock : 'day';
      const userPrompt       = [
        `Time block: ${timeBlock}`,
        `Recent entries: ${history.map((h: any) => String(h.text ?? '')).join(' | ') || 'none'}`,
      ].join('\n');
      const greeting = await callDeepSeek(GREETING_SYSTEM, userPrompt, apiKey);
      return send(res, 200, { ok: true, greeting: greeting.trim() });
    }

    // ── Capture mode ──────────────────────────────────────────────────────────
    if (!text) return send(res, 400, { ok: false, error: 'missing_text' });

    const history: any[]        = Array.isArray(body?.history)       ? body.history.slice(0, 20)       : [];
    const skillsCatalog: any[]  = Array.isArray(body?.skillsCatalog)  ? body.skillsCatalog.slice(0, 50) : [];
    const goalsSnapshot: any[]  = Array.isArray(body?.goalsSnapshot)  ? body.goalsSnapshot.slice(0, 20) : [];
    const skillHistory: any[]   = Array.isArray(body?.skillHistory)   ? body.skillHistory.slice(0, 5)   : [];

    const historyStr = history.length > 0
      ? '\n\nRecent history (id | text | type):\n' +
        history.map((h: any) => `[${h.id}] ${String(h.text ?? '')} (${String(h.type ?? 'unknown')})`).join('\n')
      : '';

    // Skills catalog — always small, bounded by number of user skills
    const skillsStr = skillsCatalog.length > 0
      ? '\n\nSkills catalog (id | name):\n' +
        skillsCatalog.map((s: any) => `[${s.id}] ${String(s.name ?? '')}`).join('\n')
      : '';

    // Goals snapshot — always small, bounded by number of goals
    const goalsStr = goalsSnapshot.length > 0
      ? '\n\nActive goals (id | name | progress% | target):\n' +
        goalsSnapshot.map((g: any) =>
          `[${g.id}] ${String(g.name ?? '')} — ${g.progressPercent ?? 0}% — ${String(g.targetSummary ?? '')}`
        ).join('\n')
      : '';

    // Skill history — BOUNDED: ≤5 logs per skill, ≤5 skills total
    const histSkillStr = skillHistory.length > 0
      ? '\n\nSkill history (recent ≤5 logs per skill):\n' +
        skillHistory.map((sh: any) => {
          const logs = Array.isArray(sh.recentLogs) ? sh.recentLogs.slice(0, 5) : [];
          const logLines = logs.map((l: any) =>
            `  ${l.date}: ${l.durationMinutes}min${l.qualityRating != null ? ` q${l.qualityRating}` : ''}`
          ).join('\n');
          return `${String(sh.skillName ?? sh.skillId)} [${sh.skillId}]:\n${logLines || '  (no logs)'}`;
        }).join('\n')
      : '';

    const userPrompt = `Log entry: "${text}"${historyStr}${skillsStr}${goalsStr}${histSkillStr}`;

    const raw    = await callDeepSeek(CAPTURE_SYSTEM, userPrompt, apiKey);
    const parsed = safeParseJSON(raw);

    if (!parsed) {
      console.warn('[parse] DeepSeek returned unparseable response:', raw.slice(0, 200));
      return send(res, 422, { ok: false, error: 'parse_failed' });
    }

    const VALID_INSIGHT_TYPES = new Set(['skill_progress', 'goal_link', 'cross_link', 'encourage']);

    return send(res, 200, {
      ok:               true,
      type:             typeof parsed.type === 'string' ? parsed.type : 'misc',
      fields:           parsed.fields && typeof parsed.fields === 'object' ? parsed.fields : {},
      matchedSkillIds:  Array.isArray(parsed.matchedSkillIds) ? parsed.matchedSkillIds.filter((v: any) => typeof v === 'string') : [],
      linkedGoalId:     typeof parsed.linkedGoalId === 'string' ? parsed.linkedGoalId : null,
      insightType:      VALID_INSIGHT_TYPES.has(parsed.insightType) ? parsed.insightType : 'encourage',
      crossLinks:       Array.isArray(parsed.crossLinks) ? parsed.crossLinks : [],
      insight:          parsed.insight && typeof parsed.insight === 'object'
        ? { zh: String(parsed.insight.zh ?? ''), en: String(parsed.insight.en ?? '') }
        : { zh: '', en: '' },
    });

  } catch (error: any) {
    const isTimeout = error?.name === 'AbortError';
    console.error('[parse]', isTimeout ? 'TIMEOUT' : error?.message);
    return send(res, isTimeout ? 408 : 500, { ok: false, error: isTimeout ? 'timeout' : 'server_error' });
  }
}
