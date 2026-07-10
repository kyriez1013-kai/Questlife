/**
 * /api/brief — QuestLife Decision AI server endpoint.
 *
 * Server-side only. The future target may use DeepSeek v4-pro / flash models,
 * but production v1 stays env-configurable and safely falls back to deepseek-chat.
 * Never return reasoning_content / chain-of-thought to the client.
 */

import { z } from 'zod';
import { sanitizePatternMemoryForPayload } from '../src/utils/patternMemory';
import { buildDecisionMemorySummary, createDecisionResultRecord } from '../src/utils/decisionMemory';
import type { PatternMemory, DecisionResult } from '../src/types';
import type { DecisionBriefResult } from '../src/utils/decisionTypes';

declare const process: any;

const DEEPSEEK_BASE = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-chat';
const TIMEOUT_MS = 9000;

type BriefBody = Record<string, any>;

// Typed request schema — mirrors DecisionBriefInput in src/utils/decisionTypes.ts.
// Structurally invalid requests are rejected with 400 + issue details instead
// of the old top-level "key exists" check.
const LooseRecord = z.record(z.string(), z.unknown());

const BriefInputSchema = z
  .object({
    mode: z.enum(['instant_micro', 'daily_brief']),
    trigger: z.enum(['morning_push', 'state_checkin', 'manual', 'debug']),
    now: z.string().min(1),
    locale: z.enum(['zh', 'en']).optional(),
    // Optional so older deployed bundles (which do not send it) keep working;
    // without it the server-memory path is skipped.
    anonymous_user_id: z.string().min(1).max(200).optional(),
    current_state: LooseRecord.nullable(),
    today_context: z
      .object({
        objective_context_brief: LooseRecord.optional(),
        recent_context_logs: z.array(LooseRecord),
        context_summary: LooseRecord.optional(),
        latest_sleep_minutes: z.number().optional(),
        hrv: z.number().optional(),
        resting_heart_rate: z.number().optional(),
        steps: z.number().optional(),
        workout_minutes: z.number().optional(),
        caffeine_count: z.number().optional(),
      })
      .passthrough(),
    profile: z
      .object({
        active_goals: z.array(LooseRecord),
        modules: z.array(LooseRecord),
        skills: z.array(LooseRecord),
        known_baselines: LooseRecord,
        confirmed_patterns: z.array(LooseRecord),
        inferred_patterns_v0: z.array(LooseRecord).optional(),
        pattern_candidates: z.array(LooseRecord).optional(),
        pattern_memory_summary: LooseRecord.optional(),
        chronotype: z.enum(['unknown', 'morning', 'evening', 'mixed']),
      })
      .passthrough(),
    history_index: z
      .object({
        last_7_days: z.array(LooseRecord),
        last_28_days: LooseRecord,
      })
      .passthrough(),
    state_summary: LooseRecord.optional(),
    after_state_summary: LooseRecord.optional(),
    schedule_today: z.array(LooseRecord),
    decision_memory_summary: LooseRecord.optional(),
  })
  .passthrough();

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

// ---------------------------------------------------------------------------
// Server-side Pattern/Decision Memory (persisted in Supabase, written by
// /api/sync and by this route's post-brief write-back). When available it is
// the source of truth for confirmed_patterns / pattern_candidates /
// decision_memory_summary instead of the client-computed blob.
// ---------------------------------------------------------------------------

type ServerMemoryStatus = 'applied' | 'empty' | 'unavailable' | 'skipped_no_user_id' | 'not_configured';

type SupabaseConfig = { url: string; key: string };

function supabaseConfig(): SupabaseConfig | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url: String(url).replace(/\/$/, ''), key: String(key) } : null;
}

