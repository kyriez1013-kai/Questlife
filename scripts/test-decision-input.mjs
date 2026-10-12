import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const dir = mkdtempSync(join(tmpdir(), 'questlife-decision-input-'));
const require = createRequire(import.meta.url);
try {
  execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '--module', 'commonjs', '--target', 'es2022', '--moduleResolution', 'node', '--skipLibCheck', '--esModuleInterop', '--outDir', dir, '--rootDir', 'src',
    'src/utils/decisionPayload.ts', 'src/utils/effort.ts', 'src/v11/todayPresentation.ts'], { stdio: 'inherit' });
  const { DEFAULT_DATA } = require(join(dir, 'types.js'));
  const { buildDecisionPayload } = require(join(dir, 'utils/decisionPayload.js'));
  const { buildDecisionMemorySummary } = require(join(dir, 'utils/decisionMemory.js'));
  const { createEffortUnitsFromExecutionLog } = require(join(dir, 'utils/effort.js'));
  const { currentDayStateObservations } = require(join(dir, 'utils/stateSelection.js'));
  const { deriveV11EvidenceStage } = require(join(dir, 'v11/todayPresentation.js'));
  const now = new Date('2026-10-12T00:30:00+08:00');
  const observed = (id, timestamp, overall = 4) => ({ id, date: '2026-10-12', timestamp, overall, createdAt: timestamp });
  const current = observed('current', '2026-10-12T00:20:00+08:00');
  const states = [current, observed('earlier-offset', '2026-10-11T16:10:00Z'),
    observed('future', '2026-10-12T02:00:00+08:00'), observed('invalid', 'broken'),
    observed('invalid-scale', '2026-10-12T00:25:00+08:00', 9),
    { ...observed('synthetic', '2026-10-12T00:26:00+08:00'), dataProvenance: { origin: 'SYNTHETIC' } },
    { ...observed('deleted', '2026-10-12T00:27:00+08:00'), dataProvenance: { deleted: true } },
    { ...observed('unavailable', '2026-10-12T00:28:00+08:00'), dataProvenance: { availableAt: '2026-10-12T02:00:00+08:00' } }];
  let passed = 0;
  const check = (name, action) => { action(); passed++; console.log(`PASS ${name}`); };
  check('current state binds exact current-day eligible record, sorting timestamps not strings', () => {
    assert.deepEqual(currentDayStateObservations(states, '2026-10-12', now).map(row => row.id), ['current', 'earlier-offset']);
    const input = buildDecisionPayload({ ...structuredClone(DEFAULT_DATA), stateCheckIns: states }, { now });
    assert.equal(input.current_state.timestamp, current.timestamp);
    assert.equal(input.state_summary.latest.id, current.id);
    assert.equal(input.state_summary.count_7d, 2);
    assert.deepEqual(input.history_index.last_7_days.flatMap(day => day.state_events).map(row => row.id).sort(), ['current', 'earlier-offset']);
  });
  check('yesterday is historical evidence, not a fabricated current state', () => {
    const old = { ...current, date: '2026-10-11', timestamp: '2026-10-11T12:00:00+08:00', createdAt: '2026-10-11T12:00:00+08:00' };
    const input = buildDecisionPayload({ ...structuredClone(DEFAULT_DATA), stateCheckIns: [old] }, { now });
    assert.equal(input.current_state, null);
    assert.equal(input.state_summary.latest.id, old.id);
  });
  check('local calendar day before 08:00 retains today schedule', () => {
    const block = { id: 'today-block', date: '2026-10-12', title: 'Observe', startTime: '10:00', endTime: '10:15', status: 'planned' };
    const input = buildDecisionPayload({ ...structuredClone(DEFAULT_DATA), scheduleBlocks: [block] }, { now });
    assert.equal(input.schedule_today[0].id, block.id);
  });
  const log = (id, title, durationMinutes, extra = {}) => ({ id, title, date: '2026-10-12', createdAt: current.timestamp,
    durationMinutes, source: 'manual', ...extra });
  const basketball = log('basketball', 'Basketball', 17, { metricUpdate: { metricType: 'time_based', minutesAdded: 17 } });
  const bench = log('bench', 'Bench', 0, { linkedSkillId: 'bench-skill', structuredData: { weight: 82.5, sets: 3, reps: 5 },
    metricUpdate: { metricType: 'performance_log', performanceUnit: 'kg' } });
  check('basketball is 17 minutes; bench is 82.5kg x 5 reps x 3 sets, not minutes or personal score', () => {
    const input = buildDecisionPayload({ ...structuredClone(DEFAULT_DATA), executionLogs: [basketball, bench],
      skills: [{ id: 'bench-skill', name: 'Bench', taskType: 'strength_training', totalXP: 0 }] }, { now });
    const rows = input.history_index.last_7_days.flatMap(day => day.execution_events || []);
    const serialized = JSON.stringify(input);
    assert.match(serialized, /1237.5/);
    assert.match(serialized, /82.5/);
    assert.match(serialized, /"duration":17/);
    assert.ok(!serialized.includes('"weight":0'));
    assert.equal(rows.find(row => row.id === basketball.id).duration, 17);
    assert.equal(rows.find(row => row.id === bench.id).quantity.estimatedVolume, 1237.5);
    assert.equal(rows.find(row => row.id === bench.id).duration, undefined);
    assert.equal(input.history_index.last_7_days.at(-1).avg_quality, undefined);
  });
  check('missing strength numbers are not converted to zero', () => {
    const empty = log('empty-strength', 'Unmeasured', 0, { structuredData: { weight: '', reps: false, sets: null } });
    const input = buildDecisionPayload({ ...structuredClone(DEFAULT_DATA), executionLogs: [empty] }, { now });
    assert.ok(!JSON.stringify(input).includes('"estimatedVolume":0'));
    assert.ok(!JSON.stringify(input).includes('"weight":0'));
  });
  const effortContext = { allGoals: [], allSkills: [], allModules: [], links: [] };
  check('predicted strength and generic performance score are never reported as actual kg', () => {
    const predicted = log('predicted', 'Predicted only', 0, { predictionData: { strength: { weight: 100, sets: 5, reps: 5 } } });
    const score = log('sport-score', 'Basketball', 17, { metricUpdate: { metricType: 'performance_log', performanceValue: 20 } });
    for (const row of [predicted, score]) {
      const effort = createEffortUnitsFromExecutionLog(row, effortContext)[0];
      assert.equal(effort.raw.weight, undefined);
      assert.equal(effort.raw.estimatedVolume, undefined);
      if (row.id === 'predicted') assert.equal(effort.derived.effortScore, undefined);
    }
  });
  check('feedback changes next-decision context distinctly, without duplicating or declaring training', () => {
    const result = { id: 'same-result', createdAt: current.timestamp, mode: 'instant_micro', trigger: 'state_checkin', source: 'ai',
      schemaVersion: '1.0', headlineInsight: 'Prior judgement' };
    for (const rating of ['useful', 'not_useful']) {
      const summary = buildDecisionMemorySummary([{ ...result, userFeedback: { rating } }], now);
      assert.equal(summary.recent_count_7d, 1);
      assert.equal(summary.useful_count_7d, rating === 'useful' ? 1 : 0);
      assert.equal(summary.not_useful_count_7d, rating === 'not_useful' ? 1 : 0);
    }
    assert.equal(buildDecisionMemorySummary([{ ...result, createdAt: '2026-10-13T00:00:00Z' }], now).recent_count_7d, 0);
  });
  check('debug and deleted states cannot promote evidence stage', () => {
    assert.equal(deriveV11EvidenceStage({ today: '2026-10-12', stateCheckIns: states.filter(row => ['synthetic', 'deleted'].includes(row.id)),
      patternMemory: [], patternReferences: [] }), 'S0');
  });
  console.log(`Decision input semantics: ${passed}/${passed} passed (isolated, no Store writes)`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
