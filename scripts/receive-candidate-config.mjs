// Local-only credential handoff from the authorized project dashboard.
// Never logs values; never accepts another project's URL or uploads an admin key.
import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const nonce = randomBytes(24).toString('hex');
const dir = join(homedir(), 'Library/QuestLifeToolchain/secrets');
const projectUrl = 'https://gttcoocfkqwvsqfwxpyo.supabase.co';
let origin;
const server = http.createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Security-Policy', "default-src 'none'; form-action 'self'; frame-ancestors 'none'");
  if (req.headers.host !== new URL(origin).host || req.url !== `/${nonce}`) { res.writeHead(404).end(); return; }
  if (req.method === 'GET') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<h1>QuestLife V1 candidate configuration</h1><p>Local handoff only. Project: gttcoocfkqwvsqfwxpyo. Keys will not be logged or committed.</p><form method="post"><label>Publishable key <input name="key" type="password" autocomplete="off" required></label><label>Candidate admin key (optional) <input name="adminKey" type="password" autocomplete="off"></label><button>Save privately on this Mac</button></form>');
    return;
  }
  if (req.method !== 'POST' || req.headers.origin !== origin) { res.writeHead(403).end(); return; }
  let body = '';
  for await (const chunk of req) { body += chunk; if (body.length > 8192) { res.writeHead(413).end(); return; } }
  const params = new URLSearchParams(body);
  const key = params.get('key')?.trim(), adminKey = params.get('adminKey')?.trim();
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key ?? '') || (adminKey && !/^sb_secret_[A-Za-z0-9_-]+$/.test(adminKey))) { res.writeHead(400).end('Invalid key type'); return; }
  const check = await fetch(`${projectUrl}/auth/v1/settings`, { headers: { apikey: key }, signal: AbortSignal.timeout(15000) }).catch(() => null);
  if (!check?.ok) { res.writeHead(400).end('Candidate key could not be verified'); return; }
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  writeFileSync(join(dir, 'supabase-candidate-public.json'), JSON.stringify({ url: projectUrl, key }), { mode: 0o600 });
  writeFileSync(join(dir, 'candidate-native.env'), `EXPO_PUBLIC_API_ORIGIN=https://questlife-v1-release.vercel.app\nEXPO_PUBLIC_SUPABASE_URL=${projectUrl}\nEXPO_PUBLIC_SUPABASE_ANON_KEY=${key}\n`, { mode: 0o600 });
  if (adminKey) writeFileSync(join(dir, 'supabase-candidate-admin.json'), JSON.stringify({ url: projectUrl, key: adminKey }), { mode: 0o600 });
  res.end('Saved privately. No keys were logged. You may close this local page.');
  console.log('Candidate config saved; admin credential supplied: ' + Boolean(adminKey));
  server.close();
});
server.listen(0, '127.0.0.1', () => {
  origin = `http://127.0.0.1:${server.address().port}`;
  console.log(`Local configuration handoff: ${origin}/${nonce}`);
});
setTimeout(() => server.close(), 10 * 60 * 1000).unref();
