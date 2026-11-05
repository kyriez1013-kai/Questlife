// Mount the actual foreground integration with an isolated repository and OS double.
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const runtime = process.env.QUESTLIFE_UI_TEST_RUNTIME;
if (!runtime) throw Error('Set QUESTLIFE_UI_TEST_RUNTIME to the isolated React runtime');
const React = require(path.join(runtime, 'react'));
const { create, act } = require(path.join(runtime, 'react-test-renderer'));
global.IS_REACT_ACT_ENVIRONMENT = true;
const services = {};
let onAppState, tree;
const load = Module._load;
Module._load = function (request, parent, main) {
  if (request === 'react') return React;
  if (request === 'react-native') return { AppState: { addEventListener: (_, callback) => {
    onAppState = callback; return { remove() { onAppState = undefined; } };
  } } };
  if (request === './services' && parent?.filename.endsWith('/ForegroundSources.native.tsx')) return services;
  return load.call(this, request, parent, main);
};
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, file);
const { CalendarService } = require('../../src/platform/calendar/CalendarService.ts');
const { DeviceRepository } = require('../../src/platform/deviceRepository.ts');
const ForegroundSources = require('../../src/platform/ForegroundSources.native.tsx').default;
const flush = async () => { await act(async () => { await new Promise(resolve => setImmediate(resolve)); }); };
afterEach(async () => { if (tree) await act(async () => tree.unmount()); tree = undefined; });

async function mount() {
  const disk = new Map(); let permission = 'granted';
  const repo = new DeviceRepository({ getItem: async key => disk.get(key) ?? null, setItem: async (key, value) => { disk.set(key, value); } });
  await repo.update(data => ({ ...data, calendar: { ...data.calendar, connected: true, selectedIds: ['isolated-calendar'] } }));
  let finishRead;
  const driver = { permission: async () => permission, read: async () => new Promise(resolve => { finishRead = resolve; }) };
  const service = new CalendarService(driver, repo);
  Object.assign(services, { calendarSource: service, deviceRepository: repo, healthSync: { sync: async () => assert.fail('Health is not connected') } });
  await act(async () => { tree = create(React.createElement(ForegroundSources)); });
  await flush();
  assert.equal(typeof finishRead, 'function');
  return { repo, service, driver, finish: value => finishRead(value), permission: value => { permission = value; } };
}

test('foreground cancellation does not turn an explicit disconnect into a read error', async () => {
  const x = await mount(); await x.service.disconnect(); x.finish([]); await flush();
  assert.equal((await x.repo.read()).calendar.connected, false);
  assert.equal((await x.repo.read()).calendar.error, undefined);
});

test('foreground preserves revoked-permission status instead of overwriting it with generic failure', async () => {
  const x = await mount(); x.permission('denied'); x.finish([]); await flush();
  assert.equal((await x.repo.read()).calendar.connected, false);
  assert.equal((await x.repo.read()).calendar.error, 'calendar_permission_required');
});

test('foreground failure has a visible error and a later successful active refresh clears it', async () => {
  const x = await mount(); x.finish([]); await flush();
  x.driver.read = async () => { throw Error('isolated_os_failure'); };
  await act(async () => onAppState('active')); await flush();
  assert.equal((await x.repo.read()).calendar.error, 'calendar_read_failed');
  x.driver.read = async () => [];
  await act(async () => onAppState('active')); await flush();
  assert.equal((await x.repo.read()).calendar.connected, true);
  assert.equal((await x.repo.read()).calendar.error, undefined);
});
