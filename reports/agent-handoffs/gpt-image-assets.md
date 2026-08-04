# Handoff — real visual assets needed for the Tourism Digital Twin (T2+)

No image-generation tool was available to the agent that built Phase T0/T1
(`feat/tourism-world-foundation`). Nothing below was generated — this is a brief for a future
agent/human with image-gen or real photography access, describing what Phase T1's illustrative
`?view=world` scene stands in for and what would eventually replace it.

## What Phase T1 actually used (no new assets)

- The existing terrain color/height/normal/mask PNGs already in
  `src/assets/maps/daklak/daklak-terrain-*.png` (satellite albedo + SRTM-derived shaded relief,
  see their metadata file for exact provenance) — reused byte-for-byte, no modification.
- Simple Three.js primitives for lighting (`hemisphereLight`, `directionalLight`) — no new geometry,
  no new textures, no GLBs.

## What T2+ (tourism destinations, guided tours) would eventually need — NOT built, NOT started

1. **Destination markers / points of interest** — real coordinates + real names for actual tourism
   sites (waterfalls, Buôn Đôn, coffee plantations, cultural sites, etc.) sourced from a real,
   licensed dataset or partnership with the tourism department — not fabricated. Currently there is
   no tourism data contract in the repo at all (Phase T1 deliberately did not create one — see
   `reports/tourism-digital-twin/phase-status.md`, "Next action").
2. **Representative imagery per destination** — real photographs (licensed or provincial-tourism-
   provided) or, if illustrative placeholders are acceptable for an early prototype, AI-generated
   concept art clearly labeled as such (never presented as a real photo of the real place — see
   Ground Rule #1 in the task this report responds to).
3. **3D landmark models** (optional, higher effort) — if the product wants recognizable 3D
   structures at specific destinations (not just camera flythrough over terrain), those would be
   either licensed/commissioned 3D assets or simplified procedural geometry — real GLB/GLTF models
   are not something an image-gen tool produces; that is a separate 3D-asset pipeline decision.
4. **Panoramas / 360° imagery** for a "stand at this viewpoint and look around" feature — real
   captured panoramas, not generated ones (a generated panorama would misrepresent what a visitor
   actually sees, which the task's Ground Rule #1 explicitly forbids for anything implying real
   tourism photography).
5. **UI iconography for tour categories** (waterfall, culture, coffee, nature, etc.) — a small,
   low-risk set that COULD reasonably be simple SVG/procedural icons rather than photographic
   assets; lowest-priority item on this list to source.

## Recommendation for whoever picks this up

Do not generate placeholder "concept art" and present it as anything other than explicitly labeled
concept art — the existing app's own convention (`"DỮ LIỆU MINH HỌA"` / illustrative badges) is the
bar to match. Real destination data (item 1) is the actual blocker for T2 to start meaningfully;
imagery (items 2-4) can follow once there's a real, sourced list of destinations to attach it to.
