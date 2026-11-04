// Runs the actual worker with synthetic cache/network boundaries; no user storage.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const source = fs.readFileSync(path.resolve(__dirname, '../../public/sw.js'), 'utf8');

function worker({ network, cacheName = 'questlife-shell-v1' } = {}) {
  const listeners = {};
  const stores = new Map([[cacheName, new Map([['/', new Response('GOOD SHELL', { headers: { 'Content-Type': 'text/html' } })]])],
    ['unrelated-app-cache', new Map([['/', new Response('NOT OURS')]])]]);
  const key = value => typeof value === 'string' ? value : value.url;
  const caches = {
    keys: async () => [...stores.keys()],
    delete: async name => stores.delete(name),
    open: async name => {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        match: async request => store.get(key(request))?.clone(),
        put: async (request, response) => store.set(key(request), response),
        addAll: async () => {},
      };
    },
    match: async request => {
      for (const store of stores.values()) if (store.has(key(request))) return store.get(key(request)).clone();
    },
  };
  const self = { location: { origin: 'https://isolated.test' }, addEventListener: (name, fn) => listeners[name] = fn,
    skipWaiting: async () => {}, clients: { claim: async () => {} } };
  vm.runInNewContext(source, { self, caches, fetch: network, URL, Response });
  async function dispatch(type, request) {
    const pending = [];
    let response;
    listeners[type]({ request, waitUntil: job => pending.push(job), respondWith: job => response = job });
    const result = await response;
    await Promise.all(pending);
    return result;
  }
  return { stores, caches, dispatch };
}

test('server failure keeps the last usable shell and offline reload remains usable', async () => {
  let offline = false;
  const w = worker({ network: async () => { if (offline) throw Error('offline'); return new Response('UNAVAILABLE', { status: 503 }); } });
  const request = { method: 'GET', mode: 'navigate', url: 'https://isolated.test/' };
  const response = await w.dispatch('fetch', request);
  assert.equal(await response.text(), 'GOOD SHELL');
  offline = true;
  assert.equal(await (await w.dispatch('fetch', request)).text(), 'GOOD SHELL');
});

test('successful non-HTML response never poisons the offline shell', async () => {
  const w = worker({ network: async () => new Response('{"status":"ok"}', { headers: { 'Content-Type': 'application/json' } }) });
  await w.dispatch('fetch', { method: 'GET', mode: 'navigate', url: 'https://isolated.test/' });
  assert.equal(await (await w.caches.match('/')).text(), 'GOOD SHELL');
});

test('activation never deletes caches belonging to another app', async () => {
  const w = worker();
  w.stores.set('questlife-shell-obsolete', new Map());
  await w.dispatch('activate');
  assert.equal(w.stores.has('unrelated-app-cache'), true);
  assert.equal(w.stores.has('questlife-shell-obsolete'), false);
});

test('offline request without a saved shell returns an explicit unavailable response', async () => {
  const w = worker({ network: async () => { throw Error('offline'); } });
  w.stores.clear();
  const response = await w.dispatch('fetch', { method: 'GET', mode: 'navigate', url: 'https://isolated.test/' });
  assert.ok(response instanceof Response);
  assert.equal(response.status, 503);
});

test('API and external traffic are not intercepted or cached', async () => {
  let calls = 0;
  const w = worker({ network: async () => { calls++; return new Response('PRIVATE'); } });
  for (const url of ['https://isolated.test/api/quant', 'https://another.test/private']) {
    assert.equal(await w.dispatch('fetch', { method: 'GET', mode: 'navigate', url }), undefined);
  }
  assert.equal(calls, 0);
});

test('successful HTML navigation becomes the offline fallback', async () => {
  let offline = false;
  const w = worker({ network: async () => { if (offline) throw Error('offline'); return new Response('NEW SHELL', { headers: { 'Content-Type': 'text/html' } }); } });
  const request = { method: 'GET', mode: 'navigate', url: 'https://isolated.test/' };
  assert.equal(await (await w.dispatch('fetch', request)).text(), 'NEW SHELL');
  offline = true;
  assert.equal(await (await w.dispatch('fetch', request)).text(), 'NEW SHELL');
});
