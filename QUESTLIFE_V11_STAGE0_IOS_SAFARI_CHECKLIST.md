# QuestLife V11 Stage 0 - iOS Safari Manual Check

Status: Passed and approved by owner on physical iPhone Safari.

The Mac and iPhone must be connected to the same local network. Start the
fixture with:

```bash
python3 -m http.server 8085 --bind 0.0.0.0 --directory dist
```

Open the LAN URL with `?questlife_v11_ui=stage0&lang=zh`.

## 1. Backdrop Support

Under Material Comparison, record the values shown for:

```text
standard=
-webkit=
```

Expected visual behavior:

- The left sample is labelled `背景折射`.
- The left sample shows the translucent glass surface and background
  refraction.
- The right sample is labelled `降级软浮面`.
- The right sample is opaque and has no backdrop filtering.
- The upper-left SVG edge is visibly brighter and the lower-right edge nearly
  disappears.
- The separate 1px upper internal highlight remains visible inside both
  geometries.
- External shadow and bloom extend beyond each surface without clipping.
- Selecting `强制降级材质` changes the primary action surface only. The
  comparison samples remain glass versus fallback.

Record:

- iPhone model:
- iOS version:
- Safari `standard` result: PENDING EXACT OWNER VALUE
- Safari `-webkit` result: PENDING EXACT OWNER VALUE
- Glass visually refracts the background: PASS

## 2. Scrolling Stability

1. Scroll from the top to the performance section and back ten times.
2. Repeat while S1 is active.
3. Switch to S3 and repeat.

Check for:

- frame stalls;
- white or black flashes;
- glass surfaces disappearing during scroll;
- edge highlights detaching from their surfaces;
- external shadow or bloom clipping at the rounded ends;
- content jumping horizontally.

Record: PASS - repeated S1 / S3 scrolling had no visible flicker or material
disappearance.

## 3. Orb Banding

Inspect the primary orb around the `2 / 5 state` reading in S1 and S3.

Check:

- no visible hard circular boundary;
- no obvious concentric colour bands;
- no rectangular clipping;
- no flicker during the S1 to S3 transition;
- the supporting orb does not overpower the primary reading.

Record: PASS - no unacceptable hard edge, rectangular clipping, or banding.

## 4. Reading Baseline

Confirm that `2`, `/ 5`, and `state` remain on one horizontal baseline in
portrait orientation.

Record: PASS.

## 5. Directional Edge Geometry

Inspect the primary action pill and both Material Comparison samples.

Check:

- the two pill end caps do not protrude outside the straight middle edge;
- the highlight follows the material boundary continuously;
- no edge is clipped or detached while scrolling;
- the external shadow remains visible beyond the pill without a hard cut;
- the two Material Comparison samples have no half-pixel horizontal mismatch.

Repeat the geometry and material checks in both `深度工作` and `清醒专注`.
The light variant must remain translucent and must not become an opaque grey
capsule.

Record: PASS.

## 6. Evidence to Return

Please provide:

- one screenshot showing the support readout and material comparison;
- one screenshot showing the main reading;
- a short note about scroll performance;
- a short note about banding;
- a screen recording only if flicker or dropped frames are visible.

Stage 0 is approved. The two support booleans above still require exact
transcription from the tested device; they must not be guessed.
