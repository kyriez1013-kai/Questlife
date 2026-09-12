import {spawnSync} from 'node:child_process';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const out=mkdtempSync(join(tmpdir(),'questlife-platform-test-'));
const compile=spawnSync(process.execPath,['node_modules/typescript/bin/tsc','--module','commonjs','--target','es2022','--moduleResolution','node','--jsx','react-jsx','--resolveJsonModule','--esModuleInterop','--skipLibCheck','--rootDir','.','--outDir',out,'tests/native/platform.test.ts','tests/native/chart.test.ts'],{stdio:'inherit'});
if(compile.status)process.exit(compile.status);
const run=spawnSync(process.execPath,['--test',join(out,'tests/native/platform.test.js'),join(out,'tests/native/chart.test.js')],{stdio:'inherit',env:{...process.env,TZ:'UTC',NODE_PATH:join(process.cwd(),'node_modules')}});
process.exit(run.status??1);
