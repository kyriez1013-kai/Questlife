# Native portability inventory

Scanned 371 application modules. Static native graph: 215 modules.

- BLOCKER: 0
- PLATFORM_ADAPTER: 244
- WEB_ONLY_DEBUG: 171
- SAFE_GUARD: 190
- NO_ACTION: 187

Classification is a conservative static triage, not proof of device behaviour.
The JSON records every match and native reachability. Type-only imports are excluded.
CSS in the native graph blocks acceptance; guarded DOM references still need runtime QA.
Dynamic imports and native module linking are additionally verified by platform exports/builds.
