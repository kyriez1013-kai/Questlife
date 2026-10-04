# QuestLife V1 End-to-End Completion Ledger

Updated: 2026-10-05. This is the single current completion checklist and resume
checkpoint for `QUESTLIFE_END_TO_END_COMPLETION.md`. Earlier phase reports are
historical evidence, not completion claims for this candidate.

## Baseline and Boundaries

- Canonical checkout: `/Users/kyrie/Documents/Codex Questlife/QuestLife-v1`.
- Branch: `release/questlife-v1`; verified starting HEAD `507d0a5`.
- Initial worktree clean; no post-HEAD edits were discarded.
- Quant checkout: `QuestLife-Quant`, `integration/multivariate-driver-v1`, clean.
- Main, historical worktrees, production owner data, and untracked `docs/quant/`
  are out of scope for destructive changes.
- Candidate deployment is authorized; replacing owner production requires
  acceptance. New fees and credentials/device consent still require the owner.
- Internal APKs and green builds are verification artifacts, not final product
  delivery. Full functional, LLM/Quant, sync, source/permission and safety gates,
  approved Web/native UI, and necessary physical acceptance remain in scope.
  Final UI images come from the other Chat; no old design is silently promoted.
  Owner Web/backend promotion and matched installers follow final acceptance,
  with backup/rollback. No app-store submission is authorized.

## Completion Checklist

Status vocabulary: IMPLEMENTED, VERIFIED_LOCAL, VERIFIED_REMOTE,
VERIFIED_DEVICE, VERIFIED_USER_MANUAL, AWAITING_OWNER, BLOCKED. User-manual
evidence is identified separately from agent-observed runtime evidence.
Unchecked entries remain unfinished.

| Item | Current status | Evidence / next executable action |
| --- | --- | --- |
| Canonical worktree and branch | VERIFIED_LOCAL | Current functional/security source `464845e` on `release/questlife-v1`; latest internal native artifact is `d773efa`, not the later prompt/copy/instrument-label changes. User-owned untracked `QUESTLIFE_QUANT_UI_CONTRACT.md` remains unread, unchanged and excluded from commits/uploads |
| Vercel authorization | VERIFIED_REMOTE | Existing candidate project `prj_fVGFV7DzxfkLqbBpSo8P7NH9oqxX` / `questlife-v1-release`; candidate CLI deployment authorized. Old Owner project is not the deployment target |
| Isolated Supabase backend | VERIFIED_REMOTE | `gttcoocfkqwvsqfwxpyo` created; both reviewed migrations executed in SQL Editor; four RLS tables, six RPCs and Realtime publication verified. Existing production `gtlknzltzntfltgjvgxx` untouched |
| EAS / iOS signing | VERIFIED_REMOTE simulator build; BLOCKED local execution/signing | Same-source `ecf37b9` build `2c9fcda8-e2cb-4f3d-a7d1-dfd1ce0eb73d` downloaded and inspected: 1.0.1/build2, iPhoneSimulator, candidate services, Widget extension and App Intents. Not executed. Mac has Command Line Tools but no Xcode/simctl; no phone signing credentials. Owner declines paid membership; no new fee |
| Physical devices | AWAITING_OWNER | Dedicated API36 arm64 emulator is connected; no physical device is connected and no physical acceptance is claimed |
| Auth and bidirectional sync | VERIFIED_LOCAL isolated UI + Android emulator + candidate backend; real email restoration VERIFIED_USER_MANUAL | User confirmed real email sign-in, refresh, tab close/reopen and the same synced account. Disposable normal-client lifecycle and account isolation evidence retained. Latest normal History edit changed SQL40 to SQL45 on the same record, revision3; another authenticated Web client and real Quant evidence updated. Original explicitly approved unsynced SQL raw was deleted through normal UI and remained absent after refresh. Earlier interrupted local-origin cleanup and populated physical two-device acceptance remain open; latest full QA dataset cleanup requires separate approval |
| Commit-order concurrent sync | VERIFIED_LOCAL | PostgreSQL 18, separate backend connections: 10/10; delayed lower sequence, CAS, idempotent receipt/delete and RLS; no hosted claim |
| Legacy anonymous endpoint safety | IMPLEMENTED, VERIFIED_LOCAL | `/api/sync` fails closed (410); Quant verifies Supabase bearer UID; 17 backend scenario groups passed |
| Normal cloud AI and sensitive-context consent | IMPLEMENTED, VERIFIED_LOCAL + VERIFIED_REMOTE normal Web UI | SQL, Basketball and Bench normal Capture -> real parse -> confirm -> refresh persisted with exact lineage. Sports uses a custom duration; Bench82.5kg/5reps/3sets survives save without inventing duration or quality. Instant Useful/Not useful are distinct revisions of the same DecisionResult; selected Not useful restored in a new authenticated client. `b795854` real daily brief correctly distinguishes energy2/focus4/physical4 and missing numeric sleep evidence. Imported-context and Health cloud sync stayed off. Two Web origins, not physical devices |
| AI authorization / expense abuse | IMPLEMENTED, VERIFIED_LOCAL + VERIFIED_REMOTE | Paid parse/brief require verified bearer. Atomic guards: 12 units/user/minute, 200/user/day, 1500 global/day; parse1, brief3. Independent Quant budget uses the same private ledger. Migration003 readback anon/client=false, server=true, RLS/Quant cleanup=true. A real QA-only minute limit caused the normal Insights error/Retry/last-result UI; retry after window reset restored real results. Latest candidate valid anonymous/forged brief and Quant requests return401; retired sync410. These are admission guards, not analytical eligibility or exact currency |
| Release safety gate | PARTIAL, NOT_PASSED | 511 reachable commits scanned with redacted Gitleaks; 11 classified non-secret false positives. Latest464845e exact-value scan of1154 tracked files/70,959,997 history bytes/53 Web files/13 canonical d773 APK entries/95 existing iOS files found0 matches across6 authorized credential classes. Restricted quant documents excluded. Sensitive Vercel values cannot be downloaded, so provider-key exact coverage is unavailable. Unknown secrets, log retention, native local data and physical privacy/permission acceptance remain open; no full security signoff |
| Real Quant runtime | VERIFIED_REMOTE (isolated fixtures) | 9 hosted checks: authentication, subject/as-of rejection, 210-observation computation, correction hash, empty-after-removal, QA exclusion and cross-subject isolation; `reports/release/quant-hosted-verification.json`; no owner data/database writes |
| Native Today/materials/sheets | IMPLEMENTED, partial emulator verification | Standalone release opens Today S0 and State sheet; settled sheet shields background text and Cancel leaves state unrecorded. 31 component tests. Full keyboard, dark-theme and physical acceptance pending |
| Native Goals / Schedule / Settings | IMPLEMENTED, partial emulator verification | Android Schedule moved a QA block to 14:00-15:00 and the Web client received the change. Web created and deleted three QA blocks; second Web client and Android converged to zero. Native Settings source entry opens and reports Health and Calendar permissions unrequested. Physical provider data, conflict cancel in a real browser, and broader native acceptance remain pending |
| Native Insights workspace | Earlier candidate/emulator flow VERIFIED_LOCAL; latest Web recovery VERIFIED_REMOTE | Prior7/9/empty and reverse5/6/empty retained. Existing account/tab/foreground recovery rejects stale results. Latest real Web current-record edit updated exact Quant evidence; actual quota rejection retained last result and Retry restored results. `464845e` names existing state and strength instruments without changing Quant numbers. Current installed native label/recovery interaction and physical acceptance remain open |
| Health / Calendar / Notifications | IMPLEMENTED, VERIFIED_LOCAL; Android Health system-entry partial emulator verification | `1f09631` adds normal Settings permission management and recheck, without cloud consent changes. Installed Release opened the real Health Connect onboarding; no read grant or provider data acceptance is claimed. Calendar intents/reconciliation and notification lifecycle/quiet hours retain prior isolated evidence. Actual samples, OS writes and delivery remain device/provider gates |
| Shortcuts / deep links | IMPLEMENTED, VERIFIED_LOCAL | Installed canonical Android warm `questlife://capture` opens the existing Capture sheet; cold `questlife://state` opens the existing detailed state sheet. Screenshots under `reports/release/canonical-android/`; no record saved. Earlier intent/plugin checks retained. Widget placement, notification taps and physical-device acceptance remain pending |
| Isolated example mode | VERIFIED_LOCAL installed Android emulator | Latest `e44ba06` normal Insights entry and isolated mature example loaded. Line/candle switch, observation evidence Sheet and close/scroll restoration operated through normal UI. No example is written to Store/outbox/OS; not personal runtime, physical-device or all-example acceptance |
| Standalone Android release APK | VERIFIED_LOCAL canonical signature/cover-install; earlier standalone runtime VERIFIED_LOCAL | Latest internal d773efa arm64 APK is1.0.1/code2,47,274,640bytes, SHA256babca17cbd15439b7b185c290b23495f997a09f6df4262fb20f1d8a2643a09db. Canonical EAS certificate unchanged. Isolated CloudQA install-r preserved four existing DB/preferences hashes and first-install time without uninstall/clear. This is not populated auth/session acceptance. Post-install d773 standalone/keyboard/chart acceptance is blocked by Mac lock; earlier496 standalone/deep-link evidence remains valid only at that source |
| Standalone iPhone installation | AWAITING_OWNER / BLOCKED signing | Latest 1.0.1/build2 simulator archive is not a physical iPhone installer. No IPA, phone installation or simulator execution claim. Xcode, normal Apple personal-team setup and attached-device consent remain missing; no membership purchase |
| Same-version Web candidate | VERIFIED_REMOTE deployment + normal-client464845e UI | Candidate464845e READY dpl_CjPPHfeeZ6FHBNhVcGdQJfWTXeaf at the existing alias. Entry bundle index-b0784a26138dedfac87477d9e39cd30a.js; changed split common chunk SHA256a3fa6e17030d7a160dd95d1c102ad1dd8c0428b80e06ae16bc9056ee3a12cbf4 matches local bytes. Ordinary same-QA login restored3 records/state/feedback; current English and Chinese dark UI names the true metrics, weight82.5 links to its exact execution evidence. Current-source browser error log empty; deprecation/platform warnings remain. Fresh375 override failed, not a mobile pass. Native d773efa is explicitly older; no Owner promotion or matched-final-release claim |
| Record backup / restore | IMPLEMENTED, VERIFIED_LOCAL and candidate browser file flow | Versioned exact-record backup, original account binding, structural validation and empty-replica WAL restore. Real populated ExecutionLog + EffortUnit export/import/refresh/re-export preserved exact original JSON by ID; both disposable copies deleted and read back empty. Physical file-provider and account UI recovery acceptance pending |
| Native recordings/performance | Bottleneck fixed and background path VERIFIED_LOCAL; end-to-end NOT_PASSED | Fresh `530fe4f` ReleaseQA mature-example trace: 135 frames, P50 15ms/P95 31ms/20 above20ms/12 deadline-janky; first RNCWebView create 200.470ms on UI thread. `ecf37b9` AndroidX background startup compiled; installed `49622b1` cold trace moves provider153.228ms/native library41.165ms to `questlife-chart` background thread. Not a chart-interaction P95 comparison. Native input connection fails while screenshots remain readable; keyboard, long-list, full post-fix chart trace and recording remain UNVERIFIED |

## Exact Resume Checkpoint

### Current normal-client integration and safety evidence (2026-10-05)

- Exact current application source: `464845e`. Narrow functional commits:
  `b795854` (subjective-state semantics/truthful save copy), `464845e`
  (existing Quant instrument names). No final visual layout, model, schema,
  Store/sync protocol, Owner data or signing family changed.
- Real `b795854` daily brief on the existing isolated state now reads
  energy2/overall2 separately from focus4/physical4 and explicitly does not
  infer sleep debt from the presence-only sleepQuality flag. Normal Refresh
  brief produced AI source/deepseek-chat/endpointOk=true/finishReason=stop;
  latest persisted daily result `decision-1791142359776-daily`, revision1.
  No extra StateCheckIn was saved to test this correction.
- Source b795854 candidate deployment is READY:
  `dpl_ExnVSqo5SrpxWA8P2X2wQQYgBRig`,
  `https://questlife-v1-release-pbz4caxdg-kyrie-z-s-projects.vercel.app/`,
  bundle `index-b0784a26138dedfac87477d9e39cd30a.js`.
  The immutable URL requires the existing Vercel dashboard login; unauthenticated
  external401 there is deployment protection, not application Auth evidence.
  The candidate alias remains `https://questlife-v1-release.vercel.app/`.
- Normal History Edit -> Save -> refresh changed SQL40 to45 on
  `capture-rc-muu5u1i0o3qq73-0`, revision3. Another Web client and live Quant
  show45 on the SAME `appdata:execution:capture-rc-muu5u1i0o3qq73-0:duration`.
  Real Basketball parse/save stores17 custom minutes; real Bench parse/save
  stores82.5kg/5reps/3sets. Missing duration remains unrecorded in the UI/Quant,
  not an invented zero observation. No quality or post-action state was added.
- Proven QA Capture lineage is stored, not guessed from adjacent timestamps:

  | Case | RawCapture | ExecutionLog | Skill |
  | --- | --- | --- | --- |
  | SQL45 | rc-muu5u1i0o3qq73 | capture-rc-muu5u1i0o3qq73-0 | muu5uyj5kt8egq |
  | Basketball17 | rc-muu749nev4aq20 | capture-rc-muu749nev4aq20-0-0 | muu75brl0if0ns |
  | Bench82.5/5/3 | rc-muu75ou0qo0vjy | capture-rc-muu75ou0qo0vjy-0-0 | muu76xq4uhst4l |

  Exact primary EffortUnit/ContributionLink IDs and linkage are in private
  `~/Library/QuestLifeToolchain/security/normal-ai-capture-lineage.json`.
  ContextLog count0. State `muu61sm8q5pyji` is the separately authorized QA
  observation, NOT a Capture-linked entity. Do not infer it is linked from a
  missing raw ID. All these records belong to disposable identity
  `df82f5ae-3ebe-4556-9f75-4002e00728ae`, not Owner.
- Live Quant duration series has exactly17 and45 from their real IDs; no fake
  baseline from two points and no zero-minute Bench point. Current normal
  b795854 Insights loaded the same evidence. Real QA-only Quant minute admission
  limit returned a service error, retained the previous result and exposed Retry;
  normal Retry after quota expiry restored real results. It did not display the
  failure as insufficient data. Existing private quota accounting was exercised,
  not mocked API interception or an account-wide reset.
