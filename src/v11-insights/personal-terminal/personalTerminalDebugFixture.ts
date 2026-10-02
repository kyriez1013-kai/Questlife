import type {
  PersonalTerminalFixtureId,
  PersonalTerminalModel,
  QuantInterpretationScenarioId,
  QuantV041LifecycleId,
  QuantV042LifecycleId,
} from './personalTerminalPresentation';
import { getPersonalTerminalFixture } from './personalTerminalFixtures';
import { adaptQuantV041TerminalPayload } from './quantV041Adapter';
import { getQuantV041Fixture } from './quantV041Fixtures';
import { adaptQuantV042TerminalPayload } from './quantV042Adapter';
import { getQuantV042Fixture } from './quantV042Fixtures';
import { adaptQuantInterpretationPayload } from './quantInterpretationAdapter';
import { getQuantInterpretationFixture } from './quantInterpretationFixtures';

export type PersonalTerminalDebugSelection = {
  interpretation: QuantInterpretationScenarioId | null;
  v042: QuantV042LifecycleId | null;
  v041: QuantV041LifecycleId | null;
  personal: PersonalTerminalFixtureId | null;
};

export function getPersonalTerminalDebugFixture(selection: PersonalTerminalDebugSelection): PersonalTerminalModel | null {
  if (selection.interpretation) {
    return adaptQuantInterpretationPayload(getQuantInterpretationFixture(selection.interpretation));
  }
  if (selection.v042) {
    const fixture = getQuantV042Fixture(selection.v042);
    return adaptQuantV042TerminalPayload(fixture.terminal, fixture.overview);
  }
  if (selection.v041) return adaptQuantV041TerminalPayload(getQuantV041Fixture(selection.v041));
  if (selection.personal) return getPersonalTerminalFixture(selection.personal);
  return null;
}
