# ADR — CPU terrain sampler decode strategy, and no physics engine for the player controller

- Status: accepted (Phase T3)
- Date: 2026-08-23
- Baseline: `main` at `35b9213` (post Phase T2 merge, PR #93)
- See `docs/world-exploration.md` for the full architecture writeup this ADR feeds into.

## Question 1 — how should the player/POI/teleport system query terrain elevation on the CPU?

`world-engine-adr.md` (Phase T0) already flagged this gap: elevation exists only as a GPU
displacement map (`daklak-terrain-height.png`, sampled in the vertex shader), with no CPU-side
query anywhere in the codebase.

### Option A — decode the already-shipped PNG at runtime via `<canvas>` (chosen)

- Zero new dependency, zero new build-time asset/pipeline step.
- Byte-for-byte the same source the GPU displaces with — cannot silently drift from what the
  player visually sees rendered.
- Decoded once (module-level promise cache, `terrainHeightSampler.ts`), reused by every consumer
  (`PlayerRig`, `TourRig`).

### Option B — a new build-time derived binary asset (e.g. a downsampled raw height grid)

- Would need a new step in `scripts/generate_daklak_terrain.py` (or a sibling script) and a new
  static asset shipped alongside the existing PNGs.
- Real risk: if ever regenerated independently of the display PNG (different resolution/blur/
  clip), it could drift from what's actually rendered — the player could visibly float above or
  sink into the ground the user can see, which is a worse failure mode than "elevation is
  unavailable until decoded."
- Rejected: no concrete performance problem Option A has that this would solve. `<canvas>` decode
  of a 1024x1024 PNG is a one-time, sub-frame-budget cost at scene load, not a per-frame one.

### Option C — a WebGL readback of the GPU displacement texture

- Technically possible (`gl.readPixels` against a render target), but adds real complexity
  (framebuffer setup, GPU/CPU sync stalls) for no benefit over Option A, which already guarantees
  byte-identical data with none of that machinery.
- Rejected as unnecessary complexity for this scope.

**Decision: Option A.** See `docs/world-exploration.md`'s "Terrain sampler" section for the full
implementation, the row/column-to-geography derivation (cross-checked two independent ways), and
how the browser-only decode is still unit-tested (mocking exactly the two primitives it calls,
not the surrounding math).

## Question 2 — does the player controller need a physics engine?

Considered explicitly per the task's own instruction ("Ưu tiên không thêm physics engine nếu
height-based collision đủ dùng... chỉ thêm khi có lợi ích rõ ràng").

**What this scope actually needs:** one player, walking on a single smooth heightfield (the
terrain mesh, no other static/dynamic collision geometry — no buildings, no other actors), with
jump/gravity. Ground-following is naturally continuous because `sampleHeightGrid`'s bilinear
interpolation has no discontinuities to "collide" with; slopes are handled by the same mechanism
that handles flat ground.

**What a physics engine (Cannon.js/Rapier/etc.) would add:** rigid-body collision against
arbitrary geometry, constraint solving, potentially other dynamic bodies — none of which this
scope has a use for. It would be a new dependency (violates the task's "tránh dependency mới nếu
không thực sự cần") solving a problem this feature does not have.

**Decision: no physics engine.** Height-based ground-snapping + a simple gravity/jump projectile
(`playerMovement.ts`'s `computeWalkMovement`) is sufficient and is what shipped. Revisit only if a
genuinely new requirement needs body-to-body collision, ragdolls, or vehicle dynamics this
approach structurally cannot provide — not preemptively.
