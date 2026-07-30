# QuestLife V11 Stage 1 - iPhone Safari Manual Check

Status: Owner verification pending.

The Mac and iPhone must be on the same local network. Open:

```text
http://<mac-lan-ip>:8085/?questlife_v11_ui=stage1&lang=zh
```

Also repeat the key checks with:

```text
http://<mac-lan-ip>:8085/?questlife_v11_ui=stage1&lang=zh&theme=light
```

## 1. Responsive Geometry

Verify at physical iPhone portrait size:

- no horizontal scrolling;
- no clipped text;
- material shadows and bloom remain visible;
- no element extends into an unusable edge area;
- all controls remain easy to tap;
- no hit areas overlap.

Record: PASS / FAIL.

## 2. Material Comparison

In `材质原语`, compare the two equal-geometry sheets:

- true glass visibly refracts the colour field;
- fallback remains intentionally opaque;
- upper-left edge is brighter than lower-right;
- no protruding rounded ends;
- external shadow and bloom are not clipped;
- dark and light themes both retain depth.

Record: PASS / FAIL.

## 3. Glow and Scrolling

Scroll repeatedly across `证据光强` and `微仪器原语`.

Confirm:

- S0 remains unlit;
- S1-S3 increase without hard rectangular edges;
- no unacceptable banding;
- no flicker or material disappearance;
- scrolling remains stable.

Record: PASS / FAIL.

## 4. Reduced Motion

Enable iOS Reduce Motion, reload the route, and inspect `运动 token`.

Confirm:

- the reduced sample does not breathe continuously;
- material press feedback does not produce a visible sweep;
- the fixture remains readable and operable;
- turning Reduce Motion off restores the standard sample.

Record: PASS / FAIL.

## 5. Viewport Coverage

The local automated checks cover 375x667 and 393x852. On the physical device,
confirm:

- portrait layout remains stable at the device's actual viewport;
- browser chrome does not cover the final fixture content;
- scrolling reaches the final notice.

Record: PASS / FAIL.

Stage 1 remains pending until the owner reports these physical-device results.
