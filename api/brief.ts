/**
 * /api/brief — QuestLife Decision AI server endpoint.
 *
 * Server-side only. The future target may use DeepSeek v4-pro / flash models,
 * but production v1 stays env-configurable and safely falls back to deepseek-chat.
 * Never return reasoning_content / chain-of-thought to the client.
 */

declare const process: any;

const DEEPSEEK_BASE = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-chat';
const TIMEOUT_MS = 9000;

type BriefBody = Record<string, any>;

function send(res: any, status: number, body: Record<string, unknown>) {
  res.status(status).json(body);
}

function stripJson(raw: string) {
  const cleaned = String(raw || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  return first >= 0 && last > first ? cleaned.slice(first, last + 1) : cleaned;
}

function parseJson(raw: string) {
  try {
    return JSON.parse(stripJson(raw));
  } catch {
    return null;
  }
}

function validateInput(body: BriefBody) {
  if (!body || typeof body !== 'object') return false;
  if (body.mode !== 'instant_micro' && body.mode !== 'daily_brief') return false;
  if (!['morning_push', 'state_checkin', 'manual', 'debug'].includes(body.trigger)) return false;
  if (typeof body.now !== 'string') return false;
  if (!body.today_context || typeof body.today_context !== 'object') return false;
  if (!body.profile || typeof body.profile !== 'object') return false;
  if (!body.history_index || typeof body.history_index !== 'object') return false;
  if (!Array.isArray(body.schedule_today)) return false;
  return true;
}

function normalizeResult(value: any) {
  if (!value || typeof value !== 'object') return null;
  const readiness = value.readiness && typeof value.readiness === 'object' ? value.readiness : {};
  const prescription = value.prescription && typeof value.prescription === 'object' ? value.prescription : {};
  const doFirst = prescription.do_first && typeof prescription.do_first === 'object' ? prescription.do_first : {};
  const perceptionGap = value.perception_gap && typeof value.perception_gap === 'object' ? value.perception_gap : {};
  const confidence = typeof value.confidence === 'number' ? Math.max(0, Math.min(1, value.confidence)) : 0.35;
  return {
    schema_version: '1.0',
    generated_at: typeof value.generated_at === 'string' ? value.generated_at : new Date().toISOString(),
    readiness: {
      score: typeof readiness.score === 'number' ? Math.max(0, Math.min(100, Math.round(readiness.score))) : null,
      band: ['green', 'yellow', 'red', 'unknown'].includes(readiness.band) ? readiness.band : 'unknown',
      vs_baseline: ['above', 'at', 'below', 'unknown'].includes(readiness.vs_baseline) ? readiness.vs_baseline : 'unknown',
      drivers: Array.isArray(readiness.drivers) ? readiness.drivers.map(String).slice(0, 8) : [],
    },
    headline_insight: typeof value.headline_insight === 'string' ? value.headline_insight : 'Insufficient data for a strong judgement.',
    perception_gap: {
      detected: perceptionGap.detected === true,
      subjective: typeof perceptionGap.subjective === 'string' ? perceptionGap.subjective : '',
      objective: typeof perceptionGap.objective === 'string' ? perceptionGap.objective : '',
      interpretation: typeof perceptionGap.interpretation === 'string' ? perceptionGap.interpretation : '',
      test_action: typeof perceptionGap.test_action === 'string' ? perceptionGap.test_action : '',
    },
    deep_analysis: typeof value.deep_analysis === 'string' ? value.deep_analysis : '',
    prescription: {
      do_first: {
        step: typeof doFirst.step === 'string' ? doFirst.step : 'Choose one low-friction first action.',
        why: typeof doFirst.why === 'string' ? doFirst.why : 'This is a cautious fallback.',
        duration_min: typeof doFirst.duration_min === 'number' ? Math.max(1, Math.round(doFirst.duration_min)) : null,
      },
      schedule_adjustments: Array.isArray(prescription.schedule_adjustments) ? prescription.schedule_adjustments.slice(0, 6) : [],
      do_not: Array.isArray(prescription.do_not) ? prescription.do_not.map(String).slice(0, 6) : [],
    },
    patterns_surfaced: Array.isArray(value.patterns_surfaced) ? value.patterns_surfaced.map(String).slice(0, 8) : [],
    confidence,
    evidence_basis: ['population_prior', 'personal_pattern', 'mixed'].includes(value.evidence_basis) ? value.evidence_basis : 'population_prior',
    data_gaps: Array.isArray(value.data_gaps) ? value.data_gaps.map(String).slice(0, 8) : [],
    tone: value.tone === 'assertive' ? 'assertive' : 'tentative',
  };
}

const SYSTEM_PROMPT = `You are the QuestLife Decision AI committee: exercise physiology, chronobiology, behavioral science, clinical psychology, and interoception-bias analysis.
You read compact user summaries and return one structured daily operating judgement.
Only output valid JSON. No markdown. No chain-of-thought. Do not include reasoning_content.
No medical diagnosis. No generic wellness filler. No "as an AI". Do not overclaim causality.
Every prescription must include an actionable first step.
If input.locale is "zh", write all user-facing string fields in Chinese. If input.locale is "en", write them in English.

Mandatory analysis questions:
1. Readiness/recovery relative to available baseline.
2. Subjective vs objective perception gap.
3. Chronotype/timing fit if enough data.
4. Context effect: sleep, HRV, RHR, caffeine, workout load, food/body note.
5. Recent execution/state pattern.
6. First action.
7. Do-not list.
8. Data gaps.
9. Confidence and evidence basis: population_prior, personal_pattern, or mixed.

Return exactly this JSON shape:
{
  "schema_version": "1.0",
  "generated_at": "ISO timestamp",
  "readiness": { "score": 0, "band": "green|yellow|red|unknown", "vs_baseline": "above|at|below|unknown", "drivers": [] },
  "headline_insight": "one specific judgement",
  "perception_gap": { "detected": false, "subjective": "", "objective": "", "interpretation": "", "test_action": "" },
  "deep_analysis": "concise analysis without hidden reasoning",
  "prescription": { "do_first": { "step": "", "why": "", "duration_min": 15 }, "schedule_adjustments": [], "do_not": [] },
  "patterns_surfaced": [],
  "confidence": 0.5,
  "evidence_basis": "population_prior|personal_pattern|mixed",
  "data_gaps": [],
  "tone": "assertive|tentative"
}`;

async function callDeepSeek(input: BriefBody, apiKey: string, attempt: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const model = process.env.DEEPSEEK_BRIEF_MODEL || process.env.DEEPSEEK_BRIEF_FAST_MODEL || process.env.DEEPSEEK_MODEL || DEFAULT_MODEL;
  try {
    const response = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Only output valid JSON. Decision input:\n${JSON.stringify(input)}` },
        ],
        temperature: attempt === 0 ? 0.2 : 0.1,
        max_tokens: 1800,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`DeepSeek HTTP ${response.status}`);
    const json: any = await response.json();
    const choice = json.choices?.[0];
    const content = choice?.message?.content ?? '';
    return { content, finishReason: choice?.finish_reason };
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { ok: false, error: 'method_not_allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body ?? {});
    if (!validateInput(body)) return send(res, 400, { ok: false, error: 'invalid_input' });
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return send(res, 503, { ok: false, error: 'not_configured' });

    let lastError = 'invalid_json';
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const { content, finishReason } = await callDeepSeek(body, apiKey, attempt);
      const parsed = parseJson(content);
      const normalized = normalizeResult(parsed);
      if (normalized && finishReason !== 'length') {
        return send(res, 200, { ok: true, result: normalized });
      }
      lastError = finishReason === 'length' ? 'finish_reason_length' : 'invalid_json';
    }
    return send(res, 502, { ok: false, error: lastError });
  } catch (error: any) {
    console.warn('[brief] failed', error?.message || error);
    return send(res, 500, { ok: false, error: 'brief_failed' });
  }
}
