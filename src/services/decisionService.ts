import { buildLegacyDecisionBrief } from '../utils/decisionBriefFallback';
import { DecisionBriefInput, DecisionBriefResult, DecisionService } from '../utils/decisionTypes';
import { getAnonymousUserId } from '../utils/analytics';

const AI_ENABLED_KEY = 'questlife_decision_ai_enabled';
const AI_SHADOW_KEY = 'questlife_decision_ai_shadow';
const DAILY_BRIEF_ENABLED_KEY = 'questlife_decision_daily_brief_enabled';
const DEBUG_KEY = 'questlife_debug_decision_ai';

export type DecisionServiceMeta = {
  service: 'ai' | 'legacy_fallback' | 'unknown';
  endpointOk?: boolean;
  model?: string;
  finishReason?: string;
  error?: string;
};

let lastDecisionServiceMeta: DecisionServiceMeta = { service: 'unknown' };

export function getLastDecisionServiceMeta() {
  return lastDecisionServiceMeta;
}

function readLocalFlag(key: string) {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage?.getItem(key) === 'true';
  } catch {
    return false;
  }
}

export function isDecisionAIEnabled() {
  return readLocalFlag(AI_ENABLED_KEY);
}

export function isDecisionAIShadowEnabled() {
  return readLocalFlag(AI_SHADOW_KEY);
}

export function isDecisionDailyBriefEnabled() {
  return readLocalFlag(DAILY_BRIEF_ENABLED_KEY);
}

export function isDecisionDebugEnabled() {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('debugDecision') === '1' || readLocalFlag(DEBUG_KEY);
  } catch {
    return readLocalFlag(DEBUG_KEY);
  }
}

export class LegacyDecisionService implements DecisionService {
  async buildBrief(input: DecisionBriefInput): Promise<DecisionBriefResult> {
    lastDecisionServiceMeta = { service: 'legacy_fallback', endpointOk: undefined };
    return buildLegacyDecisionBrief(input);
  }
}

export class AiDecisionService implements DecisionService {
  async buildBrief(input: DecisionBriefInput): Promise<DecisionBriefResult> {
    // anonymous_user_id 让 /api/brief 能读取服务端持久化的 Pattern/Decision Memory.
    const anonymousUserId = await getAnonymousUserId().catch(() => undefined);
    const response = await fetch('/api/brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(anonymousUserId ? { ...input, anonymous_user_id: anonymousUserId } : input),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.ok || !json?.result) {
      lastDecisionServiceMeta = {
        service: 'ai',
        endpointOk: false,
        error: String(json?.error || `brief_http_${response.status}`),
      };
      throw new Error(String(json?.error || `brief_http_${response.status}`));
    }
    lastDecisionServiceMeta = {
      service: 'ai',
      endpointOk: true,
      model: typeof json?.meta?.model === 'string' ? json.meta.model : undefined,
      finishReason: typeof json?.meta?.finishReason === 'string' ? json.meta.finishReason : undefined,
    };
    return json.result as DecisionBriefResult;
  }
}

export function createDecisionService() {
  return isDecisionAIEnabled() ? new AiDecisionService() : new LegacyDecisionService();
}

export async function runDecisionShadowBrief(input: DecisionBriefInput) {
  if (!isDecisionAIShadowEnabled()) return undefined;
  try {
    const result = await new AiDecisionService().buildBrief(input);
    if (isDecisionDebugEnabled()) {
      console.log('[decision shadow]', {
        readiness: result.readiness,
        headline: result.headline_insight,
        confidence: result.confidence,
        dataGaps: result.data_gaps,
      });
    }
    return result;
  } catch (error) {
    if (isDecisionDebugEnabled()) console.warn('[decision shadow failed]', error);
    return undefined;
  }
}
