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
        max_tokens: 1800, // completionSchema suggestedActions can truncate at 1400
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
  "entries": [],
  "completionSchema": {
    "needsCompletion": true,
    "domain": "fitness",
    "suggestedActions": [],
    "matchedGoalId": null,
    "matchedModuleId": null,
    "goalConfidence": "low",
    "shouldCreateGoal": false,
    "newGoalSuggestion": null,
    "durationOptions": [],
    "askDuration": false
  }
}

Additional context provided in the user message (may be absent for new users — handle gracefully):
• skillsCatalog: [{id, name}] — match each action to a skill id → matchedSkillId per entry.
• goalsSnapshot: [{id, name, progressPercent, targetSummary}] — active goals.
• skillHistory: [{skillId, skillName, recentLogs:[{date, durationMinutes, qualityRating?}]}] — for longitudinal comparison.

Rules for insight fields (unchanged):
• type, fields, matchedSkillIds, linkedGoalId, insightType, crossLinks: same rules as before.
• insight: 1-2 sentences, specific numbers/names, match entry language.

Rules for entries (Spec B-3 — unchanged):
entries is an array of executable actions. Each entry:
{
  "skillName": "...", "matchedSkillId": "id|null", "goalType": "fitness|study|exam|project|custom",
  "progressType": "performance_log|time_based|target_value|quality_score",
  "fields": { /* sets/durationMinutes/value etc */ }, "qualityRating": 4
}
CRITICAL: ONLY create entries for real execution (done sets, study sessions). NOT for state logs, future plans, or vague mentions. If no concrete execution → "entries": [].

Rules for completionSchema (replaces all hardcoded domain/routing logic on the client):

• needsCompletion: true if entries is non-empty OR domain is fitness/learning. false for state/food/other.

• domain: classify input semantics:
  - "fitness": ANY physical training activity in ANY language — exercises, body parts, workouts
    (卧推/bench/push/练胸/练背/练肩/练腿/练臀/硬拉/深蹲/引体/back/shoulder/legs/arms/cardio/chest/dips/squat/deadlift/rows/pull/plank... and any other sport or training term)
  - "learning": study, programming, reading tech docs, flashcards, coding, debugging, math, sciences, languages, any subject in any language (Python/SQL/C++/数学/物理/history/...)
  - "state": mood, energy, emotions, sleep quality, tiredness, stress ("没睡好", "状态差", "累", "焦虑")
  - "food": meals, snacks, drinks, eating ("吃了", "喝了", "meal", "chocolate", "巧克力")
  - "other": everything else

• suggestedActions — THIS IS THE MOST IMPORTANT FIELD. Generate dynamically based on input context:
  FITNESS — generate 5-8 exercises/movements relevant to the body part or workout type mentioned:
    - chest/push/练胸 → [卧推, 上斜卧推, 下斜卧推, 飞鸟, 夹胸, 双杠撑臂, 俯卧撑, chest press]
    - back/pull/练背 → [引体向上, 宽距高位下拉, 坐姿划船, 单臂哑铃划船, 面拉, 硬拉, 反手引体, 俯身划船]
    - shoulder/练肩 → [肩上推举, 侧平举, 前平举, 俯身飞鸟, 保加利亚深蹲, 直立划船, 面拉, 阿诺德推举]
    - legs/练腿 → [深蹲, 罗马尼亚硬拉, 腿举, 腿弯举, 腿伸展, 保加利亚分腿蹲, 箱式深蹲, 哈克深蹲]
    - arms/练臂 → [弯举, 锤式弯举, 窄距卧推, 三头下压, 过头三头伸展, 21s弯举, Preacher弯举]
    - glutes/练臀 → [臀推, 深蹲, 臀部后踢, 侧卧髋外展, 罗马尼亚硬拉, 俯卧髋后伸, 跨步蹲]
    - cardio → [跑步, 跳绳, 游泳, 骑车, 爬楼梯, 椭圆机, 划船机, HIIT]
    - core/腹部 → [平板支撑, 卷腹, 悬垂举腿, 俄罗斯转体, 死虫, 山地爬行, 侧平板]
    - If user mentioned a specific exercise (e.g. "卧推"), put it FIRST in the list
    - IMPORTANT: Infer body part from the input — "back" → back exercises, "shoulder" → shoulder exercises
    - DO NOT return a fixed generic list regardless of input
  LEARNING — generate 5-8 scope candidates relevant to the subject:
    ["练习/刷题", "项目实战", "debug", "课程学习", "复习/复盘", "阅读文档", "刷视频教程", "做笔记"]
    (or similar scope options in the language of the input)

• matchedGoalId: from goalsSnapshot, find the best-matching goal id:
  - fitness domain → look for goals with name/description containing: 健身/训练/gym/fitness/运动/力量/physique
  - learning domain → look for goals with name/description containing: 学习/编程/study/coding/课程/读书
  - Match found → return the goal id and set goalConfidence to "high" if name strongly matches, "medium" if partial
  - No match → null, shouldCreateGoal: true, goalConfidence: "low"

