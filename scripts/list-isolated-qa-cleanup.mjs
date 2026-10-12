import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

// Read-only inventory. This script cannot delete records or the test account.
const secrets = join(homedir(), 'Library/QuestLifeToolchain/secrets');
const qa = JSON.parse(readFileSync(join(secrets, 'normal-ai-qa.json'), 'utf8'));
const pub = JSON.parse(readFileSync(join(secrets, 'supabase-candidate-public.json'), 'utf8'));
assert.equal(qa.id, 'df82f5ae-3ebe-4556-9f75-4002e00728ae');
assert.equal(pub.url, 'https://gttcoocfkqwvsqfwxpyo.supabase.co');
const client = createClient(pub.url, pub.key, { auth: { persistSession: false, autoRefreshToken: false } });
const login = await client.auth.signInWithPassword({ email: qa.email, password: qa.password });
if (login.error || login.data.user?.id !== qa.id
  || login.data.user.user_metadata.purpose !== 'disposable_normal_ai_client_verification') throw Error('isolated_identity_verification_failed');
try {
  const result = await client.from('questlife_sync_entities').select('entity_type,entity_id,revision,deleted_at,payload')
    .eq('user_id', qa.id).order('entity_type').order('entity_id');
  if (result.error) throw Error('isolated_inventory_read_failed');
  const entities = result.data.map(row => ({
    entityType: row.entity_type, entityId: row.entity_id, revision: row.revision,
    status: row.deleted_at ? 'tombstoned' : 'active',
    lineage: {
      rawCaptureId: row.payload?.rawCaptureId ?? row.payload?.dataProvenance?.candidate?.rawCaptureId,
      executionLogId: row.payload?.executionLogId,
      effortUnitId: row.payload?.effortUnitId,
      linkedSkillId: row.payload?.linkedSkillId ?? row.payload?.primarySkillId,
    },
  }));
  const report = { generatedAt: new Date().toISOString(), project: 'gttcoocfkqwvsqfwxpyo', identity: qa.id,
    purpose: 'disposable_normal_ai_client_verification', action: 'READ_ONLY',
    authorization: 'AWAITING_EXPLICIT_ID_SCOPE_CONFIRMATION',
    ownerDataRead: false, mutationPerformed: false,
    counts: entities.reduce((counts, row) => ({ ...counts, [row.entityType]: (counts[row.entityType] ?? 0) + 1 }), {}), entities };
  writeFileSync('reports/release/isolated-qa-cleanup-proposal.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ identity: qa.id, action: report.action, counts: report.counts, authorization: report.authorization }));
} finally { await client.auth.signOut({ scope: 'local' }); }