- New-client Instant Read reopening retains Useful=false/Not useful=true on
  `decision-1791139227057-instant`, revision3. Existing2->3 Useful->Not useful
  persistence evidence retained; no second instant result created by feedback.
  Daily-refresh history results are separate from Instant Read feedback.
- Natural AI suggestion-only proposal has no ScheduleBlock ID and Apply remains
  disabled in normal Schedule. No automatic adjustment, fabricated block or
  force-applied proposal. Natural safe Apply/Undo and Rescue are still open.
- Existing detailed-state form was opened, not saved:375x667,393x852 and
  1280x900 document widths match viewports; no radio touch target below44px.
 375 footer buttons150.5x48 within y595..643; desktop285x48 within y728..776.
  Physical keyboard/scroll acceptance is NOT inferred from these DOM checks.
- Actual runtime revealed unnamed overall-state and strength metrics. `464845e`
  maps the existing state_overall/energy/mood/physical/stress and
  strength_weight/set_count/rep_count/rpe label keys to zh/en. Unknown constructs
  retain the existing fallback. Quant values, units and eligibility are unchanged.
  Insights presentation/watchlist/analysis boundary checks, typecheck and Web
  export passed. READY deployment `dpl_CjPPHfeeZ6FHBNhVcGdQJfWTXeaf`,
  `https://questlife-v1-release-ohc8yaym9-kyrie-z-s-projects.vercel.app/`.
  Entry bundle remains index-b0784a26138dedfac87477d9e39cd30a.js; exact changed
  split common chunk SHA256 is
  a3fa6e17030d7a160dd95d1c102ad1dd8c0428b80e06ae16bc9056ee3a12cbf4.
  Candidate alias HTTP200 matches current local chunk bytes; cache-control is
  max-age=0/must-revalidate. Do not identify source solely by an unchanged entry
  filename. A new ordinary OTP client sign-in to the SAME QA identity restored
  all3 records, the existing state and feedback; pending sync0. English then
  normal Chinese/dark preference selected showed meaningful names for2/5,
  5reps,3sets,82.5kg. Selecting Training weight -> Observations showed the exact
  `appdata:execution:capture-rc-muu75ou0qo0vjy-0-0:structured:weight`,82.5kg,
  confirmed source and record time. One point stays a point; no trend/reference
  invented. This admin-issued disposable OTP is not email-delivery evidence.
- Current-source captured browser error log is empty. Existing warnings remain:
  Supabase2.116 deprecated lock option, object-form navigation deprecation, and
  unsupported Web push-token listener. They are not classified as runtime errors
  or silently declared absent. Current375 viewport override returned no applied
  sizing: actual1470x779 remained. The new label screenshots are named1470,
  not375; new375/393 label wrapping is UNVERIFIED. Earlier exact state-form
 375/393/1280 checks retain their earlier source scope. Override reset afterward.
- Current local acceptance of b795854: AI boundary16 groups; Capture provenance6
  and Today feedback/reachability5; typecheck/build. Canonical artifact scan found
  no known private-value leak in the stated scope, not a full safety signoff.
- Latest necessary internal APK d773efa was cover-installed on emulator5556,
  no Owner uninstall/clear. Current provider/prompt changes are server-side;
  updated labels/save copy are NOT claimed in that older native bundle.
  XcodeBuildMCP still reports xcrun simctl missing; no iOS simulator run/IPA or
  physical iPhone acceptance. Mac is currently locked; no lock bypass used.
- User's original exact SQL raw deletion confirmation was executed and refresh
  read back absent. A separate batch confirmation for the newly created QA
  dataset/identity is unanswered. Do not expand the original confirmation to
  all new skills, state and feedback. Earlier localhost8098 local-only cleanup
  remains pending normal site-data UI access; remote cleanup evidence retained.
- Private evidence screenshots: normal-ai-current-scale-brief.png,
  current-candidate-feedback-restored.png, normal-ai-quant-updated-evidence.png,
  normal-ai-quant-two-durations.png, normal-quant-service-error-retry.png,
  normal-quant-retry-restored.png, normal-ai-suggestion-only-disabled.png and
  normal-ai-state-{375,393,1280}.png under the private toolchain/security directory.
  Current label/point evidence: current-candidate-quant-labels-1470.png,
  current-candidate-quant-zh-dark.png and current-candidate-weight-evidence.png.
- Normal History first/middle/final detail traversal after refresh and SQL edit
  showed Bench82.5/5/3, Basketball17 and SQL45 with their respective content,
  not inherited strength values. Exact persisted lineage is the stronger ID
  proof; deletion/re-sort of the NEW dataset is not yet claimed.

Next exact action: resume native input and precise viewport control only after
manual Mac unlock; current464845e candidate label deployment/UI readback is done.
Preserve the existing QA identity/current state. On separate explicit
cleanup approval, use formal deletes for the exact QA lineage, verify both
replicas/Quant/remote tombstones, then remove the disposable identity. Restore
native input only after manual Mac unlock; continue matched-source Release chart,
keyboard and populated canonical cover-upgrade validation. Physical providers,
iPhone signing, final approved images and full safety/acceptance remain open.
Do not promote Owner or rebuild unchanged code merely to report another APK.

### Normal-client AI, feedback and Capture correction (2026-10-05)

- Candidate `dbee74b`, READY `dpl_8zZFxYJNtshsbBv8C8CWL5bXnK9u`, bundle
  `index-c77a41f8a6bf7e1c57c772a33bc64c90.js`: Web now uses same-origin APIs.
  This repairs an actual OPTIONS405 parse failure on immutable deployment URLs;
  native still uses the pinned candidate HTTPS service. No Owner target changed.
- Normal disposable client `df82f5ae-3ebe-4556-9f75-4002e00728ae` signed in
  through the ordinary OTP form using a privately generated admin test OTP.
  This is not email-delivery evidence. Existing user-confirmed email-link and
  close/reopen session evidence remains separately scoped.
- Real SQL40 Capture -> DeepSeek -> pending Practice -> Confirm -> refresh:
  RawCapture `rc-muu5u1i0o3qq73`, ExecutionLog
  `capture-rc-muu5u1i0o3qq73-0`, Skill `muu5uyj5kt8egq`, and their exact
  EffortUnit/ContributionLink persisted. Another authenticated Web client
  received the same SQL40. Real Live Quant displayed 40min and exact evidence
  `appdata:execution:capture-rc-muu5u1i0o3qq73-0:duration`, with no baseline
  manufactured from one observation. Android/physical two-client acceptance
  has not been added by this Web test.
- Explicitly isolated, non-neutral QA StateCheckIn `muu61sm8q5pyji` produced
  real AI Instant Read. Useful -> refresh -> Not useful -> refresh retained
  distinct values on the SAME `decision-1791139227057-instant`, revision2->3,
  with one instant DecisionResult, not duplicate records. `382a475` adds Web
  pressed accessibility state without changing handlers or persistence.
- The original pending unsynced SQL raw was deleted only after the exact user
  confirmation, through normal UI; refresh still showed no records. Newly
  created isolated verification entities above remain pending separate cleanup
  approval. Do not treat the original raw approval as authorization to delete
  this entire account, StateCheckIn or skill. No Owner observation was written.
- Existing stateless verifier identity `5aad1ba7-8e2d-4da2-9533-508be5ddf3aa`
  now has real SQL readback sync0/private-account-budget0/retention-trigger1,
  supplementing the prior Auth404.
- Actual normal Basketball parse exposed strength-only controls. `f621df5`
  separates concrete sports from strength evidence, keeps a custom duration
  input, uses existing time_based/cardio_recovery values, and localizes known
  activity labels. `0ea681b` accepts real parser weightKg/scalar sets and fixes
  array-only provenance that could throw on save. No schema/Quant model added.
- Latest targeted gates passed: backend auth19 groups; isolated PostgreSQL
  budget9 groups; Capture kinds/provenance6; Today reachability/feedback5;
  durability17 + actual Store/callback26; typecheck and Web export. Hosted
  confirmation of new Capture source, new native build/runtime and cleanup
  readbacks remain next actions, not passed by these local tests.
- Mac relocked; native click/raise reports locked. Do not bypass it. Browser
  verification and source work continue. Latest installed b876 Release has not
  received full post-install cold-start/keyboard/chart performance acceptance.
  Physical permissions, iOS signing/Xcode and final approved UI are still open.

Next exact action: finish `0ea681b` candidate-only deployment and ordinary
Basketball/Bench Capture verification; confirm current persisted feedback and
Quant service admission. On explicit cleanup approval, use normal deletes for
the exact QA lineage, verify both clients/Quant updates and remote tombstones,
then remove the disposable identity. Resume native interaction/performance only
after Mac unlock; do not rebuild unchanged source or promote Owner Production.

### Active functional and safety continuation (2026-10-05)

- Starting clean source `8e3a3a3`, same release worktree and candidate backend.
  No Owner records, final visual layout, Quant calculations or Sync V2 protocol
  changed. Necessary ordinary AI settings/error entries are in scope now.
- Actual gaps repaired: unauthenticated paid model proxies; legacy brief memory
  trusting caller anonymous identity with service-role access; duplicate server
  DecisionResult writes; debug/raw capture and provider logs; native AI limited
  to browser-only debug switches. Brief memory now uses verified bearer/RLS on
  existing Sync V2 projections. HomeScreen remains sole result writer.
- `202610050001_ai_request_budget.sql` applied through normal Candidate SQL
  Editor. Real readback: anon_can_claim=false, client_can_claim=false,
  server_can_claim=true, rls_enabled=true. Only new accounting rows affected.
  Server-only candidate Vercel role key added as a sensitive variable; existing
  sensitive model values remain non-downloadable, not falsely called missing.
- Local targeted checks: AI boundary14/14 plus Vercel compiler-mode check,
  isolated actual PostgreSQL budget8/8,
  existing backend auth17/17, adaptive decision scenarios, TypeScript and Web
  build, and 120 affected native/settings/Insights tests passed.
  Initial parent tests lacked the isolated runtime and then the new child
  mock; harness updated, not application permission/behavior weakened.
- Historical scan excludes protected quant documents. Confirmed false positives
  are build/database hash metadata, the public Figma file ID, translation keys
  and imported type names. No known genuine leak found in this scan; this is
  not evidence that an unknown secret or private historical log cannot exist.
- Commits `bf91989` (account-bound AI consent/auth/quota), `d4bb568` (server
  compiler narrowing) and `f80007c` (Auth-account retention and durable QA
  cleanup evidence) are pushed only to release. First candidate deployment
  `dpl_3QZkvZMBWWmcdfReGUD5ZTzTydp4` ran three real DeepSeek Capture requests
  and an empty Instant Brief successfully. Its server compiler logged two
  narrowing errors despite READY; `d4bb568` repairs them and new deployment
  verification is pending. Bundle: `index-32600c5a55ecf0c0c5c98f0e2e05ad7c.js`.
- Retention migration `202610050002_ai_budget_account_retention.sql` applied
  to candidate only. Auth delete removes exact per-account accounting keys,
  not global spent quota or observations. Interrupted disposable identity
  `95a19317-2fd3-4ce4-9a64-d86bea9c9d3a`: exact sync count0 before deletion,
  Auth404 after; SQL readback sync0/accounting0/trigger1. The initial verifier
  incorrectly attempted service-role table read denied by existing grants;
  corrected to actual authenticated client reads, without expanding privileges.
- Android CloudQA touch input is restored this session. Normal app drawer,
  standalone launch, English selection and empty Today worked. No state or
  Owner observation saved. This supersedes the earlier input-connection blocker,
  not the pending chart/keyboard/full-performance acceptance.
- Candidate real authenticated model UI checks, new build receipt, and
  corrected deployment readback follow the narrow functional commits. Existing
  Android/iOS artifacts predate this change and are not described as updated.
  Physical source data/delivery, full installed chart P95 and final visual
  acceptance remain unfinished. An external device gate does not stop these
  other functional/safety repairs.

Next exact work: finish corrected candidate deployment; verify real
authenticated parse/brief and normal AI consent/retry through an isolated client;
clean only exact disposable identities/records. Continue remaining source,
notification, native interaction and safety gates without rewriting the product.
Do not promote to Owner or package unchanged code merely to produce another APK.

### Current canonical version line (2026-10-05)

- Commits pushed only to `release/questlife-v1`: `7e27b26` (canonical signing and
  version source), `ecf37b9` (asynchronous Android chart-engine startup),
  `49622b1` (force real bundling and reject stale/Owner service configuration).
  No final visual redesign, Quant/schema/sync rewrite, Owner data or paid service.
- Canonical package `com.kyrie.questlife`, 1.0.1/code2, certificate SHA256
  `61b030724c7ef8ab94681eb42b7033631f8c2086c78a4a79166a654e93eec5da`.
  Existing EAS key, not a newly generated local key. New local builds fail
  closed without that exact certificate; EAS uses remote credentials and the
  same committed explicit version. The incompatible old local/LAN `d2a08d...`
  certificate is retired. Do not uninstall a legacy Owner install to bypass it.
- Fully inspected cloud `1f09631` and cloud `530fe4f` both have the canonical
  certificate, appId and code1. Local `530fe4f` has the legacy certificate/code1.
  The newer cloud `530fe4f` full download is now verified, superseding the prior
  download limitation. See `reports/release/android-canonical-version-line.json`.
- Public cloud APK (application/native source `ecf37b9`):
  `https://expo.dev/artifacts/eas/R9veV4RI2ja5i12bm9A4wXBXEKkQ0bCSpVBiws_Gzbg.apk`.
  EAS build `74a0fec6-9650-4f89-b1fc-5129422ba1f7`, 108,192,997 bytes,
  SHA256 `21bf7ee1d5dca2ac7d38773da4efb7744ea8b2f3ecba03bc4570d24f1a2a771c`.
  Public redirect/asset rechecked HTTP200 via the Mac's already configured proxy.
  CDN retention header expires this free build file on 2026-10-18 15:48:58 UTC;
  this is a download retention limit, not an installed-app expiry. Keep the
  inspected local copy; GitHub release publishing was not performed.
- Latest local packaging source `49622b1`: 47,262,692 bytes, arm64 Release,
  SHA256 `0d1ebf328b45e72aaa52f559df04cbf3c3bea7f0a81173cd1178e5e5d388edec`.
  LAN HTTP200 at `http://192.168.5.28:8096/questlife-v1-49622b1-canonical-arm64.apk`.
  Cloud and local application Hermes SHA256 is identical:
  `46b42acd149321015fe60d060874ceaa5f4e9eb2c303c456190814cd2a04b39e`.
  `49622b1` changes packaging checks only, not application/native behavior.
  Both real APK assets contain candidate origin/ref/public key and not Owner ref.