• matchedModuleId: if matchedGoalId is set, look for a module under that goal matching the workout type:
  - fitness chest → module containing "胸"/"chest"/"push"
  - fitness back → module containing "背"/"back"/"pull"
  - fitness shoulder → module containing "肩"/"shoulder"
  - fitness legs → module containing "腿"/"legs"/"squat"
  - Return module id if found, null otherwise

• goalConfidence: "high" (clear name match) | "medium" (partial match) | "low" (no match)

• shouldCreateGoal: true only when no matching goal found (matchedGoalId is null)

• durationOptions: [15, 30, 45, 60] for fitness/learning; [] for state/food/other

• askDuration: true when no duration info in the input; false when input contains duration ("30分钟", "1小时", "30min", etc.)
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
    const debugParse = body?.debugParse === true;
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
    if (debugParse) {
      console.log('[parse debug raw]', JSON.stringify({
        rawPreview: raw.slice(0, 2000),
        hasCompletionSchema: raw.includes('completionSchema'),
        hasSuggestedActions: raw.includes('suggestedActions'),
        hasNeedsCompletion: raw.includes('needsCompletion'),
      }));
    }
    const parsed = safeParseJSON(raw);

    if (!parsed) {
      if (debugParse) {
        console.log('[parse debug parsed]', JSON.stringify({
          parsed: null,
          reason: 'safeParseJSON returned null',
        }));
      }
      console.warn('[parse] DeepSeek returned unparseable response:', raw.slice(0, 200));
      return send(res, 422, { ok: false, error: 'parse_failed' });
    }

    if (debugParse) {
      console.log('[parse debug parsed]', JSON.stringify({
        keys: Object.keys(parsed),
        topLevelCompletionSchema: parsed.completionSchema ?? null,
        entries: Array.isArray(parsed.entries)
          ? parsed.entries.map((e: any) => ({
              skillName: e?.skillName,
              goalType: e?.goalType,
              progressType: e?.progressType,
              completionSchema: e?.completionSchema,
            }))
          : undefined,
      }));
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

    // ── Sanitise completionSchema ─────────────────────────────────────────────
    const VALID_DOMAINS = new Set(['fitness', 'learning', 'state', 'food', 'other']);
    const VALID_CONF    = new Set(['high', 'medium', 'low']);
    const cs = parsed.completionSchema;
    const completionSchema = cs && typeof cs === 'object' ? {
      needsCompletion:   typeof cs.needsCompletion === 'boolean' ? cs.needsCompletion : entries.length > 0,
      domain:            VALID_DOMAINS.has(cs.domain) ? cs.domain : 'other',
      suggestedActions:  Array.isArray(cs.suggestedActions)
        ? cs.suggestedActions.filter((v: any) => typeof v === 'string').slice(0, 10)
        : [],
      matchedGoalId:     typeof cs.matchedGoalId === 'string' ? cs.matchedGoalId : null,
      matchedModuleId:   typeof cs.matchedModuleId === 'string' ? cs.matchedModuleId : null,
      goalConfidence:    VALID_CONF.has(cs.goalConfidence) ? cs.goalConfidence : 'low',
      shouldCreateGoal:  typeof cs.shouldCreateGoal === 'boolean' ? cs.shouldCreateGoal : false,
      newGoalSuggestion: cs.newGoalSuggestion && typeof cs.newGoalSuggestion === 'object'
        ? { name: String(cs.newGoalSuggestion.name ?? ''), domain: String(cs.newGoalSuggestion.domain ?? '') }
        : null,
      durationOptions:   Array.isArray(cs.durationOptions)
        ? cs.durationOptions.filter((v: any) => typeof v === 'number').slice(0, 6)
        : [],
      askDuration:       typeof cs.askDuration === 'boolean' ? cs.askDuration : false,
    } : null;

    const responseBody = {
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
      entries,
      completionSchema, // LLM-driven domain + suggestedActions + goal routing
    };

    if (debugParse) {
      console.log('[parse debug final]', JSON.stringify({
        ok: responseBody.ok,
        captureType: responseBody.type,
        completionSchema: responseBody.completionSchema,
        entriesLength: responseBody.entries.length,
        entries: responseBody.entries.map((e: any) => ({
          skillName: e.skillName,
          matchedSkillId: e.matchedSkillId,
          goalType: e.goalType,
          progressType: e.progressType,
          completionSchema: e.completionSchema,
        })),
      }));
    }

    return send(res, 200, responseBody);

  } catch (error: any) {
    const isTimeout = error?.name === 'AbortError';
    console.error('[parse]', isTimeout ? 'TIMEOUT' : error?.message);
    return send(res, isTimeout ? 408 : 500, { ok: false, error: isTimeout ? 'timeout' : 'server_error' });
  }
}
