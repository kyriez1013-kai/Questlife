const { createGenerator } = require('ts-json-schema-generator');
const Ajv = require('ajv');
const standalone = require('ajv/dist/standalone').default;
const fs = require('node:fs');

const schema = createGenerator({ path: 'src/types.ts', tsconfig: 'tsconfig.json', type: 'AppData',
  skipTypeCheck: true, additionalProperties: true }).createSchema('AppData');
const ajv = new Ajv({ strict: false, inlineRefs: false, code: { source: true, lines: true }, allErrors: false });
const code = '// Generated from AppData. Run scripts/generate-record-validator.cjs. Do not edit.\n'
  + standalone(ajv, ajv.compile(schema));
const path = 'src/backup/validateAppData.cjs';
if (process.argv.includes('--check')) {
  if (fs.readFileSync(path, 'utf8') !== code) throw new Error('Record validator differs from current AppData');
} else {
  fs.mkdirSync('src/backup', { recursive: true });
  fs.writeFileSync(path, code);
}
console.log('AppData standalone validator: ' + Buffer.byteLength(code) + ' bytes');