async function supabaseSelect(config: SupabaseConfig, table: string, query: string): Promise<any[]> {
  const response = await fetch(`${config.url}/rest/v1/${table}?${query}`, {
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
  });
  if (!response.ok) throw new Error(`select ${table} HTTP ${response.status}`);
  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

async function supabaseUpsert(config: SupabaseConfig, table: string, rows: Array<Record<string, unknown>>) {
  const response = await fetch(`${config.url}/rest/v1/${table}?on_conflict=anonymous_user_id,id`, {
    method: 'POST',
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!response.ok) throw new Error(`upsert ${table} HTTP ${response.status}`);
}

/** Both the client record and the server write-back share createdAt
 *  (= result.generated_at), so dedupe on it and prefer the record that
 *  carries quality/userFeedback (the client-enriched copy). */
function dedupeDecisionResults(results: DecisionResult[]): DecisionResult[] {
  const byCreatedAt = new Map<string, DecisionResult>();
  results.forEach((result) => {
    const key = result.createdAt || result.id;
    const existing = byCreatedAt.get(key);
    if (!existing) {
      byCreatedAt.set(key, result);
      return;
    }
    const existingEnriched = !!(existing.userFeedback || existing.quality);
    const candidateEnriched = !!(result.userFeedback || result.quality);
    if (candidateEnriched && !existingEnriched) byCreatedAt.set(key, result);
  });
  return Array.from(byCreatedAt.values());
}

type ServerMemory = {
  status: ServerMemoryStatus;
  patternCount: number;
  decisionCount: number;
};

/** Reads persisted memory and, when present, overrides the client-provided
 *  pattern/decision fields on the model input. Falls back silently so a
 *  missing table or Supabase outage never blocks a brief. */
async function applyServerMemory(input: BriefBody, userId: string | undefined): Promise<ServerMemory> {
  const config = supabaseConfig();
  if (!config) return { status: 'not_configured', patternCount: 0, decisionCount: 0 };
  if (!userId) return { status: 'skipped_no_user_id', patternCount: 0, decisionCount: 0 };
  try {
    const [patternRows, decisionRows] = await Promise.all([
      supabaseSelect(config, 'pattern_memory', `anonymous_user_id=eq.${encodeURIComponent(userId)}&select=payload&limit=200`),
      supabaseSelect(config, 'decision_results', `anonymous_user_id=eq.${encodeURIComponent(userId)}&select=payload&order=created_at.desc.nullslast&limit=100`),
    ]);
    const patterns = patternRows
      .map((row) => row?.payload)
      .filter((payload): payload is PatternMemory => !!payload && typeof payload === 'object' && !!payload.id && !!payload.label);
    const decisions = dedupeDecisionResults(
      decisionRows
        .map((row) => row?.payload)
        .filter((payload): payload is DecisionResult => !!payload && typeof payload === 'object' && !!payload.id)
    );
    if (patterns.length === 0 && decisions.length === 0) {
      return { status: 'empty', patternCount: 0, decisionCount: 0 };
    }
    if (patterns.length > 0) {
      const sanitized = sanitizePatternMemoryForPayload(patterns);
      input.profile = {
        ...input.profile,
        confirmed_patterns: sanitized.confirmed_patterns,
        pattern_candidates: sanitized.candidate_patterns,
        pattern_memory_summary: sanitized.pattern_memory_summary,
      };
    }
    if (decisions.length > 0) {
      input.decision_memory_summary = buildDecisionMemorySummary(decisions);
    }
    return { status: 'applied', patternCount: patterns.length, decisionCount: decisions.length };
  } catch (error: any) {
    console.warn('[brief] server memory unavailable', error?.message || error);
    return { status: 'unavailable', patternCount: 0, decisionCount: 0 };
  }
}

/** Persists the generated brief server-side so Decision Memory accumulates
 *  even if the client never syncs. Failures are logged, never fatal. */
async function persistDecisionResult(
  userId: string | undefined,
  normalized: DecisionBriefResult,
  mode: 'instant_micro' | 'daily_brief',
  trigger: 'morning_push' | 'state_checkin' | 'manual' | 'debug',
  model: string,
) {
  const config = supabaseConfig();
  if (!config || !userId) return;
  try {
    const record = createDecisionResultRecord({
      id: `srv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      result: normalized,
      mode,
      trigger,
      source: 'ai',
      meta: { service: 'ai', endpointOk: true, model },
    });
    await supabaseUpsert(config, 'decision_results', [{
      anonymous_user_id: userId,
      id: record.id,
      created_at: record.createdAt,
      mode: record.mode,
      source: record.source,
      payload: record,
    }]);
  } catch (error: any) {
    console.warn('[brief] decision result write-back failed', error?.message || error);
  }
}

function normalizeResult(value: any) {
  if (!value || typeof value !== 'object') return null;
  const readiness = value.readiness && typeof value.readiness === 'object' ? value.readiness : {};
  const prescription = value.prescription && typeof value.prescription === 'object' ? value.prescription : {};
  const doFirst = prescription.do_first && typeof prescription.do_first === 'object' ? prescription.do_first : {};
  const perceptionGap = value.perception_gap && typeof value.perception_gap === 'object' ? value.perception_gap : {};
  const confidence = typeof value.confidence === 'number' ? Math.max(0, Math.min(1, value.confidence)) : 0.35;
  const patternReferences = Array.isArray(value.pattern_references)
    ? value.pattern_references
      .filter((item: any) => item && typeof item === 'object' && typeof item.label === 'string')
      .slice(0, 6)
      .map((item: any) => ({
        pattern_id: typeof item.pattern_id === 'string' ? item.pattern_id.slice(0, 120) : undefined,
        label: String(item.label || '').slice(0, 160),
        status: item.status === 'candidate' ? 'candidate' : 'accepted',
        used_as: ['primary_evidence', 'supporting_evidence', 'caution'].includes(item.used_as) ? item.used_as : 'supporting_evidence',
      }))
    : [];
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
    pattern_references: patternReferences,
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
Use concrete evidence from the input whenever available: sleep, HRV, steps, state, recent execution, skill, context, after-state, or schedule.
Mention exactly which evidence was used. If data is sparse, say what is missing and give a test action instead of pretending confidence.
Evidence priority:
1. Accepted personal PatternMemory in profile.confirmed_patterns.
2. Recent personal evidence: state, context, execution, after-state, decision feedback.
3. Unconfirmed profile.pattern_candidates.
4. Population prior or general science.
Accepted PatternMemory is more important than generic advice. Use it as the primary personalization layer when relevant.
If an accepted pattern is relevant, cite it in headline_insight, deep_analysis, readiness.drivers, patterns_surfaced, or pattern_references.
Candidate patterns are unconfirmed. They can only be supporting evidence or caution; never present them as confirmed truth.
If evidence_basis is "personal_pattern", reference at least one accepted pattern or strong personal evidence.
If relying only on population prior, use tentative tone and lower confidence.
Schedule adjustments are proposals only. Never imply they were applied.
For schedule_adjustments, use only ids from input.schedule_today[].id as blockId. If no exact block id is safe, return action "suggest" without blockId.
Supported schedule_adjustments actions: move, shorten, protect, suggest. For move/shorten include from, to, reason.
The first step must be physically executable within 5-25 minutes. Avoid vague advice like "stay mindful", "keep going", "保持积极", or "照顾好自己".
For instant_micro, be sharp and compact. For daily_brief, be deeper but still structured.
Bad example: "保持积极，照顾好自己。"
Good example: "你昨晚睡眠只有5小时，今天不适合硬冲90分钟深度任务。先做10分钟低阻力启动，然后复评专注。"

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
  "prescription": { "do_first": { "step": "", "why": "", "duration_min": 15 }, "schedule_adjustments": [{ "blockId": "", "action": "move|shorten|protect|suggest", "from": "HH:mm", "to": "HH:mm", "reason": "", "confidence": 0.5 }], "do_not": [] },
  "patterns_surfaced": [],
  "pattern_references": [{ "pattern_id": "", "label": "", "status": "accepted|candidate", "used_as": "primary_evidence|supporting_evidence|caution" }],
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
    return { content, finishReason: choice?.finish_reason, model };
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
    const parsedInput = BriefInputSchema.safeParse(body);
    if (!parsedInput.success) {
      return send(res, 400, {
        ok: false,
        error: 'invalid_input',
        issues: parsedInput.error.issues.slice(0, 10).map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return send(res, 503, { ok: false, error: 'not_configured' });

    // The anonymous user id keys the persisted memory; it is stripped from
    // the model input so it never reaches DeepSeek.
    const { anonymous_user_id: anonymousUserId, ...modelInput } = parsedInput.data as BriefBody;
    const serverMemory = await applyServerMemory(modelInput, anonymousUserId);

    let lastError = 'invalid_json';
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const { content, finishReason, model } = await callDeepSeek(modelInput, apiKey, attempt);
      const parsed = parseJson(content);
      const normalized = normalizeResult(parsed);
      if (normalized && finishReason !== 'length') {
        await persistDecisionResult(
          anonymousUserId,
          normalized as DecisionBriefResult,
          modelInput.mode,
          modelInput.trigger,
          model,
        );
        return send(res, 200, {
          ok: true,
          result: normalized,
          meta: {
            model,
            finishReason,
            server_memory: serverMemory.status,
            server_pattern_count: serverMemory.patternCount,
            server_decision_count: serverMemory.decisionCount,
          },
        });
      }
      lastError = finishReason === 'length' ? 'finish_reason_length' : 'invalid_json';
    }
    return send(res, 502, { ok: false, error: lastError });
  } catch (error: any) {
    console.warn('[brief] failed', error?.message || error);
    return send(res, 500, { ok: false, error: 'brief_failed' });
  }
}