- Bad local `ecf37b9` APK with stale unconfigured Hermes was quarantined before
  installation; its served URL was removed. Do not deliver it. Local packaging
  now forcibly reruns `createBundleReleaseJsAndAssets` before assemble and checks
  the actual APK, not the build process environment. Key material remains only
  in private toolchain storage, never repository/EAS upload artifacts.
- Isolated `QuestLife_CloudQA` API36 arm64 emulator: cloud1f -> local496 with
  `install -r`, code1 -> code2, no uninstall/clear. Exact existing RKStorage,
  preferences and SecureStore file hashes survived immediately after install.
  Scope is deliberately **empty records/no signed-in session**, not populated
  upgrade acceptance. Today opens independently; warm Capture and cold State
  links opened real sheets. No test state or Health observation was saved.
- UI control still reads screenshots but clicking the exact CloudQA window
  fails `noWindowsAvailable`, including after raising the observed window.
  Do not bypass the UI tool or classify this as a product login defect from
  attempted input. Populated cover-upgrade, native login/logout, keyboard,
  chart selection/zoom/reset, history scroll and recordings are not passed.
- A disposable candidate Auth identity used for the interrupted upgrade test
  (`fa874feb-cb34-4f2c-aeb9-54751e15f96f`) had zero synced entities on authenticated
  readback, formal cleanup returned zero live rows, and Auth deletion read back
  404. No Owner identity or record touched. Previous local origin8098 still has
  15 DecisionResults/pending work after its deleted QA account was signed out.
  Normal safe local-clear remains disabled by the pending-data guard. Do not
  weaken that guard or claim local cleanup; clear only that disposable origin
  through normal browser site-data controls after native input is restored.
  Its test tab and local gateway were closed/stopped, not its browser storage.
  Separately, the new agent-owned CloudQA emulator replica was explicitly
  cleared after collecting upgrade/screenshot evidence: `pm clear` Success,
  RKStorage and SecureStore absent on readback. Only emulator5556 was targeted;
  Owner/ReleaseQA were not cleared. Canonical package remains installed.
- Performance: old `530fe4f` mature isolated example, 158 total observations,
  30D/25 displayed, controlled normal example/candle/scroll/evidence-sheet flow.
  Android gfxinfo is the frame histogram, not component timing. Perfetto measured
  UI first-create200.470ms and Chromium init121.440ms (one263.934ms doFrame).
  New installed496 cold-start trace verifies actual provider initialization
  153.228ms and native-library load41.165ms on the background chart thread.
  This is a **thread-migration verification, not full chart/P95 acceptance**.
  UI startup tasks deliberately remain excluded from eager startup; controlled
  same-composition post-fix trace and physical performance are still required.
  Raw baseline/cold-start traces and frame histogram are retained in private
  `~/Library/QuestLifeToolchain/performance/`, not exposed by the LAN download server.
- iOS same-source EAS build `2c9fcda8-e2cb-4f3d-a7d1-dfd1ce0eb73d` finished.
  Downloaded archive SHA256
  `aca4c935c5c60f2cd692dfac9db2fbf623bedf365dd4e6cca229270285134fae`;
  inspected 1.0.1/build2, `iPhoneSimulator`, x86_64+arm64, embedded candidate
  services, Widget extension and App Intents. No Xcode/simctl installed here;
  no simulator run, phone certificate/profile, IPA or phone installation claim.
  Owner has no paid membership and declines fees. Normal Xcode personal-team
  setup with an attached iPhone is not yet configured and is not distribution.
- Candidate Web application sourceecf deployment remains the existing alias,
  no replacement project. All five tabs loaded through normal non-mutating UI,
  Settings1.0.1 and honest zero-observation Insights. Browser smoke is not a
  replacement for previously retained authenticated persistence evidence.
  Full bundle HTTP200 `index-01d9e465fed74289a6ab35125533e4a3.js`, SHA256
  `196725ce39cbdd198c3d06a56507d920fcfd515a95050ab6930646f7c560ef15`;
  candidate origin/ref/public key present, Owner ref absent. Isolated build
  worktrees and temporary QA credentials removed; LAN APK server stays running.
- Current packaging targeted tests 10/10, typecheck and configured Web export
  passed; Android Kotlin/Release and iOS simulator cloud builds passed. These
  do not establish native keyboard, provider permission/read, OS notification
  delivery, physical installation, populated session upgrade or final aesthetics.

Next exact dependent actions: restore native UI input; use the canonical APK on
an isolated emulator with a real disposable login and populated records, then
cover-install the same-certificate cloud artifact and read back session/records.
Capture the controlled post-fix chart/keyboard/sheet/scroll trace and recording.
Clear only localhost8098's disposable site data through normal controls. Complete
physical Android upgrade/provider/notification/widget acceptance without Owner
uninstall or clear. Install free Xcode through the normal Mac App Store/Apple
flow, run the existing simulator archive, then configure normal personal-device
signing/consent if available without new fees. Other existing evidence remains
valid; do not repeat unrelated backend tests or write fake Owner observations.

### Historical canonical Android checkpoint (2026-10-04)

- Canonical certificate is the existing EAS `GgK2fK6JvP` key, SHA256
  `61b030724c7ef8ab94681eb42b7033631f8c2086c78a4a79166a654e93eec5da`.
  Downloaded through the already authenticated EAS CLI and moved outside the
  repository into private toolchain storage. Local builds verify the exported
  certificate before building and refuse to create a replacement key.
- Local and EAS release profiles now use the same committed version source:
  `com.kyrie.questlife`, `1.0.1`, Android versionCode `2`. Explicit version bumps
  are required for later releases. The old local certificate `d2a08d...` is
  legacy/noncanonical and will not be used for new distributed builds.
- The cloud `1f09631` package has the canonical certificate and versionCode 1.
  The local `530fe4f` package has the incompatible legacy certificate and
  versionCode 1. No cross-certificate upgrade or Owner uninstall is attempted.
  Populated-record/session cover-upgrade remains pending the new build.
- Current device inventory contains only an Android emulator, no physical
  Android. XcodeBuildMCP confirms `simctl` unavailable; no physical iPhone
  installer or simulator execution is claimed. No paid membership is purchased.
- Fresh ReleaseQA Perfetto trace identifies first RNCWebView construction at
  200.470ms, Chromium initialization at 121.440ms, plus buffer-dequeue waits.
  This is an actual native/UI-thread trace, not a component or Web bundle proxy.
  Remediation and controlled post-build measurement are still in progress.
- Actual APK-asset readback caught stale Gradle JavaScript outputs in the first
  local `ecf37b9` assembly: its process metadata said configured, but its Hermes
  asset lacked the candidate services. The APK was removed from the download
  directory and quarantined, not accepted or installed. The cloud `ecf37b9`
  asset passes real configuration checks and matches the configured `530fe4f`
  Hermes hash. Local bundling now explicitly reruns the bundle task and checks
  actual UTF-8/UTF-16 APK strings for the candidate origin, Supabase URL and
  public key before publishing. It rejects Owner services and nonpublic keys.
  A corrected local build and runtime acceptance remain pending.

### Previous continuation: `530fe4f` (2026-10-04)

- Application commits: `1f09631` (native Health permission management/recheck)
  and `530fe4f` (cross-day Activity History reachability), both pushed only to
  `release/questlife-v1`. No final visual redesign, Quant change, new sync
  architecture, schema change, Owner observation or paid membership.
- Found and fixed an actual entry defect: with only yesterday's execution,
  Today's latest row was empty and History had no entry. Existing L2 utilities
  now include History when real executions exist, on both platform surfaces;
  the existing sheet, stable IDs, edit/delete callbacks and Store ownership are
  unchanged. Empty history does not leave a dead utility.
- Separate normal-client QA at local origin `127.0.0.1:8098`, current exported
  source and candidate Supabase: login A, refresh, close/reopen, logout, login B,
  and return to A. B could not sync A's bound records, nor display A's Quant
  result; authenticated readback returned zero cross-account rows. Admin-minted
  one-time links were used for these disposable identities: this is not an
  email-delivery test. The user's real candidate email/close-reopen evidence
  remains separately VERIFIED_USER_MANUAL.
- Normal Direct Log created a 7-minute custom execution. Real candidate Quant
  returned one observation and the UI displayed 7 minutes, then 9 minutes after
  a normal History edit, with evidence ID
  `appdata:execution:muskhnlx2eo0at:duration` unchanged. Authenticated readback
  confirmed revision 2 and the exact QA note. The local QA gateway forwarded
  only the existing authenticated Quant request to the candidate HTTPS service;
  it was not a substitute runtime or a production configuration change.
- Delete confirmation stalled the browser control connection and the Mac then
  locked. No UI-delete or local-after-delete refresh pass is recorded. Remote
  cleanup used the existing authenticated CAS deletion RPC, scoped to this QA
  identity and proven note/lineage: ExecutionLog `muskhnlx2eo0at` and EffortUnit
  `effort-muskhnlx2eo0at-primary`, both revision 3, `payload=null` and real
  `deleted_at`. Repeated identical mutation receipts matched. Remaining live
  QA rows produced a real authenticated Quant HTTP200 / 0 eligible observations
  (`ff1429f`), not a browser-refresh claim. Both exact QA Auth identities were
  removed and read back 404. See `reports/release/auth-lifecycle-cleanup.json`.
  The isolated local test-origin replica still needs normal UI cleanup/readback;
  no Owner origin or account was cleared.
- All 35 targeted Settings, Health recovery, History and wiring checks passed
  together after the final application edit; typecheck/Web build passed. The older
  History harness was updated for its existing i18n dependency and current
  presentation props; no application handler was altered. Health's 26 focused
  checks/typecheck/build also passed earlier in this same continuation.
- Candidate Web: `https://questlife-v1-release.vercel.app/`; exact deployment
  `dpl_YaXHtaSdkAu8vLN12XLuSZbAm5TZ`. Full bundle HTTP readback confirms
  `gttcoocfkqwvsqfwxpyo`, no Owner ref, and the new History action. Only the
  existing candidate project was deployed from a tracked-only worktree; the
  protected untracked contract and `docs/quant/` were excluded.
- Local latest Android: `questlife-v1-530fe4f-arm64.apk`, 47,262,668 bytes,
  SHA256 `fc67232a14b8db76ecc84feeb11b916fcd8b9290f86cb9b6ffbb3813d7d2ff3a`.
  Existing local certificate preserved; cover-installed on the dedicated
  `QuestLife_V1_ReleaseQA` emulator without uninstall or clear-data. Activity
  launch succeeded (warm Activity timing 565ms, not time-to-usable). LAN download
  HTTP200: `http://192.168.5.28:8096/questlife-v1-530fe4f-arm64.apk`.
- `1f09631` cloud APK was fully downloaded/verified: 108,192,889 bytes, SHA256
  `9c8702f356c607069f971485ec157402f9380d533048f2c5edd81d8c544f64ef`;
  certificate `61b030724c7ef8ab94681eb42b7033631f8c2086c78a4a79166a654e93eec5da`,
  same as older cloud versions and different from local/LAN signing. Its cloud
  and local Hermes bundles match exactly. Verified public cloud download:
  `https://expo.dev/artifacts/eas/fC_6BE2TnWf8fL4X2k5YZzBgeUKcpZ_1kq_gCefaR50.apk`.
  `530fe4f` cloud build `04c78177-4230-43e5-be13-0556c7af878d` finished on the
  exact source; its public artifact returned GET HTTP200 and size 108,192,973.
  Full download repeatedly timed out on this Mac, including through its existing
  configured proxy. No security/network configuration was changed. Full binary
  hash/signature verification for that newer cloud artifact is UNVERIFIED;
  incomplete files were quarantined/removed, not offered as installers.
  Metadata-level latest link:
  `https://expo.dev/artifacts/eas/_u6rxb52IJbbIyIjo96ncgRMHE1II4PuKNMQq36D4Rk.apk`.
  These are distinct versions: the verified `1f09631` cloud APK includes Health
  recovery; latest `530fe4f` local APK also includes the History entry fix.
- Cover-upgrade evidence is deliberately limited: old cloud→`e44ba06` retained
  the identity/journal on an empty isolated emulator, and local `e44ba06`→
  `1f09631` retained all six existing AsyncStorage values. Neither proves a
  populated authenticated phone upgrade. Never uninstall the Owner app to
  work around a cloud/local signature mismatch.
- Performance remains NOT_PASSED / incomplete, not silently repaired. Prior
  P95 32ms was the ReleaseQA mature-example Activity frame histogram, not a
  component duration. Retained diagnostic rows measured buffer-dequeue P95
  16.035ms versus UI work 0.847ms; this does not establish JS/Quant causation.
  New full composition, WebView, keyboard and physical performance acceptance
  were interrupted by input failure/lock. No material/animation changes were
  made from an unproven bottleneck.
- Mac has no `/Applications/Xcode.app` and still selects Command Line Tools.
  The existing simulator archive has not run and is not an iPhone installer.
  Free Xcode installation and normal Apple/attached-device steps await the user;
  no paid membership or unsupported HealthKit/signing claim. Real Health grant,
  Calendar writes, notification delivery, shortcut/widget and native recording
  acceptance remain open. Resume only dependent UI steps after manual unlock.
- Candidate non-mutating API smoke retained fail-closed semantics: retired
  `/api/sync` HTTP410 and unauthenticated Quant HTTP401. Real authenticated
  empty-after-delete was verified separately, not classified as insufficient
  data on a service failure. Isolated gateway process was stopped, tracked-only
  build/deploy worktrees removed and temporary QA login credentials removed.
  The LAN APK server remains available. Own interrupted browser tabs 3/4 at
  localhost8098 could not be closed while the confirmation/input connection was
  blocked; resume their local-only cleanup after unlock. Re-start the existing
  `/tmp/questlife-auth-lifecycle-server.mjs` only if that UI readback is needed;
  the QA identities are gone and must not be reused.

Immediate dependent resume work (not a new phase): physical/local installation
using the matching certificate family; normal UI cleanup of the isolated test
origin; latest hosted UI smoke; controlled installed Insights/keyboard/scroll
performance and recording; Health read-grant/revoke/recheck and Calendar/notification
OS flows with explicit device authorization; free Xcode installation and real
simulator execution. Reuse earlier Web/Android, schedule and conflict-safe Undo
evidence; do not repeat or write fake Owner observations.

### Unlocked-Mac continuation (2026-10-03)

