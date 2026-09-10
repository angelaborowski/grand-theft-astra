# Building accuracy audit — 10 September 2026

This pass starts with the weakest prominent facade, the Historical Museum. Its existing game treatment was a uniform three-row grid of pale rectangular windows over an OSM-derived shell. The new Blender replacement adds tier-specific arches, red surrounds, fanlights, portal doors, cornices, pilasters, pointed gables, tiered tower crown arches and light metal roof material. Exact decorative proportions remain approximate.

## Reference audit and next priorities

| Landmark                | Evidence inspected                                                                                                                                                                     | Current limitation / next improvement                                                                                                                                                                                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Historical Museum       | Official museum front photograph plus a closer independent photograph; original OSM parts                                                                                              | Facade hierarchy improved here. Next: accurate roof planes (current bounding-axis roofs have triangular overlaps), solid sculpted tower parapets, gilded eagle/animal finials, full side/rear elevations, carved ornament and calibrated multi-view proportions.                        |
| GUM                     | Existing detail source/report and [GUM's official history](https://gum.ru/history/)                                                                                                    | Runtime repeats a 60 m, 162,980-triangle fragment five times, with end clipping. Replace with a full-length authored bay schedule, differentiate entrances/end pavilions, remove repeated ornament seams, and optimize repeated instances. Existing report admits inferred bay spacing. |
| Saint Basil's           | Existing mapped parts/dome source; [museum architecture account](https://shm.ru/arkhitektura-i-zhivopis-pokrovskogo-sobora/) and [official cathedral page](https://shm.ru/museum/hvb/) | Dome patterns/profiles remain inferred; painted diagonals and portals are partial. The official page's 47.50 m central church height must not be confused with an overall exterior height including foundation/finial. Obtain consistent height datums before rescaling.                |
| Kremlin boundary/towers | Existing wall script and [Kremlin Museums: Spasskaya](https://kremlin-architectural-ensemble.kreml.ru/architecture/view/spasskaya-bashnya-moskovskogo-kremlya/)                        | Official tower height is 67.3 m to the star / 71 m including star. Existing wall is a repeated 14–16 m approximation on prior alignment; map-to-wall alignment, gates and different tower crowns require coordinated follow-up.                                                         |
| Mausoleum               | Existing mapped parts and [UNESCO ensemble account](https://whc.unesco.org/en/list/545/)                                                                                               | Prioritize granite/black stone, stepped platform, entrance and lettering from approved close photographs. UNESCO establishes ensemble context, not exact dimensions. No dimensional correction justified in this pass.                                                                  |

The existing [OSM-derived map](../source/blender/map-layout.json) uses origin 55.754 N, 37.620 E; native metres with X approximately bearing 41.6° and Y approximately 311.6°. This is a local tangent-plane approximation, not a cadastral survey. See the existing [source README](../source/blender/README.md) for original extract, aerial-reference provenance and attribution. This pass reuses the committed extract and does not claim a fresh map survey.

| Element       | Existing mapped X range (m) | Existing mapped Y range (m) |
| ------------- | --------------------------- | --------------------------- |
| GUM           | 66.19 to 164.98             | -150.98 to 116.12           |
| Museum        | -13.71 to 45.46             | 143.60 to 264.69            |
| Saint Basil's | -23.67 to 28.16             | -283.98 to -224.12          |
| Mausoleum     | -41.58 to -11.19            | -34.46 to 3.65              |
| Spasskaya     | -76.18 to -50.46            | -182.92 to -164.61          |
| Nikolskaya    | -61.85 to -33.82            | 132.84 to 148.57            |
| Senatskaya    | -63.82 to -55.22            | -21.40 to -11.46            |

These are bounding ranges of the committed mapped outer rings, not measured facade lengths or collision proposals. No core collision coordinates, save data, characters, vehicles or backend files change.

## Deliverable and validation

See [museum source README](../source/blender/museum-detail/README.md) for source/export commands, reference links, uncertainties and integration contract. The asset validator confirms exact preservation of the old shell's local vertices, polygon indices and object transforms, matching GLB bounds within 1 mm, finite coordinates, UVs and embedded roughness. The runtime budget is fewer than 60,000 triangles, at most 16 material meshes and under 8 MB; final generated statistics are in `validation.json`.

`preview.html` loads the actual original city and replacement GLBs through Three.js, uses the same -0.12 m group offset and original procedural museum window function, and allows fixed-camera Before/After comparison. It verifies asset rendering and coordinate integration in WebGL; it is not a mission/physics playtest or proof of the final React loader integration. Parent owns that loader change.

Higgsfield balance and model tools were used. A 1.25-credit material study request was refused with “Requires basic plan or higher”; no successful job or generated texture resulted. No purchase was made. Real references drive accuracy decisions.
