// Expo 54 pins Metro 0.83.3. Its asset exporter passes paths to image-size 1.x;
// security-fixed image-size 2.x accepts bytes only. Preserve Metro's sync API.
const fs = require('node:fs');
const path = require('node:path');
const root = path.dirname(require.resolve('metro/package.json'));
if (require(path.join(root, 'package.json')).version !== '0.83.3') {
  throw new Error('Review Metro asset compatibility patch before changing Metro version');
}
const file = path.join(root, 'src/Assets.js');
const original = '  const dimensions = isImage ? (0, _imageSize.default)(isImageInput) : null;';
const patched = '  const dimensions = isImage ? (0, _imageSize.default)(typeof isImageInput === "string" ? _fs.default.readFileSync(isImageInput) : isImageInput) : null;';
const source = fs.readFileSync(file, 'utf8');
if (!source.includes(patched)) {
  if (source.split(original).length !== 2) throw new Error('Metro asset call site changed; refusing an unreviewed patch');
  fs.writeFileSync(file, source.replace(original, patched));
}
