import { buildLegacyDecisionBrief } from '../utils/decisionBriefFallback';
import { DecisionBriefInput, DecisionBriefResult, DecisionService } from '../utils/decisionTypes';
import { authenticatedAiPost, AiRequestError } from './authenticatedAi';
import { aiPreferencesSnapshot } from './aiPreferences';
import { aiBriefForCloud } from './aiBriefPrivacy';

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
  return aiPreferencesSnapshot().enabled || readLocalFlag(AI_ENABLED_KEY);
}

export function isDecisionAIShadowEnabled() {
  return readLocalFlag(AI_SHADOW_KEY);
}

export function isDecisionDailyBriefEnabled() {
  return aiPreferencesSnapshot().enabled || readLocalFlag(DAILY_BRIEF_ENABLED_KEY);
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
    let json;
    try {
      const { readSyncState } = await import('../sync-v2/runtime');
      const state = await readSyncState();
      const prefs = aiPreferencesSnapshot();
      const allowContext = prefs.includeImportedContext && prefs.ownerId === state.ownerId && state.healthConsent;
      json = await authenticatedAiPost('/api/brief', aiBriefForCloud(input, allowContext));
      if (!json?.result) throw new AiRequestError('service_unavailable');
    } catch (error) {
      const code = error instanceof AiRequestError ? error.code : 'service_unavailable';
      lastDecisionServiceMeta = {
        service: 'ai',
        endpointOk: false,
        error: code,
      };
      throw new AiRequestError(code);
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
      console.log('[decision shadow] completed');
    }
    return result;
  } catch {
    if (isDecisionDebugEnabled()) console.warn('[decision shadow] unavailable');
    return undefined;
  }
}