- Current cloud `e44ba06` APK is now fully downloaded and v2-signature verified.
  Package `com.kyrie.questlife`, version `1.0.0` / code `1`, four ABIs, min26 /
  target36. SHA256
  `6c89e9f13e90ada6a43f04e4236caef68d4258c8bd1aba3ac77f851c8ec5cb73`;
  certificate SHA256
  `61b030724c7ef8ab94681eb42b7033631f8c2086c78a4a79166a654e93eec5da`.
  This matches prior cloud `05a4405`, not the dedicated local key. The cloud
  and local `e44ba06` embedded Hermes bundles are byte-identical (SHA256
  `575a78ecccafe402dbbbab8ad9202361735809659b94e18d60cbfcca9470b929`),
  contain candidate origin/ref and not the Owner ref. Public cloud download
  remains the link in the prior checkpoint, now inspected rather than metadata-only.
- Isolated headless `QuestLife_CloudQA` / API36 emulator cover-installed cloud
  `05a4405` → `e44ba06` with `adb install -r`. No uninstall or clear-data.
  Exact existing device identity + sync journal key/value hashes survived.
  This emulator has no populated user records or auth session: this is not
  populated-record, normal-UI or physical-phone upgrade acceptance.
  `reports/release/android-cloud-cover-upgrade-e44ba06.json` records the boundary.
- Native Settings now exposes an explicit Health permission-management entry
  and a recheck using the existing connect/sync handlers. Android opens Health
  Connect; iOS opens app Settings and explains where Health-app read access is
  actually managed, retaining `read_access_unknown`. Connected retries request
  only existing selected metrics. No new consent, source record or cloud upload.
  Twenty-six isolated Settings/helper checks, typecheck and Web export passed;
  new-source installed OS/provider acceptance remains UNVERIFIED until rebuilt.
- Existing `e44ba06` gfxinfo raw frame stages were separated: 120 valid retained
  rows, UI-work P95 0.847ms, render-submission P95 2.258ms, buffer-dequeue P95
  16.035ms, intended-vsync→completed P95 33.658ms. This is an unreset aggregate,
  not a controlled new benchmark. GPU/buffer pacing is measurable; a JS/Quant
  bottleneck or performance fix is not established. No blind production
  animation/material changes were made from these numbers.
  `reports/release/native-frame-stage-diagnostic-e44ba06.json` preserves scope.
- Mac UI-control input still fails after fresh binding and one tool reset
  (`noWindowsAvailable` / native pipe closed). Screenshots can be read; input
  cannot be used reliably. No alternate ADB/UI automation was used. Normal
  auth refresh/close/reopen, chart interaction, keyboard, OS permission and
  App Store/Xcode steps remain open. User was asked for normal-client readback;
  non-UI signing, build and safe component work continued.

### Current application candidate: `e44ba06` (2026-10-03)

- Continuing `release/questlife-v1`, not a replacement project. Application
  commits pushed: `7ced599` (native Insights lifecycle and request binding),
  `e44ba06` (email link is the primary sign-in presentation). No schema,
  Quant calculation or Store mutation contract changed in this batch.
- Actual email-login failure was candidate Supabase Auth configuration:
  Site URL was `http://localhost:3000`; redirect allowlist was empty. Through
  the user's normal logged-in Dashboard session, changed only project
  `gttcoocfkqwvsqfwxpyo` to Site URL
  `https://questlife-v1-release.vercel.app` and exactly two redirect entries:
  `https://questlife-v1-release.vercel.app/` and
  `questlife://auth/callback`. Saved Dashboard readback confirmed persistence.
  No wildcard, SMTP, schema, RLS, Owner project or paid setting was changed.
- User sent a new email, received a link and reported successful sign-in.
  Actual candidate Chrome Settings readback showed masked identity, synced
  status, last-success time and pending count zero. No private inbox, OTP,
  callback token or health record was exported. No QA observation was written.
  A browser refresh was attempted; subsequent desktop control returned no
  readable page contents, so post-refresh acceptance is UNVERIFIED pending
  user readback. This is not silently classified as an application regression
  or a passed session-restoration check.
- `AccountSyncSection` no longer reveals the numeric-code form automatically
  after requesting an email link. Link instructions remain visible; an
  explicit existing-code action still opens normal numeric verification.
  Existing PKCE redirect/parser/exchange and sign-in handlers remain in use.
- Native Insights now invalidates old results on an actual account or current
  record snapshot change, refreshes through the existing real Quant loader on
  entry/focus/foreground, and retains a same-snapshot result with an honest
  Retry error when the service fails. Example mode remains isolated. Chart
  bridge ready/error/selection events are bound to the current ephemeral
  request ID; Retry after native renderer loss remounts only the renderer.
- Affected tests: nine mocked recovery checks; 30 native chart/model checks
  in each of two timezones; 19 native Settings checks; seven auth-link checks.
  TypeScript and Web export pass. These are not a substitute for latest-source
  native UI, actual OS permissions or device frame times.
- Web candidate READY:
  `https://questlife-v1-release-5wt5aolku-kyrie-z-s-projects.vercel.app`,
  stable `https://questlife-v1-release.vercel.app/`, deployment
  `dpl_9gAhv6oKsbjz6ANAFsSwxkoNNYEB`, bundle
  `index-008ddea2e75804733806f5398a672752.js`. Build/upload used a temporary
  detached checkout of tracked `e44ba06` source only; user untracked files and
  restricted untracked quant docs were not uploaded. Root HTTP200 and actual
  candidate-only configuration verified; not a full new UI regression pass.
- Same-source local Android package:
  `reports/release/build-output/questlife-v1-e44ba06-arm64.apk`, 47,260,164 bytes,
  SHA256 `0e4803d7c60ab88818f108d09fbea49ea6d640a97d5db9d6b3bf166931f72413`.
  Dedicated local signing cert SHA256
  `d2a08d98261c601f6572c0c171810ff80530e55410cac780d3f0d928443867d6`.
  `adb install -r` cover-upgrade succeeded on the existing QA emulator without
  clearing its app data; normal Today S0 was visibly launched. LAN download:
  `http://192.168.5.28:8096/questlife-v1-e44ba06-arm64.apk` (HTTP200). Mac is
  required only for this LAN download, not subsequent app operation.
- Same-source Android EAS build
  `5b207aed-dddd-4c31-8e20-1ce65bf1256f` FINISHED at
  `2026-10-03T14:16:18Z`; source is exactly
  `e44ba06960fe5d5b7ac902d58c3e7be7c120602e`. Public artifact:
  `https://expo.dev/artifacts/eas/k9GO7x91ei6IbvfqFyugeF8HM_0S1cJFjxi92HfOktw.apk`.
  Redirected response is HTTP200 / 108,190,469 bytes; expires 2026-10-17.
  Full download/signature inspection remains UNVERIFIED: bounded TLS/download
  attempts timed out on this Mac, including individual range requests. Partial
  files are marked `.partial` / `.download`, not offered as installable APKs.
  Public EAS URL and source/build metadata are verified; the complete local-key
  APK above remains the fully inspected same-source upgrade artifact.
- Prior cloud `05a4405` APK was fully downloaded and inspected: remote signing
  cert SHA256 `61b030724c7ef8ab94681eb42b7033631f8c2086c78a4a79166a654e93eec5da`
  differs from the local internal key above. Do not uninstall a data-bearing
  local APK to force a cloud-key install. Preserve the local-key upgrade path;
  latest cloud cover-upgrade eligibility requires its own signature readback.
- iOS: downloaded existing `75f6d77` simulator archive containing a genuine
  embedded-code `QuestLife.app` and Widget/AppIntent metadata; no simulator run
  or physical install occurred. This Mac has no Xcode/simctl. Existing EAS iOS
  signing entries have no credentials. User explicitly has no paid membership
  and declines new fees. Do not request a paid upgrade or claim Apple Health
  passed. Free Xcode Personal Team testing would require Xcode, normal Apple
  login, an actual attached device and capability validation; not configured.
- Native emulator pointer input recovered after a data-preserving emulator
  restart. Actual `e44ba06` normal Insights showed signed-out Retry, not a
  misleading no-data state. Its existing isolated mature example loaded a
  25-observation focus chart; line/candle switching, outer scrolling,
  Observations Sheet and close-to-the-same-scroll-position were operated.
  This proves the installed example renderer path, not latest-source personal
  service recovery or real health input. No sample was copied into Store.
- Latest reset gfxinfo diagnostic across example candle/scroll/Sheet actions:
  83 frames, P50 19ms, P95 32ms, 19 histogram frames above 20ms, 14 janky.
  `reports/release/native-insights-e44ba06-runtime-sample.json`; NOT_PASSED.
  This is a partial API36 arm64 / host-GPU emulator render sample, not a full
  WebView frame trace, steady-state benchmark, physical device or all themes.
- Mac locked again during the return-to-Today operation; requested normal
  manual unlock without credentials. Keyboard, permission, widget,
  notification delivery and recording acceptance remain UNVERIFIED.
  Prior real cross-client
  mutation/Quant and Apply/conflict-protected Undo evidence below remains valid
  within its original version and isolated-account scope.

### Prior candidate closeout: `75f6d77` (2026-10-03)

- Real schedule-mutating Decision test used disposable candidate Auth user
  `89582b9f-6a76-4b7f-a56a-7fb797bddc73`, two independent Web origins and
  the existing candidate backend. Normal Schedule UI created a movable
  12:00-13:00 block. Normal Today Decision asked for the missing current state;
  the answer was stored only in the disposable decision context. Its explicit
  proposal shortened the exact block to 12:00-12:30. Apply changed the plan;
  the other client received 30 minutes. Undo restored 60 minutes on both.
  Re-applying and then editing the same block to 45 minutes on the other client
  caused old Undo to be rejected; the 45-minute edit survived. No Owner state
  observation or private record was created.
- The rejection originally surfaced the internal block ID and raw exception.
  `75f6d77` maps patch conflicts to localized user copy and offers a new
  review, without changing patch safety. Local browser regression confirmed
  the 45-minute plan remained and the new review read 12:00-12:45. TypeScript,
  adaptive-decision tests and Web export passed. Latest-source candidate deploy
  is READY, but this particular conflict state was not recreated remotely.
- The disposable cross-client QA Auth user
  `a547c40e-cbe3-422e-aac0-9cdbf37447d7` and the decision QA user above
  were each deleted after exact candidate-project and email/ID checks;
  Auth readback returned 404. Candidate sync tables use `auth.users(id) on
  delete cascade`. Independent PostgREST row-count readback using the admin key
  returned permission denied; do not claim a separately observed row count.
  The second account's final test ScheduleBlock was removed by account cascade,
  not by a confirmed normal-UI Delete, because browser automation stalled on
  that confirmation.
- READY candidate Web deployment `dpl_FZ6gFnBM8VYNnwrqSf8E7LuhkY3e`
  serves source `75f6d77` at `https://questlife-v1-release.vercel.app/` with
  bundle `index-8898c3b8b583c038f7d8635e029ea356.js`. Candidate backend
  ref is present; old Owner backend ref is absent. HTTP and normal Today,
  Settings and signed-out Insights smoke passed. A local proxy serving the prior deployed bundle cross-
  origin caused Quant to fail and correctly showed Retry; this was a proxy
  origin artifact, not a successful live-service test. The same-origin local
  client then completed the real Decision/Quant flow above.
- iOS simulator EAS build `0d0ba86d-eb07-4144-b4ea-de076d61415b` FINISHED
  for tracked source `768a951`, with candidate EAS environment. Artifact:
  `https://expo.dev/artifacts/eas/TsBqAxAG_1pPFXHOGml7Lx-s8a43SbW0mT1ZIBFu_tg.tar.gz`.
  No local Xcode `simctl`, no iOS simulator execution and no physical iPhone
  signing/device acceptance. This is not proof that Apple Health works.
- iOS simulator build `51fdd702-f718-4404-b44e-1c3d644db56c` FINISHED for
  Git commit `75f6d77`, candidate preview environment. Artifact:
  `https://expo.dev/artifacts/eas/F072lM_x1EXX4rayMWS4VqVI8sMbJWUVkjNPgy2Ujcc.tar.gz`.
  No simulator installation/runtime or physical iPhone acceptance was done.
- `05a4405` separated static QA fixture JSON from the ordinary V11 Insights
  screen. Web export changed its screen chunk from about 18.2 MB to 600 KB;
  the 17.6 MB fixture chunk loads only for explicit debug fixture routes.
  Local normal Insights and V0.42/V0.41 debug routes rendered; online normal
  Insights rendered without browser errors, and the 599,507-byte screen asset
  returned HTTP 200. `npx tsc --noEmit`, `npm run build`, and
  `npm run test:insights-v3` passed. This is asset-size evidence, not a measured
  device frame-time improvement. The debug chunk retry UI was not failure-injected.
  READY candidate deployment `dpl_Fpn1hXhZrRb7GirD68QYtVoSEspo` serves it at
  `https://questlife-v1-release.vercel.app/`, bundle
  `index-13351ff00b86f60164fe0c80ddd3e7bb.js`; full bundle scan found
  candidate ref only, not Owner ref.
- Next executable work: physical device permissions, notification delivery,
  shortcut installation and latest-source performance gates. Android emulator
  booted in this session but no operable window was exposed to desktop control;
  no new native UI claim follows from that boot. Do not re-use deleted QA
  accounts. The dedicated emulator `QuestLifeQA` user 11 was switched out and
  removed after exact user-list verification; a second list shows only user 0.
  This clears the isolated local QA app cache without touching the emulator's
  main profile. Preserve the untracked Quant UI contract.
- Same-source Android cloud build `90f3ac65-5517-411c-877f-9811d728164e`
  was submitted for Git commit `05a4405` using the candidate `preview`
  environment and existing QuestLife EAS project. Status was IN_QUEUE at last
  check, so package installation, launch and device performance are UNVERIFIED.
  EAS generated a new remote Android signing key; its certificate has not been
  compared with the earlier locally signed QA APK. Do not assume in-place
  upgrade compatibility. No paid tier or alternate project was created.

### Current functional source: `49f6d43` (2026-10-03)

- Following the cross-client record/Quant loop below, `7a256c9` made Web
  Schedule use the same overlap detection as native, recheck conflicts before
  save, preserve edited status/source, and wait for durable create/delete.
  Targeted Schedule component tests passed 25/25; TypeScript and Web export
  passed. Three isolated QA blocks were created in Web; native moved one to
  14:00-15:00; another Web client received it; all three were deleted through
  normal UI and both Web and Android converged to zero. Browser conflict-cancel
  interaction was not independently observed; component coverage passed.
- `49f6d43` exposed the existing owner Decision flow in native Today without
  changing its engine or Store. Quant service failure now displays a retryable
  error, not a false insufficient-data state. With no schedule in the isolated
  account, the native sheet showed the generic question and real missingness,
  not a phantom movable appointment. Explicit no-op Apply and Undo worked;
  after sync, Web reopened the exact DecisionResult. This does not verify a
  schedule-mutating patch or physical-device interaction. Native decision
  render test, adaptive-decision suite, TypeScript, and Web export passed.
