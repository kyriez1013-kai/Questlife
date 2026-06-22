import { buildLegacyDecisionBrief } from '../utils/decisionBriefFallback';
import { DecisionBriefInput, DecisionBriefResult, DecisionService } from '../utils/decisionTypes';

const AI_ENABLED_KEY = 'questlife_decision_ai_enabled';
const AI_SHADOW_KEY = 'questlife_decision_ai_shadow';
const DEBUG_KEY = 'questlife_debug_decision_ai';

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
    return buildLegacyDecisionBrief(input);
  }
}

export class AiDecisionService implements DecisionService {
  async buildBrief(input: DecisionBriefInput): Promise<DecisionBriefResult> {
    const response = await fetch('/api/brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.ok || !json?.result) {
      throw new Error(String(json?.error || `brief_http_${response.status}`));
    }
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
