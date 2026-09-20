const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const xcode = require('xcode');

const root = path.resolve('ios');
const file = path.join(root, 'QuestLife.xcodeproj/project.pbxproj');
const project = xcode.project(file);
project.parseSync();
const objects = project.hash.project.objects;
const groups = { ...objects.PBXGroup, ...objects.PBXVariantGroup };
const unquote = value => String(value ?? '').replace(/^"|"$/g, '');
const entries = object => Object.entries(object).filter(([id]) => !id.endsWith('_comment'));
const parentOf = id => entries(groups).find(([, group]) => group.children?.some(child => child.value === id));
function resolved(id, seen = new Set()) {
  assert.ok(!seen.has(id), `Cyclic group ${id}`); seen.add(id);
  const node = groups[id] ?? objects.PBXFileReference[id];
  assert.notEqual(unquote(node.path), 'undefined', `Invalid path on ${node.name}`);
  const parent = parentOf(id);
  return path.join(parent ? resolved(parent[0], seen) : root, unquote(node.path));
}
const files = entries(objects.PBXFileReference).filter(([, item]) => /^QuestLife(?:Widgets|Shortcuts)\//.test(unquote(item.path)));
assert.equal(files.length, 8, 'Two Swift sources and six localized tables');
for (const [id] of files) assert.ok(fs.statSync(resolved(id)).isFile(), resolved(id));
for (const name of ['QuestLifeWidgets', 'QuestLifeShortcuts']) {
  assert.equal(entries(objects.PBXGroup).filter(([, group]) => unquote(group.name) === name).length, 1);
}
const targets = entries(objects.PBXNativeTarget).filter(([, target]) => unquote(target.name) === 'QuestLifeWidgets');
assert.equal(targets.length, 1);
console.log('iOS entry resources: 8 real source/localization paths and unique groups/target PASS');
