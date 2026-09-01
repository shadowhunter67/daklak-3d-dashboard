# ADR — human-scale unit conversion, no true 1:1-meter global frame, no floating origin

- Status: accepted (Phase T5 — human-scale + seamless zoom + procedural density)
- Date: 2026-09-01
- Baseline: `main` at `aa5e823` (post building-pilot height-scale fix, PR #105)
- See `world-engine-adr.md` (coordinate frame origin) and `player-terrain-sampler-adr.md`
  (CPU terrain sampler) for the two ADRs this one builds on.

## Problem

`worldCoordinates.ts`'s frame (`geoMercator().scale(150)` horizontally, terrain's
`displacementScale=0.2` vertically) was never given a single documented meters-per-world-unit
ratio. Every object placed in the scene picked its own size/speed "by feel" independently:
`PlayerRig.tsx`'s `EYE_HEIGHT=0.16`, `TourRig.tsx`'s `TOUR_CAMERA_HEIGHT=1.3`, and — the concrete
bug this ADR is a direct response to — `worldBuildingGeometry.ts`'s building-height scale, which
in its first shipped version made a real 62.7m tower render ~5 world units tall (close to the
scene's entire ~5.16-unit terrain width), a spike piercing off-screen from the province overview
camera (fixed in PR #105 by lowering the scale, not by fixing the root inconsistency).

Measured, not guessed: 1 world-unit horizontal ≈ 41,400m real (derived from the Mercator
projection at the province's center latitude); 1 world-unit vertical (via terrain's
`displacementScale`/`elevationMaxMeters`) ≈ 8,045m real. The vertical axis is **~5.15x more
exaggerated** than the horizontal axis — two different scales baked into the same coordinate
frame, with no shared conversion anyone could have used to keep a new object consistent with
either.

## Question 1 — how should meters convert to world-units?

### Option A — derive one horizontal ratio from the existing projection, expose it as the only

conversion API (chosen)

`coordinates/worldScale.ts` computes `METERS_PER_WORLD_UNIT_HORIZONTAL` once, at module load, by
taking the province bbox center, moving 1 world-unit east via `latLonToWorld`/`worldToLatLon`, and
measuring the real distance with the already-existing `haversineDistanceMeters`. No hardcoded
constant — if `utils/geo.ts`'s projection scale ever changes, this recomputes automatically and a
test (`worldScale.test.ts`) cross-checks it against an independent haversine calculation between
two different bbox points, so a drift is caught rather than silently trusted.

`metersToWorld(meters)` / `worldToMeters(worldUnits)` become the one place every new "real-world
size" constant in this feature must go through — replacing ad hoc numbers like `EYE_HEIGHT=0.16`.

### Option B — keep every constant independently tuned "by feel," add a lint/review convention

Rejected: convention alone already failed once (the building-height bug) — a mechanical single
source of truth is cheap to add and removes the class of bug entirely, not just this instance.

### Option C — redefine the whole coordinate frame so 1 world-unit = 1 meter globally

Rejected for now — see Question 2 (would also require a floating-origin system, Question 3).

**Decision: Option A.**

## Question 2 — should objects (buildings, player, trees) and terrain shape use the same vertical

scale?

### Option A — objects use the true horizontal-consistent scale (`metersToWorld`); terrain keeps

its existing `displacementScale` exaggeration, unchanged (chosen)

A real building rendered at true scale looks right next to a real building; a mountain rendered at
true scale (using SRTM's real ~1.6km range against a ~200km-wide province) would be nearly flat
and unreadable at any camera distance a walking/flying player uses — every stylized 3D-terrain
viewer exaggerates elevation for exactly this reason, and this project's terrain pipeline already
made that call independently (`generate_daklak_terrain.py`'s `displacementScale`). Re-deriving
terrain's own scale to match objects would mean re-authoring the terrain texture pipeline for a
problem it doesn't have (nobody complained the mountains look wrong) to fix a problem it does have
(buildings looked wrong) — solving the wrong axis.

### Option B — exaggerate objects to match terrain's vertical scale too

Rejected: this is what the pre-fix building code effectively approximated by accident, and it's
the literal spike bug. A 62.7m tower at terrain's own ~8,045 m/unit ratio is imperceptibly short
(~0.008 units); tuning object height any higher than that ratio, for legibility, is exactly how
the spike happened.

**Decision: Option A** — accepted, documented trade-off: local terrain slope reads ~5.15x steeper
than real underfoot slope for a walking player. Given the height texture is already a ~200m/pixel,
Gaussian-blurred raster (`daklak-terrain-metadata.json`), real local slope is already low enough
that 5.15x of it stays walkable; revisit only if playtesting finds otherwise.

## Question 3 — how to make the camera continuum from "standing next to one house" to "whole

province" work without breaking float32 precision?

### Option A — true global floating-origin (rebase the whole scene's origin to follow the camera

every frame)

Rejected: large, invasive change (every position in every layer would need to become
camera-relative), high regression risk against everything already shipped (`PlayerRig`, `TourRig`,
`WorldDestinationMarkers`, `WorldRoadLayer`, `WorldBuildingsLayer`), for a problem this scene does
not structurally have — see Option C.

### Option B — multiple camera "shells" at different scales, cross-faded

Rejected: needs two simultaneous render passes/scene graphs to cross-fade, real GPU/RAM cost on
the 16GB dev machine that has already hung once under load (see project memory on
`webapp-testing`/dev-server RAM caution); a cross-fade between two different scales always has a
visible "pop" the moment content differs between the two representations.

### Option C — single frame, per-tile-local vertex data + dynamic camera near/far + LOD bands

(chosen)

Three.js already computes `matrixWorld`/`modelViewMatrix` in float64 JS math — only the
`Float32Array` vertex buffers themselves are float32-limited. The actual precision risk is
concentrated in exactly one place: geometry authored with vertex data directly in scene-absolute
coordinates (world width ~5.16 units, so float32's ~6e-7-unit step ≈ 2.5cm — enough to jitter
sub-meter building detail). `worldBuildingGeometry.ts`'s existing merge-into-absolute-coordinates
pattern is the thing that must NOT be copied for anything finer-grained (procedural props); the
fix is a rule, not a rewrite: **content finer than ~50m must be a child of a
`<group position={tileOrigin}>`, with its own vertex data as small local offsets from that origin**
— the group's `position` (a per-object float64 JS number, not a vertex) absorbs the large
coordinate, the vertex buffer only ever holds small numbers.

Combined with per-frame `camera.near`/`camera.far` scaled to the camera's current altitude above
ground (instead of the fixed `near=0.05/far=100` `WorldScene.tsx` ships today, which is only valid
at the one altitude it was tuned for) and LOD bands driving movement speed/detail by altitude
(`camera/cameraScaleBands.ts`), the camera continuum needs no origin rebasing, no second render
pass, and no cross-fade — one scene, one frame, precision-safe by construction at the one place it
would otherwise fail.

**Decision: Option C.**
