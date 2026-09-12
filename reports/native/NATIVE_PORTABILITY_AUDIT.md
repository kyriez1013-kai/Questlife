# Native portability inventory

Scanned 318 application modules. Static native graph: 168 modules.

- BLOCKER: 0
- PLATFORM_ADAPTER: 228
- WEB_ONLY_DEBUG: 169
- SAFE_GUARD: 178
- NO_ACTION: 187

Classification is a conservative static triage, not proof of device behaviour.
The JSON records every match and native reachability. Type-only imports are excluded.
CSS in the native graph blocks acceptance; guarded DOM references still need runtime QA.
Dynamic imports and native module linking are additionally verified by platform exports/builds.
