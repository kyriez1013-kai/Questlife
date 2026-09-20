import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const esbuild = require(process.env.ESBUILD_RUNTIME || 'esbuild');
const out = join(tmpdir(), 'questlife-native-insights-preview');
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'index.html'), '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#root{margin:0;height:100%;width:100%}*{box-sizing:border-box}</style></head><body><div id="root"></div><script src="/app.js"></script></body></html>');
const context = await esbuild.context({ entryPoints: ['src/native/insights/__tests__/preview.tsx'], outfile: join(out, 'app.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', alias: { 'react-native': 'react-native-web' }, resolveExtensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js', '.json'], define: { 'process.env.NODE_ENV': '"development"', __DEV__: 'true' }, loader: { '.js': 'jsx' }, mainFields: ['browser', 'module', 'main'] });
await context.rebuild();
const server = await context.serve({ servedir: out, host: '127.0.0.1', port: Number(process.env.PORT || 0) });
console.log(`NATIVE_INSIGHTS_PREVIEW http://127.0.0.1:${server.port}`);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await context.dispose(); process.exit(0); });
