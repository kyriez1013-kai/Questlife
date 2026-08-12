import type { QuantInterpretationScenarioId } from './personalTerminalPresentation';

const fixtures: Record<QuantInterpretationScenarioId, unknown> = {
  accumulated_load: require('./interpretation-fixtures/accumulated_load.json'),
  sleep_disruption: require('./interpretation-fixtures/sleep_disruption.json'),
  conflicting: require('./interpretation-fixtures/conflicting.json'),
  exercise_branch: require('./interpretation-fixtures/exercise_branch.json'),
  rest_branch: require('./interpretation-fixtures/rest_branch.json'),
  insufficient: require('./interpretation-fixtures/insufficient.json'),
};

export const quantInterpretationFixtureManifest = require('./interpretation-fixtures/manifest.json') as unknown;

export function getQuantInterpretationFixture(id: QuantInterpretationScenarioId): unknown {
  return fixtures[id];
}