- Signed Android candidate APK:
  `reports/release/build-output/questlife-v1-49f6d43-arm64.apk`, SHA256
  `e685a432691ff94ceac3d29e0fac872b2b6cab2c75fa32a613353a92b05655b7`.
  Installed in isolated emulator user 11. No Metro required. Android source
  points to the candidate backend; this APK is not an iOS or physical-device
  acceptance result.
- Candidate Vercel project is `prj_fVGFV7DzxfkLqbBpSo8P7NH9oqxX`, Supabase
  ref `gttcoocfkqwvsqfwxpyo`. Old Owner ref `gtlknzltzntfltgjvgxx` is not
  configured in the candidate bundle. Existing untracked Quant UI contract is
  user-owned and must remain untouched. Latest `49f6d43` push/deploy, a
  schedule-mutating Decision Apply/Undo check, source-permission device checks,
  QA account cleanup, and latest-source performance still remain open.

### Current functional source: `6f4f491` (2026-10-02)

- Three narrow code commits: `863ec67` existing email-code entry, `d7dc382`
  authenticated Insights to existing Quant runtime, `6f4f491` duration-edit UI
  with exact derived-data update. TypeScript and Web export pass. Targeted
  duration-edit pure-function test passes 17 assertions.
- Candidate backend ref `gttcoocfkqwvsqfwxpyo`; the local `.vercel` link was
  corrected from old `questlife-alpha` to candidate project ID
  `prj_fVGFV7DzxfkLqbBpSo8P7NH9oqxX` before any deployment. The old Owner
  Production ref `gtlknzltzntfltgjvgxx` is not used for this test.
- Disposable candidate account `a547c40e-cbe3-422e-aac0-9cdbf37447d7`
  (test-only `@example.com` identity): Web clients at localhost:8177 and
  localhost:8179 plus isolated Android emulator user 11. Initial email
  delivery was not tested; an admin-generated OTP was entered through the
  normal existing app code-verification UI.
- Normal UI loop verified: Web created SQL execution (7 minutes), Android
  received it and real Quant read 7; Web edited to 9, Android and Quant read 9;
  Web deleted, Android and Quant showed no observation. Reverse loop: Android
  created 5, Web auto-received 5; Android edited to 6, Web and candidate Quant
  showed 6 with first-observation provenance; Android deleted, Web and Quant
  showed no eligible observation. The Android outbox returned to 0 pending with
  0 conflicts. This is emulator verification, not physical-device proof.
- Earlier Smart Capture SQL execution and its linked effort/contribution,
  plus the Web direct log and its linked entities, were tombstoned by normal UI
  delete. The final Android record was also deleted. The disposable account
  itself and its remaining test-only SQL skill/DecisionResults still require
  cleanup after other isolated acceptance work.
- Current signed standalone APK:
  `reports/release/build-output/questlife-v1-6f4f491-arm64.apk`, SHA256
  `998c65d366b65c47a2791d7272c35ff0d160caa864c4c2742ca4e7819a71f4ed`.
  Local Web source is not yet on the candidate stable URL at this checkpoint.
- Next: push this branch, deploy **only** `questlife-v1-release`, verify live
  bundle/rollback boundary; then Schedule and decision UI flows, device-source
  gates, and final test-account cleanup. Do not claim iOS, physical Android,
  email OTP delivery, or final visual acceptance.

### Current installable source: `fd90542` (2026-09-22)

- Web and signed Android use exact source `fd90542d7606bf9048fb44698b8117730a98fa7a`.
  It includes `8a26f6b` chronological/unknown-value feedback fixes and `d74c98b`
  exact-record Today feedback navigation. All source changes are pushed only to
  `release/questlife-v1`. Owner Production and `main` were not promoted.
- Web: `https://questlife-v1-release.vercel.app`, exact deployment
  `https://questlife-v1-release-e64bpheyn-kyrie-z-s-projects.vercel.app`,
  `dpl_22N3JeSyVZzUPPSjXPDS5tyxFEMm` READY. Browser readback confirms
  `index-a58e86ef371880406da12b2502fbfc87.js`.
  Latest stateless API smoke **8/8 PASS**, including current-input matched
  basketball/SQL40/bench82.5-5-3 (2.4-2.7 seconds), 410 retired anonymous
  endpoints and 401 authenticated endpoint guards. No Store writes in this smoke.
- Android: `reports/release/build-output/questlife-v1-fd90542-arm64.apk`,
  47,249,100 bytes, SHA256
  `8ff8a15ef666686b7d3bd8ebbe5a4217a201b113652b1ed657fd745d993c0f1b`.
  Release build, installation and signature-v2 verification PASS; the installed
  APK hash matches. Embedded Hermes and candidate HTTPS/account configuration;
  no Metro dependency. LAN download HTTP200:
  `http://192.168.5.4:8096/questlife-v1-fd90542-arm64.apk`.
- Durable internal download: unpublished GitHub draft
  `https://github.com/kyriez1013-kai/Questlife/releases/tag/untagged-0806866655272c4c0a02`,
  release ID `393673895`, asset ID `581256377`. Server asset digest equals the
  local signed APK. Repository write access is required to see this draft;
  no public release was created. Browser asset download is not claimed tested.
- Full regression on application-equivalent `d6effe7`: **27/27 suites PASS**;
  13 feedback helper and five History component tests included. TypeScript,
  Web export and dependency audit PASS. `fd90542` changes verification records
  only. Latest hosted CTA smoke below passed after final deployment.
- Latest native UI/keyboard/recording/performance remain UNVERIFIED. Fresh CUA
  screenshot and the exposed Raise action work, but pointer dispatch still
  reports no available window. Do not call the Mac locked or reuse older frame
  metrics as this candidate's result. The isolated emulator's earlier `Test`
  Goal cleanup remains pending native interaction. Requested ADB UI control for
  that emulator is still awaiting an affirmative reply.
- Remaining external acceptance: physical Health/Calendar/notifications, email
  OTP and real two-device UI, Apple signing/UDID and iOS build allowance (Free
  quota reset 2026-10-01). Native visual quality and whole-product acceptance
  remain open. No paid upgrade, fabricated state or owner-data mutation.

### Historical installable source: `e458319` (superseded)

- Candidate only: `release/questlife-v1` pushed; owner Production untouched.
  Fix commits are `a70cdcc` (honest module progress), `8f56e02` (Web exact-skill
  recording entry), and `d6f05b9` (compact Goals header). Documentation commits
  `cbc4585` and `e458319` preserve the corresponding verification history.
- Same-source Web is READY: deployment `dpl_DtQVCficXyfueVUec8xGrMKYoTJj`,
  exact URL `https://questlife-v1-release-7m3ut2o80-kyrie-z-s-projects.vercel.app`,
  stable URL `https://questlife-v1-release.vercel.app`, actual browser bundle
  `index-a27b587047f398e72ec39ceaa108a5ee.js`. Final stateless API smoke: 8/8
  PASS; live basketball/SQL40/bench82.5-5-3 parse requests matched current input
  (2.7-3.0 seconds). No observations were saved by these API checks.
- Android file: `reports/release/build-output/questlife-v1-e458319-arm64.apk`,
  47,247,600 bytes; SHA256
  `a6d6612fdbdba6975fcab06762b6f45845137aa936a01390406e5808e1852fac`.
  Build and install succeeded; installed file hash matches. Signature v2,
  package `com.kyrie.questlife`, version 1.0.0, min SDK26/target36 and arm64
  confirmed. Embedded Hermes, candidate HTTPS backend/account configuration,
  widget and absence of unused storage/overlay permissions checked.
  LAN download returned HTTP200:
  `http://192.168.5.4:8096/questlife-v1-e458319-arm64.apk`.
- Full regression on `8f56e02`: 26/26 suites PASS, including typecheck, Web
  export and dependency audit (zero known advisories). Subsequent focused entity
  regression on `d6f05b9`: 41/41 PASS; typecheck and Web export PASS. Do not
  mislabel the older full suite as rerun against a different source.
- Final deployed five tabs loaded. Actual 375x667 English/light Goals header
  is readable; Chinese/dark Today at 375x667 and 1280x900, State sheet at
  393x852 render without horizontal document overflow. State sheet was canceled,
  not saved. Screenshots were inspected inline; no native recording is implied.
  Browser captured no runtime errors. Existing unsupported Web push-listener,
  Supabase lock deprecation and navigation-object deprecation warnings remain.
- Android installed interaction/recording/performance is still UNVERIFIED:
  CUA screenshots work but pointer dispatch has no available window. The Mac is
  not locked. Alternate ADB UI control was requested only for the isolated
  `QuestLife_V1_ReleaseQA` emulator; no affirmative reply has been received.
  Its earlier disposable `Test` Goal still needs normal-UI cleanup. Physical
  Health/Calendar/notification, email OTP and two-device UI checks remain open.
- iOS latest-source cloud build is blocked by Free-plan quota until 2026-10-01;
  Apple signing/UDID is separately required. No paid upgrade or physical-iPhone
  completion claim. Product/visual acceptance remains outstanding.

### Historical installable source: `2e1c496` (superseded)

- `release/questlife-v1` only. Latest source is pushed; owner Production is not
  promoted. The source preserves unknown actual duration/quality/strength sets,
  completes native Skill recording/library entries, and reduces duplicate native
  chart messages. No owner observation was fabricated.
- Full local regression at application-equivalent `4f40b67`: 26/26 PASS,
  including typecheck, Web export, source/account isolation and zero known
  dependency advisories. `2e1c496` only adds verification documentation/logs.
- Android `questlife-v1-2e1c496-arm64.apk` is signed and installed. Actual package
  manifest excludes broad storage/overlay permissions, excludes all 18 private
  backup/transfer domains, is non-debuggable and contains embedded Hermes JS.
  The installed APK SHA256 equals the downloadable file. LAN URL returns 200:
  `http://192.168.5.4:8096/questlife-v1-2e1c496-arm64.apk`.
- Hosted Sync: ten real HTTPS groups pass, both disposable users removed with
  zero remaining entities. No claim of email OTP or two-device UI acceptance.
- Same-source Web deployment `dpl_ELNRM9sQFwaRGnSnR6BG8YhA854L` is READY at
  `https://questlife-v1-release.vercel.app`. Actual public document returns 200
  with `index-67a4c3be12a39037b16210fc7bdc385d.js`. Eight latest API checks pass:
  live basketball/SQL40/bench82.5-5-3 input-matched parsing, retired anonymous
  endpoints and authenticated Quant/push rejection. No Store/database writes
  were made by this smoke test. Tag `v1-internal-candidate-20260922` points to the
  exact packaged source and is pushed; it does not imply owner acceptance.
- iOS final-source cloud compilation is BLOCKED by the provider Free-plan quota;
  physical signing/registration is separately AWAITING_OWNER. No new charges.
- The Mac was unlocked on 2026-09-22. Browser interaction resumed; the prior
  blanket lock blocker is superseded by the continuation evidence below.
  Native CUA screenshots work, but its pointer dispatch reports no available
  window even after emulator restart. This is an automation-control failure,
  not proof of an application failure. Alternate ADB UI control was requested
  for this isolated emulator only and has not yet been authorized.
- New-source native/screenshots/recordings/performance and Web interaction
  acceptance remain UNVERIFIED. Existing screenshots/performance below belong to
  older explicit sources and cannot be relabelled. Do not call this product
  complete or visually accepted.

### Unlocked continuation (2026-09-22)

- Candidate Web actual UI on `2e1c496`: deleted the exact SQL ExecutionLog from
  History (count became zero), then deleted its `QA SQL 学习了 40 分钟`
  RawCapture from Capture. Refreshed: no latest record, no activity returned.
  Deleted the QA-created unlinked SQL skill and the named
  `QA Release Backup Verification` goal. No owner dataset was used.
- A backup actually downloaded through Settings to
  `~/Downloads/questlife-backup-1790068949695.json`. It confirms ownerId=null;
  goals/modules/links/skills/actions/executionLogs/effortUnits/contributionLinks/
  stateCheckIns/contextLogs/rawCaptures/scheduleBlocks all zero. One structural
  category and eight system-generated daily DecisionResults remain; these are
  not claimed removed or mistaken for observations. This is local cleanup,
  not a new server-deletion test.
- The exported file was selected through the real file picker on a fresh
  `http://127.0.0.1:8097` origin. First-launch Backup opened without creating a
  goal; restore returned to Today and survived refresh. Settings shows the
  restored eight daily results plus two subsequently generated daily results.
  No state/execution observation was added. Re-export completed despite the
  control timeout: `~/Downloads/questlife-backup-1790069216073.json`. Comparison
  of all 16 record collections preserved every original record's exact JSON by
  ID, including the eight daily results and original ownerId=null. The only
  added records were two subsequently generated daily results. This is not
  claimed as a populated observation-backup test. This local build has the same application source but not candidate
  account configuration, so it is not a hosted auth/restore acceptance.
- Actual candidate Goal -> Module -> Skill creation succeeded using only a
  disposable structure: `QA Candidate Interaction` / `QA Workflow` /
  `QA Focus Review`. These were used for the verification below and subsequently
  removed using normal delete controls. No owner observations were fabricated.
- Found and fixed `a70cdcc`: an untracked module displayed 0% and its Skill
  repeated "No tracking". Presentation now uses the existing tracked/percent
  result; absent progress is not coerced to zero. Four platform/language tests
  also exercise qualitative, unconfigured time/quality/state/performance and
  a real 25% target. No progress algorithm or stored record changes.
- Found and fixed `8f56e02`: Web Goal "Record progress" led to Skill Detail
  without a recording action. Both platforms now expose the same exact-skill
  action; Web registers the existing in-app intent bus without OS notification
  services. Today still owns the actual form and save handler. Tests cover
  delayed mount, fresh callback, cleanup/account boundary and no direct writes.
- Current local regression on `8f56e02`: **26/26 suites PASS**, including
  TypeScript, Web export and dependency audit. Focused entity/intent tests:
  **35/35 PASS**. New-source candidate/installed acceptance is pending rebuild;
  do not relabel the preceding `2e1c496` artifact or screenshot as this source.
- Browser console captured no errors; existing unsupported Web push listener,
  Supabase lock deprecation and navigation-object deprecation warnings remain.
  The isolated emulator's `Test` Goal cleanup, actual native chart, performance,
  recording, physical Health/Calendar/notification and email OTP remain open.

### Actual mutation and cleanup continuation (2026-09-22)

