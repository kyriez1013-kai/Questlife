const { test } = require('node:test');
const assert = require('node:assert/strict');
const load = require('./load.cjs');
const { formatChartTick } = load('src/insights-v3/insightsV3Presentation.ts');

test('chart ticks use the same local clock as the recorded observation', () => {
  const before = process.env.TZ;
  try {
    process.env.TZ = 'Australia/Sydney';
    assert.equal(formatChartTick('zh', '2026-11-06T10:19:00Z', 3), '21:19');
    assert.equal(formatChartTick('en', '2026-07-06T10:19:00Z', 3), '20:19');
    assert.equal(formatChartTick('en', '2026-11-06T13:02:03Z', 4), '00:02:03');
    assert.equal(formatChartTick('en', 'invalid', 3), '');
  } finally {
    if (before === undefined) delete process.env.TZ;
    else process.env.TZ = before;
  }
});

test('calendar ticks follow the local date without changing the observation timestamp', () => {
  const before = process.env.TZ;
  try {
    process.env.TZ = 'Australia/Sydney';
    const observation = '2026-12-31T13:30:00Z';
    assert.equal(formatChartTick('zh', observation, 0), '2027');
    assert.equal(formatChartTick('zh', observation, 2), '1');
    assert.equal(observation, '2026-12-31T13:30:00Z');
  } finally {
    if (before === undefined) delete process.env.TZ;
    else process.env.TZ = before;
  }
});
