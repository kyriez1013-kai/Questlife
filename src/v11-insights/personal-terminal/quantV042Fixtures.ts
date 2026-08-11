import type { QuantV042LifecycleId } from './personalTerminalPresentation';

type QuantV042Fixture = {
  terminal: unknown;
  overview: unknown;
};

const fixtures: Record<QuantV042LifecycleId, QuantV042Fixture> = {
  market_steps_only: {
    terminal: require('./v042-fixtures/market_steps_only.json'),
    overview: require('./v042-fixtures/overview/market_steps_only.json'),
  },
  market_rich_passive: {
    terminal: require('./v042-fixtures/market_rich_passive.json'),
    overview: require('./v042-fixtures/overview/market_rich_passive.json'),
  },
  market_questlife_only: {
    terminal: require('./v042-fixtures/market_questlife_only.json'),
    overview: require('./v042-fixtures/overview/market_questlife_only.json'),
  },
  market_mixed_mature: {
    terminal: require('./v042-fixtures/market_mixed_mature.json'),
    overview: require('./v042-fixtures/overview/market_mixed_mature.json'),
  },
  focus_1_observation: {
    terminal: require('./v042-fixtures/focus_1_observation.json'),
    overview: require('./v042-fixtures/overview/focus_1_observation.json'),
  },
  focus_2_observations: {
    terminal: require('./v042-fixtures/focus_2_observations.json'),
    overview: require('./v042-fixtures/overview/focus_2_observations.json'),
  },
  focus_3_observations: {
    terminal: require('./v042-fixtures/focus_3_observations.json'),
    overview: require('./v042-fixtures/overview/focus_3_observations.json'),
  },
  focus_5_observations: {
    terminal: require('./v042-fixtures/focus_5_observations.json'),
    overview: require('./v042-fixtures/overview/focus_5_observations.json'),
  },
  focus_10_observations: {
    terminal: require('./v042-fixtures/focus_10_observations.json'),
    overview: require('./v042-fixtures/overview/focus_10_observations.json'),
  },
  execution_3_observations: {
    terminal: require('./v042-fixtures/execution_3_observations.json'),
    overview: require('./v042-fixtures/overview/execution_3_observations.json'),
  },
  execution_7_observations: {
    terminal: require('./v042-fixtures/execution_7_observations.json'),
    overview: require('./v042-fixtures/overview/execution_7_observations.json'),
  },
  day30: {
    terminal: require('./v042-fixtures/day30.json'),
    overview: require('./v042-fixtures/overview/day30.json'),
  },
  day90: {
    terminal: require('./v042-fixtures/day90.json'),
    overview: require('./v042-fixtures/overview/day90.json'),
  },
  day180: {
    terminal: require('./v042-fixtures/day180.json'),
    overview: require('./v042-fixtures/overview/day180.json'),
  },
  goal: {
    terminal: require('./v042-fixtures/goal.json'),
    overview: require('./v042-fixtures/overview/goal.json'),
  },
  skill: {
    terminal: require('./v042-fixtures/skill.json'),
    overview: require('./v042-fixtures/overview/skill.json'),
  },
  no_data: {
    terminal: require('./v042-fixtures/no_data.json'),
    overview: require('./v042-fixtures/overview/no_data.json'),
  },
};

export const quantV042FixtureManifest = require('./v042-fixtures/manifest.json') as unknown;

export function getQuantV042Fixture(id: QuantV042LifecycleId): QuantV042Fixture {
  return fixtures[id];
}
