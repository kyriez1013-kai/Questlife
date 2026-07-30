# QuestLife V11 Stage 1 - Token and Component Layer

Date: 2026-07-30

Branch: `design/questlife-product-v2`

Status: Local component fixture complete. Physical iPhone Safari verification
and explicit Stage 1 approval are pending.

## Isolation

Open:

```text
http://<mac-lan-ip>:8085/?questlife_v11_ui=stage1&lang=zh
```

Optional query values:

- `lang=zh` or `lang=en`
- `theme=dark` or `theme=light`

The fixture renders before `StoreProvider`. It does not read or write user data.
The default application, five-tab navigation, Stage 0 fixture, APIs, Store,
schemas, handlers, and persistence remain unchanged.

## Tokens

`src/v11/tokens.ts` defines:

- dark and light directional colour fields;
- primary/supporting glow colours, diameters, and blur radii;
- true-glass and intentionally opaque fallback materials;
- evidence-stage glow opacity, saturation, scale, and edge strength;
- typography and spacing scales;
- `120ms`, `320ms`, and `640ms` motion durations;
- the approved instant, standard, and deliberate easing curves;
- the accepted 1.5px directional-border stroke and light falloff.

The existing `deepWork` and `cleanFocus` Quest themes remain the source for
theme-aware base colours.

## Reusable Primitives

`src/v11/components` contains:

- `V11DirectionalBorder`: inset SVG geometry measured from the live container;
- `V11GlowOrb`: radial glow with evidence-stage intensity;
- `V11Pill`: three-layer pill with outer depth, inner glass clip, and edge;
- `V11GlassSheet`: the same material system with sheet geometry;
- `V11RadialGauge`;
- `V11Sparkline`;
- `V11Distribution`;
- `V11ArcRange`;
- `V11IntervalRange`.

No new dependency was added.

## Material Contract

The three material layers remain independent:

1. Outer wrapper: external shadow and bloom, `overflow: visible`.
2. Inner clip: translucent fill, blur/saturation, `overflow: hidden`.
3. Directional SVG edge: pointer-inert overlay with approved inset geometry.

The fallback uses identical geometry but no backdrop blur and an intentionally
opaque fill.

## Reduced Motion

`useV11ReducedMotion` reads `prefers-reduced-motion`.

The fixture also exposes a debug-only reduced-motion control and an explicit
side-by-side comparison. Reduced mode changes animations and transitions to
`0.001ms`, removes delays, and runs persistent animation only once.

## Local Verification

- TypeScript: PASS
- Expo web build: PASS
- Build output: `dist`
- 375x667: PASS, no horizontal scroll
- 393x852: PASS, no horizontal scroll
- Minimum fixture control height: 48px
- Hit-area overlap: none detected
- Outer shadow/bloom clipping: none detected in the local browser
- Directional edge dimensions: match material container
- Dark/light material comparison: inspected
- Standard/reduced computed-style comparison: inspected

## Stage Boundary

Stage 2 has not started. No production screen imports these primitives.
No push or deployment was performed.
