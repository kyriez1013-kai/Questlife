# QuestLife Visual Foundation

Status: canonical production foundation, pending owner visual acceptance on the
isolated cleanup branch.

## Authority

The approved Production Today implementation is the runtime authority. The
matching design reference is Figma file `QuestLife - Product Design Lab V2`,
node `21:3`.

This foundation governs product chrome. Quant charts, entity colours, and
semantic status colours remain separate because they encode data or meaning.

## Appearance Classification

| Classification | Result |
| --- | --- |
| KEEP | System, Light, Dark, language, entity colours, Quant/data palettes |
| REMOVE | Forest Growth, Ocean Calm, Warm Recovery, arbitrary app accent, background/palette combinations |
| INTERNALIZE | Clean Focus and Deep Work values become the canonical light/dark implementation tokens |
| DEBUG ONLY | `debugTheme=light|dark`; query-only, non-persisted, V11 debug routes only |

## Dependency Map

`AppData.settings.selectedThemeId`
-> `migrateAppearanceSettings`
-> `useQuestTheme` / `getQuestTheme`
-> `getQuestVisualFoundation`
-> App CSS variables, V11 tokens, shared Quest primitives, screens.

Settings writes only `system`, `light`, or `dark`. The visual resolver maps
those preferences to internal `cleanFocus` and `deepWork` theme values. System
uses the platform colour scheme and remains reactive through `useColorScheme`.

## Semantic Roles

The authoritative role adapter lives in `src/design/visualFoundation.ts`:

- Environment: canvas, near canvas, navigation.
- Material: base, elevated, soft, muted, translucent, overlay, shadow.
- Text: primary, secondary, metadata, disabled, on-primary.
- Border: subtle, standard, strong, divider, input.
- Interaction: primary, soft primary, accent, focus, selected, pressed,
  disabled, navigation state.
- Data: observed, comparison, predicted, neutral.
- Semantic: positive, warning, negative, info and soft variants.

`src/v11/tokens.ts` consumes this role adapter. `src/theme.ts` is now a
compatibility facade over the canonical light foundation for older StyleSheet
defaults; it is not a second colour system.

## Migration Contract

- `cleanFocus`, `forestGrowth`, `oceanCalm`, and `warmRecovery` migrate to
  `light`.
- `deepWork` migrates to `dark`.
- Valid `system`, `light`, and `dark` values are preserved.
- Unknown values fail safely to `system`.
- Legacy accent, palette, background-style, and equivalent appearance keys are
  removed.
- Language, dashboard preferences, onboarding state, Goals, Skills, Capture,
  Quant, watchlists, and every non-appearance field are preserved.
- The migration is deterministic and idempotent.

## Colour Ownership

Preserved intentionally:

- skill and goal entity colours, including the skill colour picker;
- template-provided entity colours;
- Quant/chart domain colours and evidence visualization palettes;
- semantic success, warning, danger, predicted, and informational colours;
- explicit debug fixtures and static visual assets.

Removed from product identity:

- user-selected app accent;
- selectable product palette families;
- palette-specific background/material combinations;
- legacy blue defaults that bypassed the canonical theme resolver.

## Usage Rules

1. New product surfaces consume `useQuestTheme` and shared Quest primitives.
2. New V11 materials consume `getQuestVisualFoundation` or `getV11ThemeTokens`.
3. Do not add `goalTheme`, `scheduleTheme`, or `insightsTheme` systems.
4. Neutral controls use Material and Text roles. Cyan is reserved for primary
   action, selected navigation, focus, or observed-data emphasis.
5. Quant/data colours never become general navigation or form-control colours.
6. Debug theme overrides remain query-only and must never be persisted.

## Current Compatibility Debt

Some older StyleSheet declarations still reference the `theme` compatibility
facade. Their runtime values now come from the canonical light foundation and
dark surfaces receive semantic runtime overrides. They can be converted to
Quest primitives incrementally when those components are otherwise modified;
they no longer expose a separate user-configurable palette.
