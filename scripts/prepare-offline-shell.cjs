const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function prepareOfflineShell(directory) {
  const root = fs.realpathSync(directory);
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  // Expo emits quoted, root-relative script/link tags. Only inspect those generated
  // tags, not runtime DOM, user content, dynamic chunks or API responses.
  const assets = new Set();
  for (const [tag, kind] of html.matchAll(/<(script|link)\b[^>]*>/gi)) {
    const attributes = Object.fromEntries([...tag.matchAll(/\s([\w-]+)\s*=\s*(["'])(.*?)\2/g)].map(match => [match[1].toLowerCase(), match[3]]));
    const value = kind.toLowerCase() === 'script' ? attributes.src : attributes.rel === 'stylesheet' ? attributes.href : undefined;
    if (!value || !/^\/_expo\/static\/[A-Za-z0-9_./-]+\.(js|css)$/.test(value)) continue;
    const file = fs.realpathSync(path.join(root, value));
    if (!file.startsWith(root + path.sep) || !fs.statSync(file).isFile()) throw Error('Offline entry asset must be inside the export directory');
    assets.add(value);
  }
  if (![...assets].some(asset => asset.endsWith('.js'))) throw Error('Expo entry scripts not found; offline release was not prepared');
  const worker = fs.readFileSync(path.resolve(__dirname, '../public/sw.js'), 'utf8');
  const version = crypto.createHash('sha256').update(html).update(worker).digest('hex').slice(0, 16);
  const prefix = `self.__QUESTLIFE_CACHE_VERSION__ = ${JSON.stringify(`questlife-shell-${version}`)};\nself.__QUESTLIFE_ENTRY_ASSETS__ = ${JSON.stringify([...assets])};\n`;
  fs.writeFileSync(path.join(root, 'sw.js'), prefix + worker);
  return { version, assets: [...assets] };
}

if (require.main === module) {
  const prepared = prepareOfflineShell(path.resolve(process.argv[2] || 'dist'));
  console.log(`Offline shell ${prepared.version}: ${prepared.assets.length} entry assets prepared`);
}
module.exports = { prepareOfflineShell };