- `cbc4585` Web candidate deployed READY as
  `dpl_A3eeZhFCHkKwvTLkmduzNqqVFWfu`, bundle
  `index-0dbc94b56fa3642dc6cb152b1259ab07.js`. The stable candidate alias remains
  `https://questlife-v1-release.vercel.app`; owner Production was not promoted.
  Eight fresh stateless API checks pass, including three live current-input
  matched parses (2.2-2.9 seconds). These are not Store-persistence tests.
- Same-source Android APK is `questlife-v1-cbc4585-arm64.apk`, 47,247,540 bytes,
  SHA256 `289c436a9e1eb10d2a59b7611b7c0cc708d37c03143ab3b2db33012a4f9ca5fa`.
  Installed APK hash matches; LAN download returns HTTP200. Native screenshot
  control works but pointer dispatch still fails with no available window.
  Installed interaction/recording/performance remains UNVERIFIED, not passed.
- Actual candidate Web Goal Detail no longer shows unsupported module 0% or
  duplicate tracking labels. Skill -> Record opens Today with the exact skill
  and goal context. Entered 1 actual minute, skipped prediction, left quality
  unknown, added `QA disposable direct-log verification saved`, then saved.
  Refresh retained the exact title, minute and note in History. This was a
  signed-out disposable candidate record, never an owner or synced observation.
  A transient input-focus control failure did not reproduce with full-text fill
  and sequential typing; no speculative handler rewrite was made.
- Schedule creation (19:00-19:25), edit (20:00-20:35) and refresh preserved the
  same QA block. The exact test ExecutionLog, ScheduleBlock, Skill, Module and
  Goal were then deleted through their normal controls. Refresh returned Today
  to no latest record/no schedule; History count was zero. A real Settings
  backup, `~/Downloads/questlife-backup-1790071996022.json`, confirms ownerId=null
  and zero goals/modules/moduleSkillLinks/skills/actions/executionLogs/
  effortUnits/contributionLinks/rescueLogs/stateCheckIns/contextLogs/
  patternMemory/scheduleBlocks/rawCaptures. The Uncategorized structural category
  and 12 system-generated daily DecisionResults remain. No claim that all local
  data or server records were deleted. Other local origins and the emulator's
  earlier `Test` Goal still require their own cleanup.
- Actual candidate screenshots checked: 375x667 Chinese/dark Today and State
  sheet; canceled without saving state. English/light Insights loaded its
  genuine zero-observation state; analyst row scrolls fully above navigation.
  English/light Today at 393x852 has no horizontal overflow. These are browser
  checks, not soft-keyboard or physical-device evidence.
- Found another real small-screen regression: Goals header buttons squeezed
  the count and hint into ellipses. `d6f05b9` stacks only that header below the
  existing 760px content breakpoint, preserving desktop layout and both actions.
  Local actual UI checked at 320px English/light, 375px Chinese/dark and
  1280x900 desktop; width equals scrollWidth. Focused entity tests **41/41 PASS**;
  TypeScript and Web export PASS. No Store/schema/handler changes. Latest
  source packaging and hosted readback follow this checkpoint.

### Populated backup roundtrip and cleanup (2026-09-22)

- Created one explicit disposable custom execution in the signed-out candidate,
  with 1 actual minute, prediction skipped and quality unset. Note/title:
  `QA disposable backup roundtrip - not an owner observation`. Execution ID
  `mucj4kw3pd0dsy`; derived effort ID `effort-mucj4kw3pd0dsy-primary`.
  The existing manual form records ordinary `OWNER_OBSERVED` provenance;
  isolation here is the signed-out disposable environment, not a QA provenance
  filter. No real owner account or cloud observation was used.
- Settings generated `~/Downloads/questlife-backup-1790073151885.json`.
  A prior local origin with seven system DecisionResults correctly refused
  restore rather than overwriting its nonempty replica. A genuinely new origin
  `http://127.0.0.1:49191` then opened first-launch Backup and restored the file
  using the real file chooser. Refresh retained the exact History record,
  minute, note and timestamp.
- Re-export `~/Downloads/questlife-backup-1790073409663.json`: all original
  records in all 16 collections preserved exact JSON by ID; ExecutionLog and
  EffortUnit arrays match exactly, ownerId remained null. Daily DecisionResults
  changed 16 -> 18 only by adding two normal system-generated daily results.
  This is file recovery, not account or cross-device sync verification.
- Deleted the exact log through normal UI in both candidate and restored
  replicas, refreshed both, then exported again. Files
  `~/Downloads/questlife-backup-1790073475094.json` (restored) and
  `~/Downloads/questlife-backup-1790073535109.json` (candidate) confirm zero
  executionLogs/effortUnits/contributionLinks/rawCaptures/stateCheckIns/
  contextLogs/skills/modules/scheduleBlocks and ownerId=null. One structural
  category and system daily results remain. The disposable restore servers and
  tabs were closed; the candidate and local review server remain available.
- Additional product gaps observed, not marked complete: custom-log B4 baseline
  wording called the record a skill (fixed in the continuation below); existing stored Chinese structural
  entity text remains Chinese after switching language. Intermittent browser
  typing automation lost focus; successful fill/sequential checks do not prove
  physical soft-keyboard behaviour. These are recorded separately from the
  passed exact-record persistence and cleanup checks.

### Chronological feedback correction (2026-09-22)

- `8a26f6b` fixes three feedback defects found during real record verification:
  custom/unlinked records no longer claim a nonexistent skill; an imported or
  backdated record cannot compare against a later or equal-timestamp record;
  missing, blank, boolean or non-finite numeric input stays unknown rather
  than producing a zero-valued measurement. Selection now uses only strictly
  earlier comparable records. Existing strength/time comparison rules and all
  Store/API/persistence operations are unchanged.
- Added 13 direct helper regressions covering zh/en, existing linked skills,
  chronological selection, invalid measurements and real strength labels.
  **13/13 PASS**. Full release verifier on clean `8a26f6b`: **27/27 suites PASS**,
  including TypeScript, Web export, native components, sync/RLS/concurrency,
  backups, device adapter boundaries and dependency audit. These remain local
  synthetic/component checks, not physical-device acceptance.
- Rechecked the populated backup files: 19 original records across 16
  collections preserved exactly; both cleanup backups have zero observations
  and derived execution records. No owner observation or neutral state added.

### Exact execution-feedback entry (2026-09-22)

- On actual `9555c5f` candidate UI, a signed-out disposable custom 1-minute
  record displayed the corrected activity wording in History. This also exposed
  another defect: Today "Review latest feedback" opened the daily decision
  explanation instead of that execution's feedback.
- `d74c98b` routes this existing todayCommand to the existing Activity History
  sheet with the exact captured ExecutionLog ID. Normal History opens its list,
  not a leftover selection. Scroll restoration, deletion, Store/AI handlers,
  feedback values and persistence are unchanged. No second feedback model.
- Five real component tests cover first/middle/final IDs, sorting/insertion,
  delete target, missing record, missing feedback, back, close and reopen.
  **5/5 PASS**. Full verifier on `d6effe7`: **27/27 suites PASS**, including
  TypeScript, Web export and zero known dependency advisories. Final deployed
  CTA readback and temporary record cleanup follow this checkpoint.
- `d6effe7` adds a draft-only internal candidate publisher. Its existing signed
  APK digest must match both local metadata and GitHub's uploaded asset digest.
  The exact source is pinned; published releases cannot be mutated. Repeated
  execution reused the same draft/asset, without duplicate upload. The first
  archived artifact is `9555c5f` (historical after the CTA fix). Draft release
  and asset access require repository write access; no public release or owner
  Production promotion was performed.
- Final `fd90542` real candidate UI: refreshed the signed-out disposable record
  `mucl0aspw6uzxb` (`QA disposable custom feedback verification`), clicked Today
  "Review latest feedback" and reached that exact record's feedback, not daily
  Decision Details. Back returned to History; close/reopen retained the correct
  record. Actual 375x667 screenshot shows readable detail/feedback/delete control
  and document width=scrollWidth=375.
- Deleted that exact record through normal UI. History immediately became zero;
  refresh retained no latest record and restored the normal recording action.
  After recovering a browser-control timeout, backup actually downloaded as
  `~/Downloads/questlife-backup-1790077393934.json`. Readback: ownerId=null;
  executionLogs, effortUnits, contributionLinks, stateCheckIns, contextLogs,
  rawCaptures, skills, modules and scheduleBlocks all zero. One structural
  category and 23 system daily results remain. This proves disposable local
  cleanup, not a new server-delete or physical-keyboard acceptance.

### Active completeness correction (2026-09-22)

Continued from clean `839a3b8` on `release/questlife-v1`; preserved all later
work after the original `507d0a5`. The broad IMPLEMENTED labels above describe
code presence, NOT completed product acceptance. The following engineering work
is reopened under the original specification, not excluded as new scope:

| Spec | Missing / incomplete work | Current action |
| --- | --- | --- |
| 7-9 native product | Insights without a bundle hid workspace/source/record entrances | Implemented honest variable catalog, source/record/backup entrances; 27 tests in each timezone. New installed acceptance pending |
| 7-8 native forms | Goal/Skill actions buried; Goal Detail retained bordered stacking and an empty 0% | Implemented native disclosures, pinned actions, stable draft and durable-save retry; unframed Goal hierarchy, no unsupported empty progress, durable module/criterion sheets; Skill Detail opens the existing exact-skill recording flow; first-launch account recovery and virtualized searchable Skill Library accessible. 25 component tests. Final installed acceptance pending |
| 7-8 Settings | One long account/source/calendar/settings form | Implemented grouped index and focused existing components, permission/error distinctions, close guard during account/import work; 19 component tests. New installed acceptance pending |
| 8 Schedule | Native editing and time-axis needed correction | Implemented real-duration day geometry, empty time, overlap lanes, contextual actions, exact-operation retry and historical-time protection; 19 component tests. New installed acceptance pending |
| 8/10 Today persistence | Optimistic success was not proof of durable write; Capture confirmation unmounted before feedback | Serial local ACK/retry; raw input retained until durable, parser starts after raw ACK, confirmation/after-state/Instant Read wait for ACK, feedback reopens by capture ID. Unselected model quality and unrecorded duration/sets remain unknown, not copied from model/plan. 17 queue + 26 real Store/callback tests. WAL replay uses durable base and retains later optimistic edits/deletions |
| 11-15 external chains | Hosted/core checks passed only for their stated boundaries | Physical data, OS delivery, email OTP and two-device UI remain open, not replaced by mocks |
| 16-19 acceptance | Installed APK and tab-open checks are partial only | Rebuild same-source candidate, actual interactions/recordings/performance; visual acceptance remains owner's |

Mac is locked again as of the latest CUA readback. Dedicated emulator pointer and
on-screen keyboard taps previously worked through CUA. Installed `fc17469`: created one disposable `Test`
Goal through its actual form, opened Goal Detail, switched dark/English, opened
Schedule and used Jump to Now. This QA emulator is separate from owner data; the
temporary Goal must be removed after restart/update persistence verification.
No state observation has been fabricated. Screenshots from this build cannot be
used as proof of later `15932f8` / `b8f365f` changes.

Skill Detail correction: its primary native action now opens the existing Today
Direct Log handler with the exact Skill ID, rather than ending the Goal-to-Skill
flow on an analysis-only page. Three real recent rows lead to existing Activity
History; progress/configuration, milestones and permanent delete remain reachable
through compact disclosures. No new record writer or progress algorithm. Native
empty history does not render empty charts or achievement walls; SVGs fit their
parent and chart text uses the selected theme. Twenty-one entity/form component
tests pass, including navigation-only intent/no writes, recent-row bound,
Chinese/English, both themes and finite zero-duration chart geometry. First launch
now opens the existing AccountSyncSection in the same request-guarded Sheet,
without creating a Goal or forcing a trip through Settings. Both languages have
entry/open/close/no-write tests. These are component tests, not installed or OTP
delivery acceptance.

`9b7c3fc` Android installed successfully. iOS simulator build
`0c6e3033-2317-4c3e-bcae-42e3fa32d08f` FINISHED. Cold-launch Android sample only:
25 frames, P50 17ms, P95 48ms, six janky; too small and not steady-state, NOT a
performance pass. Rebuild after the Skill correction and finish full interactions.

Real candidate Web flow (`9b7c3fc`, signed-out isolated browser): entered
`QA SQL 学习了 40 分钟`, actual parse returned, confirmed once, B4 remained
visible, skipped after-state, refreshed, and opened the exact History detail.
This exposed an unselected model-proposed quality `4/5` being written as an
observation. Fixed confirmation to accept quality only from explicit selection;
unselected/cleared quality remains unknown. Two additional real Store/remount
tests pass (23 total); no historical owner values were rewritten. Delete was
requested for the disposable record, but the browser confirm became blocked
while Mac was locked. User was asked to resolve it. Cleanup is PENDING, not
claimed complete, and no fake state observation was created.

Actual-duration integrity correction: Direct Log and one-tap drafts no longer
prefill planned/default minutes. Selecting another schedule changes association,
not observed time. Only a finished timer prefills measured duration. Manual
required-duration forms show an inline validation state; the existing optional
strength duration can stay unknown. Store no longer substitutes linked plan
minutes when duration is omitted; its existing zero sentinel is excluded by
Quant ingestion and no prediction-time delta is computed for it. No schema or
historical data rewrite. Four pure rules/integration-boundary tests plus two
real Store/refresh/retry cases pass; local Store suite now has 25 tests.

Native Skill Library completion: replaced the native-only bordered entity-card
stack with a virtualized, searchable continuous list. Open, Edit and Delete have
separate touch regions; long names wrap, IDs remain stable across search, and
the existing create/edit/confirmed-delete flows are reused. Four component tests
cover Chinese/English and both themes (entity/form suite: 25). Web library and
Goal/Module/Skill semantics are unchanged. Installed visual/scroll acceptance is
still pending, not inferred from virtualization settings or component tests.

Recording consistency follow-up: Schedule now applies the same strict actual-time
rule as Today. Optional strength time is actually optional; required time is
labelled correctly and malformed/fractional input is rejected. Manual strength
forms no longer prefill three observed sets or replace unknown sets with one.
Partial weight/reps measurements keep their unknown set count and cannot invent
a best-volume value; an existing volume baseline is retained. Predictions keep
their distinct semantics. No historical records were rewritten. Targeted
Schedule/Store tests: 47/47; device rules: 135 in each of three timezones; types
pass. Complete 26-suite regression also passed at `5e67b53` after this correction;
forms/Settings/Schedule: 25/19/21, Store: 26, queue: 17. Rebuild the final
same-source candidate after committing these logs. The previous `2322526`
deployment and APK are intermediate artifacts, not this final correction.

