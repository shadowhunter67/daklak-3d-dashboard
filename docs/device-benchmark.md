# Physical-device benchmark

This is a repeatable manual protocol, not a results claim. Never fill missing values with estimates. Test the deployed production URL and record its `build-info.json` first so results remain attributable to one build and dataset.

## Required device groups

Run at least one representative device in each group:

1. Mid-range desktop or laptop using current stable Chrome.
2. Mid-range Android phone using current stable Chrome.
3. iPhone using the current supported iOS/Safari release.

Record device model, CPU/SoC, RAM when known, OS version, browser/version, viewport, power/thermal mode, and network condition. Use the same URL state and test sequence. Close unrelated heavy applications, start from a cold browser cache for first-load measurement, then repeat three times and report the median plus the individual readings.

## Procedure

1. Capture downloaded transfer bytes from the browser network panel or remote debugging. Load the default URL with cache disabled and measure navigation start to usable dashboard (controls visible and terrain ready).
2. Load `?view=2d`, then switch to 3D and measure activation to an interactive canvas.
3. Rotate and zoom continuously for 20 seconds. Record estimated FPS from available browser tooling, visible stutter (`none`, `minor`, `frequent`, `blocking`), and any thermal throttling indication.
4. Select the same polygon ten times from a neutral state. Record click/tap to visible detail update; report median and slowest time.
5. Exercise zoom, mode changes, 2D fallback, Back/Forward, and a shared ward URL.
6. Keep the 3D view active for five minutes, then repeat rotation/selection. Record WebGL context loss or recovery behavior.
7. If tooling exposes process/GPU memory without requiring invasive collection, record before load, after terrain ready, and after five minutes. Otherwise write `unavailable`.

Use browser Performance/Memory tools locally, Chrome remote debugging for Android, and Safari Web Inspector for iOS where available. Tool overhead affects results, so identify the tool and keep it consistent across repeated readings.

## Results template

| Field                                 | Desktop mid-range | Android mid-range | iPhone / Safari iOS |
| ------------------------------------- | ----------------- | ----------------- | ------------------- |
| Build version / commit                | TBD               | TBD               | TBD                 |
| Dataset version                       | TBD               | TBD               | TBD                 |
| Device / CPU or SoC / RAM             | TBD               | TBD               | TBD                 |
| OS / browser version                  | TBD               | TBD               | TBD                 |
| Network / cache state                 | TBD               | TBD               | TBD                 |
| First usable load, 3 runs / median    | TBD               | TBD               | TBD                 |
| 2D to interactive 3D, 3 runs / median | TBD               | TBD               | TBD                 |
| Interaction FPS estimate / tool       | TBD               | TBD               | TBD                 |
| Rotation/zoom stutter                 | TBD               | TBD               | TBD                 |
| Polygon selection median / slowest    | TBD               | TBD               | TBD                 |
| WebGL context loss / recovery         | TBD               | TBD               | TBD                 |
| Memory before / ready / five minutes  | TBD               | TBD               | TBD                 |
| Downloaded transfer bytes             | TBD               | TBD               | TBD                 |
| Thermal/power observations            | TBD               | TBD               | TBD                 |
| Errors or notes                       | TBD               | TBD               | TBD                 |

Attach exported traces only if they contain no sensitive browsing data. Compare regressions against the same device/network protocol, not across unrelated hardware.
