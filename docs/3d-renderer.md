# Tactical 3D renderer

The watcher reconstructs a tactical world, not the StarCraft II renderer. Its
models are original SVG silhouettes informed by recognizable unit roles and
proportions. They intentionally inherit the replay player color and the
watcher's low-noise visual language instead of copying game textures or art.

## Asset contract

- `frontend/src/lib/sc2-3d-assets.ts` owns canonical type → model metadata.
- `frontend/src/components/sc2-model-3d.tsx` owns geometry and the shared SVG
  sprite. A world entity references sprite symbols with `<use>`; it must not
  repeat path data per entity.
- Footprint communicates gameplay scale (`tiny` through `massive`). Elevation
  distinguishes ground, hover, air and high-air entities. Detail communicates
  a signature such as blades, cannon, wings, engines, claws or energy.
- State aliases must resolve through `canonicalSc2Type`. Flying buildings,
  siege modes, burrowed units and uprooted crawlers should not require copies.
- Unknown neutral fixtures remain subdued and must never look owned by a
  player. Resources belong in the batched resource SVG layer.

## Performance invariants

- Never add a CSS `filter`, blur or perpetual animation to every `.unit`.
  Selection, construction and active combat may use bounded effects.
- Keep the whole marker memoized. Static structures should not reconcile while
  interpolated units move.
- The overview LOD omits details that cannot survive a pixel. Dense battles
  retain detail on selection, structures and high-value silhouettes.
- Keep resources in `Sc2ResourceLayer3D`; do not restore one React button plus
  model per mineral patch.
- Keep static timeline events memoized outside the playback tick.
- Prefer one path or sprite reference over nested CSS faces. Any new persistent
  node is multiplied by roughly 400–650 in late-game scenes.
- Couple transient animation state to replay playback. A paused replay must not
  keep combat, construction or selection loops running in the compositor.

## Dense-scene baseline

Use the Rainfall demo at 14:44 as a regression scene. On the August 2026 asset
catalog it renders 476 world models, 121 resources in one batched layer, about
3,700 DOM nodes, 99 sprite paths and no fallback silhouette. The earlier
per-entity implementation used about 5,500 nodes and repeated roughly 2,000
model paths in the same scene.

The supported viewport checks are 390×844, 1280×720, 1920×1080 and
2560×1080. They must have no document overflow, clipped tactical controls or
overlap between the compact HUD and analysis toolbar.

## Adding a model

1. Add the canonical type or family to `sc2-3d-assets.ts`.
2. Reuse a geometry only when footprint, elevation and signature still make the
   unit recognizable. Add a new silhouette when its outline is the identity.
3. Add state aliases to `canonicalSc2Type` when the replay emits a transient
   mode of the same entity.
4. Extend the full LotV coverage test and add observed replay aliases.
5. Validate at 100% and 150% zoom in 1440×900, 1280×720 and 390×844.
6. Validate a dense engagement and inspect DOM/model counts before committing.

Reference direction: official Blizzard game guides and portraits are useful
for broad silhouette cues. They are references only; repository assets remain
code-native and original.