Complete regression rerun at `6b8ec6d`: all 26 suites PASS, including typecheck,
Web export and dependency audit. The report identifies that exact source; these
results are local checks, not installed-device, email-delivery or visual passes.
The preceding `cf86bef` Web deployment is READY and its standalone Android APK
was signed and installed. Both will be superseded by the same-source build
including the chart bridge correction. No owner-production promotion occurred.

Final APK inspection found unused overlay and broad external-storage permissions
from Expo dependencies. The release config now blocks precisely these three;
record import uses the system document picker and export uses app cache plus the
share sheet. Calendar, Health, notifications and network permissions are retained.
Verify the merged packaged manifest after rebuilding, not only this config.
Implementation reference: Expo SDK54 `android.blockedPermissions`.
Official reference:
https://docs.expo.dev/versions/v54.0.0/config/app/#blockedpermissions

iOS cloud limit: the `3d9300f` submission was rejected because the current Free
plan's iOS build allowance is exhausted (provider reports reset on 2026-10-01).
No paid upgrade was performed. The preceding `cf86bef` simulator build
`b484aea4-4305-4748-84b5-9f58cf27dd47` FINISHED, but is not same-source final
acceptance or a signed physical-iPhone installer. Signing remains independently
blocked by owner Apple credentials/device registration.

Permission-hardening validation at `4f40b67`: complete 26/26 suites PASS.
Nineteen Settings and seventeen backup-core checks retain import/export and
source handlers; physical file-provider read/write remains unverified. Hosted
sync on `3d9300f` passed all ten groups, including both replica directions,
restart/ACK retry, deletion and isolation. Both temporary identities were
deleted and each had zero remaining synced entities. No additional owner or
signed-out browser observations were created during this validation.

The persistence correction keeps the existing whole-entity mutation semantics;
it does not silently introduce field-level conflict merging. Failed writes keep
their exact original ID/closure, later writes wait, and retry first recovers the
durable WAL. A local error is distinct from an already-durable offline outbox.
The in-memory pending overlay is presentation only, never a second data source.
No owner observations or backend records were created by these tests.

Native chart interaction cost: unchanged crosshair selections no longer cross
the WebView bridge repeatedly, and selection-only renders reuse the serialized
chart model. A 200-event same-reading test emits one selection; changed values,
returning to a reading, and redraw still deliver their correct messages. All 28
Insights tests pass in both timezones. This is a measured message-count reduction,
not a new device-frame-rate result. Final performance/recording remains blocked
by the locked Mac and physical-device access.

Current source commits: `1898cb4` ordered durability/recovery, `9d37a2b` entity
forms, `6d96e06` Settings/import request guards, `cdb6322` native Schedule,
`5dec822` Insights cold start, `15932f8` durable Today submissions, and `b8f365f`
native Goal Detail/module/criterion completion; `9342bc5` Skill recording entry,
`f8e846a` explicit-only Capture quality, `7974103` first-launch account recovery,
`b322fff` actual-time integrity, `46040cd` native Skill Library, and `2dfde01`
workflow harness coverage for virtualized rows. All 26 suites passed against
`2dfde01`, including TypeScript, Web build and dependency audit (zero known
findings). Local-mutation suite: 17 queue + 25 real Store/SyncEngine/callback
tests; forms, Settings and Schedule: 25 + 19 + 19; native workflows: 68.
Hosted Sync also passed all 10 groups against this source, with both disposable
accounts removed (`cleanup: [true,true]`). Evidence is in the tracked local
verification summary and hosted-sync report, not a claim of physical UI testing.
Installed testing must use the next build.
CUA soft-key taps now enter native text; direct desktop text injection still
does not reach the Android field. No draft was saved during that input check.

Current browser interaction gate: while Mac remained locked, Direct Log, State
and Goals navigation clicks in the second candidate tab all left the visible
page unchanged. No console error was captured. This does not isolate an app
regression and is not a passed interaction check. Resume after unlocking and
resolving the first tab's disposable-record delete confirmation. Do not create
additional test observations until this known record can be cleaned up.

Continue this checkout, not the historical Web branches. Do not repeat backend
setup. Hosted Sync verification was rerun against the isolated candidate:
10/10 groups passed and both disposable auth users were deleted (`cleanup:
[true,true]`). iOS simulator build `24f5b7a0-faa3-4171-9dd0-e9fb78c071d5`
FINISHED for `fc17469`; this is not a signed physical-iPhone build. After the
final source rebuild, finish native Capture/Record/keyboard, examples, widget and
steady-state performance checks using CUA. Keep Web/Android/iOS source aligned.
Historical entries below are evidence, not a queue to restart.

## Human Actions (Consolidated, Live)

0. Unlock the Mac to resume the currently blocked browser/emulator verification
   and exact disposable-record cleanup. This is not an app regression diagnosis.
1. Supabase creation is complete. Email OTP delivery still needs a real permitted
   recipient/provider configuration; the disposable password-auth test does not
   establish SMTP delivery. No email service or paid subscription was invented.
2. Complete Apple Developer sign-in and internal distribution/device registration
   when the internal iPhone build is resumed. No active waiting credential
   terminal is assumed; EAS login itself is already verified. New iOS cloud
   builds also need the free allowance reset (2026-10-01) or an explicitly
   owner-approved plan change; no purchase was made.
3. Physical iPhone/Android Health and notification permission and real-device
   visual/performance acceptance. These cannot be replaced by emulator results.
4. Native high-frame-rate recording is not exposed by the current CUA tool.
   Pointer input is working after emulator restart; text input is being retested
   on the rebuilt candidate. Alternative ADB/UIAutomator input and recording
   authorization remains unanswered; no alternate UI path was used. Screenshots
   or a screenshot sequence will not be called a continuous native recording.
5. Remote push requires a candidate Firebase application / FCM v1 credential
   and Apple APNs signing. EAS credentials inspection confirmed neither is
   configured; no provider credential or paid service has been fabricated.

## Current Provider / Reference Evidence

- Quant: commits `27690c1`, `ff1429f`; deployed candidate service is a new project,
  not the owner Web deployment. Production-owner data was not uploaded. The
  concrete Python handler discovery correction succeeded on the hosted builder.
- Quant hosted empty request: 1392 ms observed end-to-end for one request, not an
  SLA or populated-data performance measurement. No cache/persistence writes.
- Figma `J51kDHRfrtRg2m56guVDBz` node `21:3` is one RECTANGLE with IMAGE fill,
  no children. It is a screenshot reference, not editable screen components or a
  reusable design system. Existing native primitives remain implementation source.
- Full TypeScript check passed at 2026-09-20 intermediate integration point;
  rerun after remaining concurrent edits and dependency maintenance.

No owner fake observation has been created for this run.

## Integration Findings Being Closed

- Transport now pins its bearer to the server-verified dispatch owner before any
  server write: `6a9eab0`, 17 focused tests passed (including switch/timeout/retry).
- Explicit provider health deletions must enter Sync V2, not remain device-only.
- Device journal needs cross-context serialization; notification planning must
  re-evaluate current time rather than abort on an expired foreground reminder.
- Chart event markers between observations must retain their real timestamp.
- Web Settings must not claim legacy anonymous upload or display the old version.

These are not accepted residual limitations. Corrections and focused tests are
in progress before final release build. Local browser QA uses a fresh
`localhost:8095` origin with visibly QA-named goal/module/skill only, no state or
execution observations. Those temporary structures must be removed before closeout.

## Latest Executable Work

- Calendar: retain export mappings outside the read cache, persist explicitly
  confirmed device operations before OS calls, reconcile crash/retry using exact
  non-sensitive markers, and expose pending/review state. Never infer deletion
  from absent events or automatically apply an unconfirmed remote edit.
- Candidate hosting: isolated `questlife-v1-release` build in progress. A new
  `.vercelignore` excludes native build directories, private env, reports, and all
  docs (including the out-of-scope quant directory) from hosting uploads.
- Final integrated build must replace intermediate APK/simulator source snapshots.
- Dependency scan now reports zero known advisories after four scoped overrides.
  A full export exposed image-size v2 filename incompatibility missed by the
  initial buffer-only smoke probe; a version/callsite-guarded postinstall patch
  plus actual Metro filename-export tests resolve it. No Expo SDK major upgrade.

## Integrated Candidate Checkpoint (2026-09-20)

- Continued actual worktree at `19399f7`; all later edits retained. Narrow commits:
  `70cdb03` dependencies/export compatibility; `ed09a36` device services/push;
  `f89aadc` durable record ACK/provenance; `47e2419` native workflows/launch entries.
- Current local regression: all 20 suites PASS, including TypeScript, Web export,
  130 device-service tests in each of three timezones, 38 Sync V2 tests, 19 SQL
  checks, 10 real PostgreSQL concurrency groups, 12 PostgreSQL push groups,
  14 push integration groups plus 8 core groups, 6 Health-delete boundary groups,
  17 auth groups, 59 platform tests, 19 shortcut checks, 12 Android widget checks,
  21 native Insights tests in each of two timezones, 76 native workflow tests,
  31 material tests, adaptive decision/theme suites, five actual Metro asset
  tests and npm audit. Logs: `reports/release/local-verification/`.
- Record submit now waits for durable persistence before closing or clearing the
  timer; repeated submits/retries retain the original ID and fields. Failed
  writes retain their retry closure; a recovered WAL is checked before replay.
  Timer timestamps are actual start/end; one-tap plan completion opens a draft,
  not a fabricated observed duration/quality. Source changes clear hidden links.
- Deletion no longer resets manually entered skill progress to zero. Only known
  applied additive contributions are reversed. Historical non-invertible skill
  aggregates without a baseline receipt are retained, not falsely reconstructed;
  deleting a record does not prove these legacy aggregates can be reversed.
- Calendar mappings survive read-cache changes/disconnect. Explicit confirmed
  intents persist before OS writes and reconcile by exact operation marker;
  failed/unknown/remote-changed results are visible for review/retry. No automatic
  remote-to-device write or title-based matching.
- Native export now creates a real JSON file and invokes the OS share sheet,
  rather than sending a large JSON string. Old feature-owned cache files prune
  on a later export. Actual receiver delivery is not claimed.
- iOS Shortcuts and two open-only Widgets are generated through an idempotent
  config plugin. Two actual iOS prebuild runs preserve exactly one target/source
  each. New Swift source still needs cloud compilation and installed acceptance.
- Push coordinator now consumes `syncDevicePushRegistration` on lifecycle/token
  changes; driver checks `matchesCurrentPushRegistration` before test-push display
  or handling. Earlier worker reports saying this was missing are superseded.
- File import/restore gap is now implemented (see latest checkpoint below).
  Export is not a full device backup (no credentials, raw Health repository,
  permission state or sync journal). Physical file-provider acceptance remains.
- Local Web QA on isolated `localhost:8095` created one visibly QA-named goal,
  module and skill; skill was deleted. Goal/module deletion awaits the pending
  irreversible-delete confirmation. No fake state or execution observations.
- Need final same-source Android build, iOS cloud compile, candidate deployment
  and hosted stateless smoke rerun. Owner Production is not being promoted.

## Latest Remote / Database Checks

- Candidate `/api/parse`: three actual DeepSeek requests returned HTTP200: basketball
  with unknown duration, SQL with 40 minutes, bench with 82.5 kg / 5 reps / 3 sets.
  Responses correspond to their current raw input. Stateless disposable text only;
  no Store/database writes and no UI confirmation/persistence claim.
- Candidate retired `/api/sync`: HTTP410. Valid unauthenticated Quant and push
  request bodies: HTTP401. Invalid bodies reject separately with HTTP400.
- Native PostgreSQL18 push migration: 12/12 groups, disposable socket-only cluster,
  real RLS/RPC enforcement with fixture identity claims. Not hosted Supabase auth.
- Expo SDK54 dependency compatibility check passed. Static native portability:
  371 modules, 215 native reachable, zero classified blockers. This does not
  replace actual interaction testing.
- Known credential-pattern scan: 621 text files, zero hits; restricted quant docs
  excluded. This is not a comprehensive security audit.

## Hosted Backend and Backup Checkpoint (2026-09-20)

- Isolated database migrations `202609180001_sync_v2.sql` and
  `202609200002_device_push_boundary.sql` were actually applied through the
  authorized Supabase SQL Editor. CLI migration-history tracking was not used.
- `scripts/verify-hosted-sync.mjs`: ten groups PASS, using the real SyncEngine
  with HTTPS Supabase Auth and database/Realtime operations. Two disposable
  identities were deleted; remaining synced entities zero. Read-only SQL checks
  also confirmed no earlier-run users/entities/receipts/cursors/devices remained.
- Service-role SELECT was intentionally not widened for test cleanup. Exact
  disposable user JWTs verify own-row absence after admin account deletion.
  No credential is committed; public/admin config lives in private local files.
- Realtime needed a 30-second cold-event deadline; the first 15-second trial
  timed out. Two subsequent complete runs passed. Cursor pull also recovers a
  change made while the subscription is disconnected; no latency SLA claimed.
- Candidate authenticated Quant proxy returned a real subject-bound empty
  artifact and rejected another subject with 403. This is not a populated
  physical Health-to-Quant verification.
- iOS virtual Xcode group path `undefined` fixed without changing source folder
  layout. Eight Swift/localization resource paths validated after two prebuilds.
  Cloud build FINISHED; this supersedes the earlier uncompiled Swift limitation.
- Backup: exact typed envelope, no runtime code generation, no fake defaults,
  original account restriction, durable projection recovery, remote tombstone /
  newer-value protection. See `RECORD_BACKUP_CONTRACT.md`.
- Actual candidate UI disclosed a first-launch constraint: Today creates a
  decision record, so Settings alone is too late for empty-replica import. The
  same recovery component is now available before leaving onboarding. No
  automatic deletion or relaxed overwrite guard was introduced.
- Full regression passed 21 suites after the isolated Settings test harness was
  updated for the new native file-picker boundary. Final first-launch entry
  additionally passed all 66 native workflow checks; final export still follows.

## Email Link and Current Acceptance Checkpoint

- Backup and hosted verification committed as `050abae` and `301dfe8` and pushed
  only to `release/questlife-v1`. All three configured `301dfe8` builds completed.
- Actual Supabase candidate UI exposes a default Magic Link email template,
  while the earlier app accepted a numeric code only. Editing that template is
  restricted to custom SMTP/paid service/hook configuration. No paid plan was
  selected, no SMTP credentials invented, and no owner account was modified.
- Added the official SDK PKCE one-time-link exchange alongside numeric OTP.
  Exact callback matching, S256 native Expo-crypto bridge, duplicate-delivery
  protection, error-only callbacks, session events and listener disposal are
  covered by seven tests. API responses are mocked in these link tests; they do
  not prove SMTP delivery or installed-Hermes behavior.
