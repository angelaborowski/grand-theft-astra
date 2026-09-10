# React environment polish, 10 September 2026

Implemented in normal apps/web gameplay on baseline 4bd5888. The original editable Blender sources, GLBs, texture files, licenses, GUM repeats, room furnishings, shared coordinates and collision definitions are preserved.

- Lower exposure and warm direct sunlight retain paving and stone color. A static 128px sky probe includes neutral ground bounce; glazing uses dielectric reflection rather than metallic tint. This is a sky/ground approximation, not building-to-building reflections.
- The existing 2048px directional shadow is snapped in light space to reduce walking shimmer. Its depth range is tightened, and repeated GUM material clipping now applies to shadows.
- Museum windows add dark reveals, crossbars and stepped projecting sills/lintels, merged by four materials. Placement uses the existing facade raycasts. Geometry remains an approximate facade study, not a surveyed reconstruction.
- Brick relief is less exaggerated, horizontal brick faces have non-degenerate X/Z UVs, and paving is toned down.

## Verification

Isolated frontend port 3108 and local backend port 8888; shared servers and saves were untouched. Browser screenshots compare the same 1280x720 viewport, ordinary gameplay plus temporary fixed camera poses in the same GameScene: GUM (52, 2.3, 84) toward (66, 7, 74); museum (18, 2.3, -124) toward (18, 9, -145). Temporary capture and timing code was removed. No asset exports were changed, so Blender export validators were not rerun.

180-frame browser samples at the museum camera, all render passes counted:

| Metric                   |    Before |     After |
| ------------------------ | --------: | --------: |
| Draw calls               |       372 |       376 |
| Submitted triangles      | 1,502,072 | 1,539,656 |
| Median frame ms          |      12.5 |      19.9 |
| 95th percentile frame ms |      46.0 |      34.1 |

These are development-browser observations with active NPC simulation, hot reload and other desktop workloads, not an isolated GPU benchmark. Median timing regressed in this sample while the tail improved; no speedup or stable frame-rate guarantee is claimed. Submitted geometry increased 2.5% in this view. A separate initial street sample was 776 calls / 2,921,800 triangles. Resolution changed during an early comparison, so its timing comparison was discarded.

Independent review found one top-surface UV projection issue; corrected and independently confirmed resolved. No outstanding review findings.

Known pre-existing issue: browser logs recorded a null body translation in player.tsx during startup in both baseline and revised runs. The scene subsequently rendered, but this should be addressed by the player owner. Astra correctly displayed disabled; no provider credentials or paid services were used. The existing game bundle size warning remains. This pass improves the stylized reconstruction; it does not deliver photorealism or calibrated architecture.

`pnpm check` passed: lint, formatting, strict type checks, 5 core tests, 10 legacy tests, web client/SSR build and Worker dry-run build.
