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
        max_tokens: 900,  // B-3: entries[] adds significant output tokens for multi-set logs
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
  "insight": { "zh": "...", "en": "..." },
  "entries": []
}

Additional context provided in the user message (may be absent for new users — handle gracefully):
• skillsCatalog: [{id, name}] — match each action to a skill id → matchedSkillId per entry.
• goalsSnapshot: [{id, name, progressPercent, targetSummary}] — active goals.
• skillHistory: [{skillId, skillName, recentLogs:[{date, durationMinutes, qualityRating?}]}] — for longitudinal comparison.

Rules for insight fields (unchanged from before):
• type, fields, matchedSkillIds, linkedGoalId, insightType, crossLinks: same rules as before.
• insight: 1-2 sentences, specific numbers/names, match entry language (Chinese or English).

Rules for entries (Spec B-3 — structured execution items for data entry confirmation):
entries is an array of executable actions. Each entry object:
{
  "skillName": "...",           // exact action name from the log
  "matchedSkillId": "id|null",  // id from skillsCatalog if name matches, else null
  "goalType": "fitness|study|exam|project|custom",
  "progressType": "performance_log|time_based|target_value|quality_score",
  "fields": {
    // performance_log (strength / resistance training):
    //   "sets": [{"weight":80,"reps":5},{"weight":80,"reps":4}]
    //   "extraWeight": 15  (for weighted dips: the added plate weight)
    //
    // time_based (study, reading, cardio by duration):
    //   "durationMinutes": 45, "note": "chapter 3"
    //
    // target_value:
    //   "value": 150, "unit": "kg"
  },
  "qualityRating": 4  // omit if unknown
}

CRITICAL safety rules for entries (prevents data pollution):
1. ONLY create entries for real physical/cognitive execution: training sets actually done, study sessions, practice reps.
2. Do NOT create entries for: conversational references ("今天聊到了卧推"), state-only logs ("没睡好"), future plans ("明天练"), or vague mentions without concrete metrics.
3. Strength sets: extract EACH set separately. "3x5最后一组4个" → [{reps:5},{reps:5},{reps:4}]. "dip+15kg 3x8" → [{weight:15,reps:8},{weight:15,reps:8},{weight:15,reps:8}] with extraWeight:15.
4. If no concrete execution data → "entries": [].
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
    const VALID_PROGRESS_TYPES = new Set(['performance_log', 'time_based', 'target_value', 'quality_score', 'frequency', 'none']);

    // Sanitise entries array — strip anything without a skillName
    const rawEntries: any[] = Array.isArray(parsed.entries) ? parsed.entries : [];
    const entries = rawEntries
      .filter((e: any) => typeof e?.skillName === 'string' && e.skillName.trim())
      .map((e: any) => ({
        skillName:       String(e.skillName).trim(),
        matchedSkillId:  typeof e.matchedSkillId === 'string' ? e.matchedSkillId : null,
        goalType:        typeof e.goalType === 'string' ? e.goalType : 'custom',
        progressType:    VALID_PROGRESS_TYPES.has(e.progressType) ? e.progressType : 'time_based',
        fields:          e.fields && typeof e.fields === 'object' ? e.fields : {},
        ...(typeof e.qualityRating === 'number' ? { qualityRating: Math.max(1, Math.min(5, Math.round(e.qualityRating))) } : {}),
      }));

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
      entries,          // B-3: structured execution items
    });

  } catch (error: any) {
    const isTimeout = error?.name === 'AbortError';
    console.error('[parse]', isTimeout ? 'TIMEOUT' : error?.message);
    return send(res, isTimeout ? 408 : 500, { ok: false, error: isTimeout ? 'timeout' : 'server_error' });
  }
}
