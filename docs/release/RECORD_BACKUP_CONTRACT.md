# Record Backup and Restore Boundary

`questlife.records.backup.v1` wraps exact AppData plus export time and the current
sync owner ID. It contains private, unencrypted records. Export requires explicit
confirmation and uses a browser download or the native file share sheet. Returning
from a share sheet does not prove the receiver saved the file.

Restore is an explicit Settings or first-launch action, not automatic startup hydration. The
first-launch entry precedes Today, so automatic decision records do not prevent a
legitimate fresh-device restore. It only
accepts a signed-out, never-bound, empty local replica, checked inside the Sync V2
transaction. Existing records, versions, outbox entries, conflicts or quarantine
prevent it. The original owner binding is retained. An account backup cannot be
silently uploaded to a different account. Legacy unwrapped JSON exports remain
readable exports but are not accepted as account-safe restorable backups.

Validation derives from existing AppData types, rejects invalid nested fields,
duplicates, unsafe object keys, QA provenance and oversized/deep files. No coercion,
defaults, regenerated IDs or invented observations. Current appearance settings
are retained. No credentials, device journal, raw Health repository, permissions
or system Calendar writes are restored.

Validated projections and eligible outbox mutations are written to the existing
sync journal before projection. An interrupted projection recovers from that WAL.
Local capture drafts remain local. Sign-in still uses existing pull-first CAS
reconciliation: newer remote records and tombstones win, conflicting backup values
remain reviewable, and no automatic resurrection occurs.

Tests: `scripts/test-record-backup.mjs` (17 local groups), five native-component
file-action tests, shared Settings entry checks. These are not evidence of physical
device file-provider delivery, cloud email delivery or user-data recovery acceptance.
