import assert from 'node:assert/strict';
import { relativePercentChange, resolvePersonalTerminalDisplayChange } from './personalTerminalValueMath';

assert.equal(relativePercentChange(11_400, 7_571)?.toFixed(1), '50.6');
assert.equal(relativePercentChange(3, 0), null);
assert.equal(relativePercentChange(null, 7_571), null);

assert.deepEqual(
  resolvePersonalTerminalDisplayChange(
    { semantic: 'count', valueChangeMode: 'percentage' },
    11_400,
    7_571,
  ),
  {
    absolute: 3_829,
    percent: relativePercentChange(11_400, 7_571),
  },
);

assert.deepEqual(
  resolvePersonalTerminalDisplayChange(
    { semantic: 'ordinal_state', valueChangeMode: 'percentage' },
    4,
    3.5,
  ),
  { absolute: 0.5, percent: null },
);

assert.deepEqual(
  resolvePersonalTerminalDisplayChange(
    { semantic: 'duration', valueChangeMode: 'absolute' },
    45,
    30,
  ),
  { absolute: 15, percent: null },
);

console.log('personalTerminalValueMath tests passed');
