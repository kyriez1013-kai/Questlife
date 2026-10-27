import assert from 'node:assert/strict';
import { contrastRatio, v2Tokens } from './tokens';
import { parseV2Flag } from './flagParse';

for (const dir of ['A', 'B'] as const) {
  for (const mode of ['light', 'dark'] as const) {
    const t = v2Tokens(dir, mode);
    const c = t.color;
    // text on every surface it can sit on: ≥ 4.5:1
    for (const bg of [c.bg, c.surface, c.surfaceAlt]) {
      assert.ok(contrastRatio(c.ink, bg) >= 4.5, `${dir}/${mode} ink on ${bg}`);
      assert.ok(contrastRatio(c.inkMuted, bg) >= 4.5, `${dir}/${mode} inkMuted on ${bg} = ${contrastRatio(c.inkMuted, bg).toFixed(2)}`);
    }
    assert.ok(contrastRatio(c.onPrimary, c.primary) >= 4.5, `${dir}/${mode} onPrimary on primary`);
    // semantic text colors used for labels on surface
    for (const k of ['e1', 'e2', 'e3'] as const) assert.ok(contrastRatio(c.evidence[k], c.surface) >= 3, `${dir}/${mode} evidence ${k} ≥ 3:1 (non-text marker, always with a text label)`);
    assert.ok(contrastRatio(c.danger, c.surface) >= 4.5, `${dir}/${mode} danger text`);
    assert.ok(contrastRatio(c.sample, c.sampleSoft) >= 4.5, `${dir}/${mode} sample tag`);
    // exactly four type levels, ordered
    assert.deepEqual(Object.keys(t.type), ['display', 'title', 'body', 'caption']);
    assert.ok(t.type.display.size > t.type.title.size && t.type.title.size > t.type.body.size && t.type.body.size > t.type.caption.size);
    // touch target
    assert.ok(t.layout.hit >= 44);
    // state scale has 5 entries
    assert.equal(c.state.length, 5);
  }
}
assert.equal(v2Tokens('A', 'light').surfaceStyle, 'flat');
assert.equal(v2Tokens('B', 'light').surfaceStyle, 'card');

// flag parsing never collides with the legacy flag
assert.deepEqual(parseV2Flag('1'), { enabled: true, direction: 'A' });
assert.deepEqual(parseV2Flag('b'), { enabled: true, direction: 'B' });
assert.deepEqual(parseV2Flag(null), { enabled: false, direction: 'A' });
assert.deepEqual(parseV2Flag('legacy'), { enabled: false, direction: 'A' });
console.log('tokens ok');
