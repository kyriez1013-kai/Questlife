# QuestLife V11 Stage 3 - Local Prototype QA

Date: 2026-08-07

Branch: `design/questlife-product-v2`

Route: `?questlife_v11_ui=stage3-insights`

Status: isolated local prototype complete. No push, Preview deployment, production integration, or physical iPhone Safari claim.

## Real Store State Used

- one valid StateCheckIn, displayed as `3 / 5`
- four positive-duration ExecutionLogs across two active dates
- one runtime candidate association for Bench Press
- zero accepted and zero archived PatternMemory rows
- two Goals, one Skill, zero schedule blocks in the current system-loop output

No fixture records, fixture parse results, fake patterns, or persisted QA state were created.

## Verified Behaviour

| Case | Result |
| --- | --- |
| Overview L1 | S1, one real observation, one limitation, one existing next action |
| Overview L2 | two bounded evidence rows; direct state evidence and non-causal recent-execution association |
| Evidence L3 | exact evidence detail, source, `n=1`, timestamp, low confidence, limitation |
| Trends low-data | shows the two real dated duration observations and explains that 3 distinct active dates are required; missing is distinct from zero |
| Trend point interaction | selecting `2026-08-05` opens the exact 61-minute / 3-log / 3.0 quality observation |
| Patterns | Candidate 1, Accepted 0, Archived 0; statement remains association, not causality |
| Advanced unavailable | Ability mode shows one accumulation explanation and no generic baseline score |
| Advanced available | System Loop shows real `1/2`, `1/1`, `0`, and `4` values, one model at a time |
| Default rollback | removing the flag renders the legacy `StatsScreen`; V11 root count is zero |
| Theme/language | Chinese deepWork and English cleanFocus both render; debug overrides are non-persisted |
| Reduced motion | explicit non-persisted reduced-motion route sets the V11 root to `reduced` |

## Responsive Results

- 375x667: Overview L1/L2, Trends, Candidate Pattern, Advanced System Loop, Evidence Sheet, and Trend Sheet have no document-level horizontal overflow.
- 393x852: English/light Overview, Trends, Candidate Pattern, and Advanced have no document-level horizontal overflow.
- 768x900: Overview uses the bounded responsive composition with no horizontal overflow.
- 1280x900: Overview uses two intentional regions; Trends uses canvas plus evidence region; Patterns and Advanced use full desktop width without stretching the mobile column.
- The existing five-tab navigation and content bottom inset remain intact.
- Sparse desktop low-data states intentionally retain quiet space rather than inventing analytical content.

## Performance

Measured locally in the Codex in-app Chromium browser against the complete real-Store composition. Each probe sampled 145 post-warmup animation frames.

| Surface | Viewport/theme | P50 | P95 | Frames over 20ms |
| --- | --- | ---: | ---: | ---: |
| Overview L1 | 375 dark | 16.7ms | 16.8ms | 0/145 |
| Overview L2 | 375 dark | 16.7ms | 16.8ms | 0/145 |
| Trends low-data | 393 light | 16.7ms | 17.3ms | 0/145 |
| Pattern candidate | 393 light | 16.7ms | 16.8ms | 0/145 |
| Advanced System Loop | 393 light | 16.7ms | 16.8ms | 0/145 |
| Trend point + L3 Sheet | 375 dark | 16.7ms | 16.9ms | 0/145 |
| Overview | 768 dark | 16.7ms | 16.8ms | 0/145 |
| Overview | 1280 dark | 16.7ms | 16.8ms | 3/145 |
| Trends | 1280 dark | 16.7ms | 16.8ms | 0/145 |
| Patterns | 1280 dark | 16.7ms | 17.1ms | 0/145 |
| Advanced | 1280 dark | 16.7ms | 17.1ms | 1/145 |

No visible flicker or material loss was observed locally. These measurements are not physical-device results.

## Build

- `npx tsc --noEmit`: passed
- `npm run build`: passed
- export directory: `dist`
- bundle: `index-d30e5d1adbb43c876b9db6f87b134312.js`

## Browser Console

- no Stage 3 runtime error was observed
- existing warnings remain: Expo Notifications web listener support, React Native Web shadow/pointer-event deprecations, and local sync failure warnings

## Screenshot Index

- `artifacts/v11-stage3-insights/questlife-stage3-overview-final-375.png`
- `artifacts/v11-stage3-insights/questlife-stage3-overview-l2-final-375.png`
- `artifacts/v11-stage3-insights/questlife-stage3-evidence-sheet-final-375.png`
- `artifacts/v11-stage3-insights/questlife-stage3-trend-low-375.png`
- `artifacts/v11-stage3-insights/questlife-stage3-trend-point-sheet-375.png`
- `artifacts/v11-stage3-insights/questlife-stage3-pattern-candidate-375.png`
- `artifacts/v11-stage3-insights/questlife-stage3-advanced-system-loop-375.png`
- `artifacts/v11-stage3-insights/questlife-stage3-overview-light-en-393.png`
- `artifacts/v11-stage3-insights/questlife-stage3-trends-light-en-393.png`
- `artifacts/v11-stage3-insights/questlife-stage3-pattern-light-en-393.png`
- `artifacts/v11-stage3-insights/questlife-stage3-advanced-light-en-393.png`
- `artifacts/v11-stage3-insights/questlife-stage3-overview-768.png`
- `artifacts/v11-stage3-insights/questlife-stage3-overview-1280.png`
- `artifacts/v11-stage3-insights/questlife-stage3-trends-1280.png`
- `artifacts/v11-stage3-insights/questlife-stage3-patterns-1280.png`
- `artifacts/v11-stage3-insights/questlife-stage3-advanced-1280.png`

## Unsupported Future Product Requirements

- arbitrary date-range recomputation
- arbitrary target/comparison-variable controls
- Calibration System or Quant Engine
- causal intervention or automatic schedule adjustment
- Bayesian/ML confidence
- new PatternMemory lifecycle or acceptance semantics

No fake controls were added for these concepts.

## UNVERIFIED

- physical iPhone Safari rendering, touch scrolling, blur stability, and frame pacing
- Preview and production environments, because push/deploy are forbidden in this pass
- Overview S0, S2, and S3 screenshots: the current real Store naturally produces S1
- valid trend state: the current real Store has only two active dates
- zero-pattern, accepted-pattern, archived-pattern, and 10/30-pattern scaling states
- accepted PatternMemory detail and direct relevance to an Overview judgement
- advanced modes requiring richer real history, including monthly, growth, combination, prediction calibration, Rescue, and valid Ability outputs
- keyboard behaviour is not applicable to the implemented read-only controls; no text filter was added
