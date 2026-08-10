import type { QuantV041LifecycleId } from './personalTerminalPresentation';

const fixtures: Record<QuantV041LifecycleId, unknown> = {
  'no-data': require('./v041-fixtures/no-data.json'),
  'steps-only': require('./v041-fixtures/steps-only.json'),
  'sleep-only': require('./v041-fixtures/sleep-only.json'),
  'rich-passive': require('./v041-fixtures/rich-passive.json'),
  day7: require('./v041-fixtures/day7.json'),
  day30: require('./v041-fixtures/day30.json'),
  day90: require('./v041-fixtures/day90.json'),
  day180: require('./v041-fixtures/day180.json'),
  goal: require('./v041-fixtures/goal.json'),
  skill: require('./v041-fixtures/skill.json'),
};

export function getQuantV041Fixture(id: QuantV041LifecycleId): unknown {
  return fixtures[id];
}