- Candidate callback configuration still awaits the specific confirmation:
  Site URL `https://questlife-v1-release.vercel.app`, redirects restricted to
  that root and `questlife://auth/callback`. No wildcard/owner-production URL.
  Without provider configuration and a permitted recipient, real email-link
  delivery remains UNVERIFIED even when the SDK tests pass.
- Latest full local run: 22/22 suites PASS, including typecheck, Web export,
  known-advisory audit and the new link tests. New native host test doubles were
  added to the auth/push tests; Health runtime test stubs include the link
  lifecycle. These are environment adapters, not weakened product assertions.
- Hosted rerun first reproduced a Realtime timeout after channel join; that
  failure and its successful exact-account cleanup are retained in
  `reports/release/hosted-sync-channel-join-timeout.json`. The test now waits for
  `system.extension=postgres_changes, status=ok` before making the measured
  mutation, as distinguished from channel `SUBSCRIBED` by the official
  [Realtime protocol](https://supabase.com/docs/guides/realtime/protocol).
  All ten hosted groups then passed, with both disposable accounts deleted and
  zero remaining entities. Existing foreground/periodic cursor pulls remain
  the correctness path; Realtime remains a wake-up hint, not a data transport.
- Real Chrome candidate UI: first-launch Backup and restore entrance visible;
  Today/Goals/Settings navigated, one local `QA Candidate Backup Roundtrip` goal
  created, no state/execution observations. Backup confirmation opens, but the
  automation dialog accept timed out and no downloaded file was found. Actual
  file roundtrip is UNVERIFIED. This QA goal and earlier IAB QA structures still
  require explicit cleanup; no sign-in/cloud upload was performed.

## Device Backup Boundary Checkpoint

- Email-link implementation and hosted readiness verification are committed as
  `32f7d2d` and `5fd8d70`, pushed only to the release branch. All three `5fd8d70`
  intermediate builds completed: signed Android APK; iOS simulator build
  `f222b5d8-93ee-4388-a509-969f7885551f`; candidate Web deployment
  `dpl_CDqA2eYaxcigUToio7TMcbcZRmUC`. Android APK installation on the dedicated
  `QuestLife_V1_ReleaseQA` emulator succeeded. Installation is not a UI pass.
- Package inspection found Android's default automatic backup enabled. Device
  IDs, source journals and unacknowledged sync operations must not be cloned by
  OS restore. A scoped config plugin now disables automatic backup and excludes
  all private domains from Android 12+ cloud backup and device transfer. The
  SecureStore plugin delegates backup configuration to this single policy.
  Account sync and explicit record-only backup remain the supported recovery
  paths; no stored record, schema or user permission was changed.
- Three focused tests verify idempotent manifest configuration, preservation of
  activities/permissions, and all-domain exclusions for both transfer modes.
  Actual Expo Android prebuild generated the intended attributes and XML.
  Final APK resource compilation and installed flags still need verification.
- Installed iOS AsyncStorage source excludes its data directory from OS backup
  by default; the generated Info.plist has no opt-in override. This is source /
  build-configuration evidence, not a physical iCloud restore acceptance test.
- Full local regression after the backup change: 23/23 suites PASS, including
  TypeScript, Web export and dependency audit. Logs remain under
  `reports/release/local-verification/`; rerun on the committed code before
  building the final same-source artifacts.
- Candidate browser backup confirmation was retried through the supported UI
  tool and again failed at dialog handling. No file roundtrip pass is claimed.
  Pending callback-allowlist and dedicated-emulator control confirmations were
  grouped in one request; no unauthorized alternative UI path was used.

Next: commit this backup guard narrowly, record its clean-source regression,
build and inspect the matching Android/iOS/Web candidates, then continue actual
UI/file tests when input is available. Do not touch `docs/quant/` or Owner
Production.

## Web Startup Payload Correction

- Actual Web export measured a 22,307,402-byte entry bundle. The historical
  `V11InsightsScreen` statically brought all of its V0.4.x and interpretation
  fixtures into ordinary app startup, even when its debug route was unused.
- Reused the existing `React.lazy` / Suspense route pattern for that screen.
  No fixture, Quant calculation, Store behavior or navigation option was removed.
  Fresh export entry is 4,371,601 bytes (987,031 gzip), an 80.4% reduction before
  compression. The 17,935,908-byte historical workspace is a separate deferred
  chunk, not falsely described as deleted or optimized internally.
- A TypeScript-AST boundary test guards against reinstating the static import;
  all 24 local suites pass after this change. Clean-source rerun and final
  matching artifacts follow. Bundle size is not a device frame-rate measurement.
- Candidate `a041cac` remote sync rerun passed all ten hosted groups; both
  disposable identities were deleted and own-row counts are zero. Actual
  stateless capture parsing passed basketball, SQL 40 minutes and bench
  82.5 kg / 5 reps / 3 sets. This does not establish UI record persistence.
- EAS Android credential inspection for this candidate explicitly reports no
  credentials configured. Local APK signing is independent and verified, but
  FCM v1 / Android Firebase application configuration is absent; APNs still
  requires the Apple account gate. Remote notification delivery is not verified.
  No new paid service, provider credential or Google project was created.

## Actual UI Regression Found and Fixed

- Candidate mobile browser QA found Today rendering without its approved layout:
  `v11-stage2-rebaseline.styles.web.ts` imported its own `.styles` entry instead
  of the CSS file. This predates the lazy-load correction; it reproduced on the
  `a041cac` hosted bundle. Commit `8addd88` restores the CSS import without
  changing Today markup, handlers or native rendering.
- The boundary test now checks every Web style adapter loads an existing CSS
  file and its native counterpart remains CSS-free. All 24 local suites passed
  again on the fix. The actual exported HTML now links the rebaseline stylesheet.
- Real browser at 375x667: repaired Today layout, Capture entrance, current-state
  update and L2 remain usable; DOM width and scrollWidth are both 375. No state
  or execution was saved. The pre-fix hosted QA also opened all five tabs,
  goal detail and Insights custom range. Browser error logs contained no runtime
  errors, but did include existing web-notification and SDK/navigation
  deprecation warnings. Final hosted same-source visual confirmation follows.
- Fresh local Chrome origin onboarding was completed with no goal/state/action
  samples. Today can create its normal automatic DecisionResult; this is not
  evidence of user observation input or successful cloud sync.

## Sheet Readability and Final Regression

- `a00f1dc` raises the shared Web interaction-sheet surface to 98% of the
  existing elevated token in both themes, with an opaque CSS fallback. The
  directional edge/shadow, form layout and callbacks are unchanged. This fixes
  actual light-theme background Today text remaining legible through the form;
  it does not assert that portal backdrop blur works on every browser.
- Actual Chrome local export checks: Chinese/light at 393x852 and 375x667;
  English/dark at 375x667 and 1280x900. Record Progress opens, cancels and scrolls;
  at 375 the footer is y=582..659 and document width equals 375. At 1280 the
  footer is 640px wide and remains in viewport. No observation was submitted.
- English 1280x900 Insights loads its asynchronous workspace and exposes
  watchlist, Custom, Indicators and Analyze with zero observations and no
  fabricated baseline. Screenshots were inspected in the browser tool; no
  native recording or physical keyboard result is claimed.
- Full local regression on clean source `a00f1dc`: 24/24 suites PASS, including
  TypeScript, Web export and zero known dependency advisories. The Web boundary
  suite now includes three checks (lazy fixtures, platform CSS imports and
  theme-independent sheet shielding).
- Backup confirmation/file roundtrip, native installed interaction, device
  frame times, real permission/source samples and email delivery remain
  UNVERIFIED. Existing three QA-only browser structures remain local and
  signed out; their cleanup is not falsely reported as complete.

## Final Hosted Schedule Finding

- Actual empty Week view exposed `Total Planned 1h` while each day correctly
  showed zero blocks. The header used the plot's minimum 60-minute scale as its
  reported total. `be8e799` separates the existing displayed-date sum from the
  chart denominator; empty means 0h, and a 135-minute week displays 2.3h.
  No scheduling mutation, duration default or calendar write was changed.
- Two new rendered-component tests cover empty and populated weeks, exclusion
  of a block outside the displayed dates, and unchanged source records. The
  native workflow file passes 68 checks. These are mocked component checks;
  actual hosted 0h readback follows the final deployment.
- The preceding clean `ed2b7e9` candidate completed Android signing/install,
  Web deployment `dpl_8ibr9ifStyJQzYMLMpHpkF3UovRe`, and iOS simulator cloud
  build `177f7a4d-2428-41f7-afee-38a5483ad9e8` (FINISHED). This is an intermediate
  artifact after the newly found display fix, not the final iPhone installer.
- The same candidate passed ten hosted Sync V2 groups and eight API checks;
  both disposable identities were deleted with zero remaining synced entities.
  The display-only correction does not change these endpoints or Sync V2.

## Installed Android Findings and Same-Source Candidate

- Native CUA pointer control recovered after restarting the dedicated emulator.
  This supersedes the earlier blanket native-input blocker. Actual installed
  release screens inspected: Today S0, Goals, new-goal form, Schedule Day/Week,
  Insights, example gallery, Settings and the State sheet. The empty Week total
  is visibly 0h. State Cancel returns to an unrecorded Today. No fake owner
  observation was saved. Calendar/Health remain explicitly unrequested and
  disconnected, not reported as integrated real-device data.
- The first installed example load failed. `insightsV3Source.debugEnabled`
  assumed any global `window` had `location.search`; React Native has `window`
  without browser location. `2d4f365` checks the capability before optional Web
  diagnostics. Contract/provenance validation remains mandatory. A new test
  invokes all six actual example loaders under native window semantics; all
  22 Insights tests pass in both timezones. No copied answer/model was added.
- The corrected clean-source Android package is
  `reports/release/build-output/questlife-v1-2d4f365-arm64.apk`, 47,203,520 bytes.
  SHA256 `93dc9dd37251fa218fb017deeed8c0ba7cc665e8cba9ef2da12fa6b79b0cbf88`.
  It is installed as a non-development release with embedded Hermes code and
  HTTPS candidate configuration. Dedicated v2 signing, no automatic backup,
  no debuggable flag and 18 explicit cloud/device-transfer exclusions verified.
  LAN download returned HTTP200:
  `http://192.168.5.4:8096/questlife-v1-2d4f365-arm64.apk`.
  The Mac is needed for this LAN download only, not subsequent app operation.
- Full local regression on `2d4f365`: **24/24 suites PASS**, including full
  TypeScript, Web export, native loaders, sync, PostgreSQL, materials and
  dependency audit. No known advisories. Exact known-private-value scan covered
  1,079 tracked files (excluding restricted quant docs), zero matches; not a
  comprehensive security audit.
- After reinstall, Today launched and the example gallery opened again.
  The Mac locked before final chart readback; the corrected chart must not be
  called visually passed. Android text entry also remains unverified: the
  handwriting tutorial intercepted input and CUA clipboard access timed out.
  No Goal was submitted. The settled State sheet was readable and shielded
  background text; the first transitional screenshot is not its resting state.
- Android gfxinfo captured a cold-start/Insights-selection sample, not a
  controlled steady-state benchmark. Latest sample: 307 rendered frames,
  P50 22ms, P95 42ms, 214 histogram frames over 20ms and 43 janky frames.
  Earlier shorter capture was P95 65ms. Host builds were running concurrently.
  Performance is **NOT_PASSED**; full loaded-chart/scroll/sheet/dark-mode
  measurements and physical device results remain pending. See
  `reports/release/android-runtime-sample.json`.
- iOS `dce40c5` simulator build `40774dd7-aaed-43f7-a845-03900137d992` finished.
  Corrected `2d4f365` build `ee893fd4-b0e0-44c5-9138-ba374db228f3` also FINISHED
  with actual EAS preview account configuration. Downloaded archive is
  21,253,763 bytes; SHA256
  `2d121b9ba675b70c8c00e3b0144d2ebda6000c97e8c845ad23dd0113ab10989e`.
  Verified `iPhoneSimulator`, `com.kyrie.questlife` 1.0.0, embedded JS/HTTPS,
  compiled Widget extension and AppIntent metadata. See
  `reports/release/ios-artifact-verification.json`. This is not a physical-iPhone
  installer; owner Apple credentials/UDID remain required.
- Browser backup/restore roundtrip, installed
  example chart, native mutation/keyboard flow, widget interaction and native
  recordings remain **UNVERIFIED** until their actual UI results are obtained.
  Candidate/local signed-out QA structure cleanup is still pending the earlier
  irreversible-delete approval; no owner data was substituted or cleared.
- Corrected-source Web deployment is READY:
  `https://questlife-v1-release-dqxp3nfke-kyrie-z-s-projects.vercel.app`, deployment
  `dpl_5UmvnH2V9UMCrKH3dbFrm2wSvntC`, stable alias
  `https://questlife-v1-release.vercel.app`. Actual root returns HTTP200 and
  references `index-7fe15de824160f79433928f92672276d.js` plus the restored
  `v11-stage2-rebaseline-6c62154b66e1190f5df8eaabd014eae0.css`. Fresh eight-check
  API smoke passes, including three real current-input-matched DeepSeek parses
  (2.4-2.7s each in this run), retired anonymous writes and authenticated endpoint
  rejection. These were stateless requests, not native/UI persistence tests.
- Fresh hosted sync rerun on `2d4f365`: **10/10 PASS**. Exact disposable users
  `2e04d9d1-33f7-4916-9593-d42cbf38e53b` and
  `f7b0c4a1-77d7-49a8-a870-1688d9ee1940` deleted, each with zero remaining synced
  entities. Real Auth/password, session restore, both replica directions,
  Realtime, offline restart, lost ACK, tombstone conflict, RLS, push binding
  (not delivery) and subject-bound Quant checked. Email OTP and two-device UI
  are separate outstanding tests.
- Browser control remained available while native Mac UI was locked. Final
  hosted readback: all five tabs load; Week displays 0h; existing signed-out
  QA goal remains; Insights watchlist/Custom/Indicators/Analyze load with absent
  baseline and no invented data. At 375x667, width equals scrollWidth=375.
  English/dark Insights and Chinese/light Capture screenshots inspected.
  Capture text entered, cleared and canceled without parsing/saving. At
  1280x900, Record Progress opens with sticky footer and no horizontal overflow,
  then cancels. Browser viewport reset; candidate tab left available.
  Console errors: none captured. Existing web-push unsupported, Supabase lock
  deprecation and navigation-object deprecation warnings remain.
- Source is pinned by non-forced tag `v1-internal-candidate-20260920` at
  `2d4f365`; later documentation/report commits do not alter built application
  source. This tag is an internal candidate, not final acceptance or promotion.
