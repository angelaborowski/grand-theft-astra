# GPT8 · Red Square — refined reconstruction

Editable Blender scene, three Blender renders and a validated GLB export. Created 10 September 2026 with Blender 4.5.3 LTS.

This iteration improves the spatial blockout using mapped building parts and more detailed landmark geometry. It remains a schematic reconstruction, not a photogrammetric scan, survey-accurate digital twin or finished photorealistic game environment.

## Deliverables

- `red-square-refined.blend`: editable scene with 4,106 mesh objects in named collections, procedural materials and three cameras.
- `red-square-refined.glb`: 13 consolidated meshes, 214,292 triangles. Principal buildings remain separate; detail collections are separate meshes.
- `previews/01-square.png`: eye-level cathedral and Spasskaya view.
- `previews/02-cathedral.png`: closer cathedral view.
- `previews/03-aerial.png`: oblique site view.
- `build_refined.py`: reproducible scene construction; run with Blender `--background --python build_refined.py`.
- `export_validate.py`: opens the saved scene, exports GLB, reimports it and checks mesh counts, triangle counts and finite coordinates.
- `building-parts.json`, `map-layout.json`, `mapped-parts-report.json`: mapped geometry, identifiers and construction traceability.
- `scene-report.json`, `validation.json`: measured model statistics and validation results.

No external texture files are needed to open the Blender project. Three renders are 1800 × 1125 PNGs.

## What improved

Mapped building-part footprints, heights and minimum heights now drive 1,115 source parts across the landmark and context collections. Some stacked cathedral dome components are replaced with smooth modeled domes. The scene adds patterned onion domes, chapel drum windows, tent ribs, selected painted façade lines, four Spasskaya clock faces and tower details. Materials use procedural brick and paving rather than photographic textures.

## Accuracy and remaining work

OSM positions and height tags are community data and have not been checked against a survey. Missing materials are inferred. Dome profiles, pattern placement, façade trim and clock placement are reconstructed approximations. A cathedral photograph was visually inspected, but this is not a multi-view photographic calibration.

GUM, the Historical Museum and context façades still need doors, windows and detailed stonework. Several roofs are inferred from a bounding-axis envelope rather than roof drawings. Courtyard holes are not consistently subtracted from roof caps; some contextual roofs can overlap or span courtyards. The tower openings are surface panels, not traversable holes. Terrain is flat, context coverage is incomplete, and no contemporary temporary installations are modeled.

The GLB exports material base colors but does not preserve Blender's procedural brick and paving. There are zero bitmap textures. Matching real-time appearance needs UVs and baked material maps. There are no interiors, collisions, LODs, navigation, lightmaps, characters or gameplay, and no runtime performance target has been validated.

## Higgsfield presentation

The ground-level Blender render was successfully used by Nano Banana Pro on the Higgsfield website. A completed 1264 × 848 result was recovered from the account and downloaded; see `../../docs/visual-development/higgsfield-visual-target.png`. The website asset panel confirms the prompt, reference attachment, model and creation time. No additional successful generation was submitted during recovery.

This is a photographic visual target, not updated Blender geometry. It adds facade ornament and changes some architectural details, so it is not measured evidence. The Higgsfield watermark is retained. Plugin job display could not resolve the website output; verification used the authenticated website and downloaded artifact.

## Research and modeling decisions

| Source | Used for | Confidence / limitation |
|---|---|---|
| [UNESCO: Kremlin and Red Square](https://whc.unesco.org/en/list/545/) | Landmark ensemble and relationship to the Kremlin wall | Authoritative context; not measured elevations |
| [OpenStreetMap extract](https://www.openstreetmap.org/api/0.6/map?bbox=37.615,55.751,37.625,55.757) | Actual mapped outlines of paving and eight principal structures | Community mapping, not a cadastral survey; extracted 10 September 2026 |
| [Kremlin Museums: Spasskaya Tower](https://kremlin-architectural-ensemble.kreml.ru/en-Us/architecture/view/spasskaya-bashnya-moskovskogo-kremlya/) | Tower height: 71 metres including star | Official stated height; simplified silhouette |
| [Kremlin Museums: towers](https://kreml.ru/ru/museums/arxitekturnyi-ansambl-moskovskogo-kremlia/arxitektura-2/basni) | Brick wall character and height range | Wall modeled at an approximate 14–16 metres here |
| [GUM: history and contemporaneity](https://gumrussia.com/history/) | Covered shopping passages and glass roof concept | Mapped roof parts with inferred profiles; no exact roof truss reproduction |
| [Aerial reference](https://russiable.com/red-square-moscow-monuments-museums-cathedrals/) | Visual check of building arrangement, GUM roofs, wall and skyline | Reference only; photograph not embedded or redistributed as an asset |
| [Street panorama, MosDay](https://mosday.ru/photos/?249_413) | Indexed street-view reference for facade rhythm and landmark relationships | Full-size image retrieval returned 403; not used as a measured photographic source |
| [Red Square overview](https://en.wikipedia.org/wiki/Red_Square) | Commonly reported 330 × 70 m central square dimensions | Secondary source; not used to force the larger mapped paving into a rectangle |

### Footprint traceability

| Element | OSM relation | What is mapped |
|---|---|---|
| Red Square paving | [1577673](https://www.openstreetmap.org/relation/1577673) | Full mapped outer boundary |
| GUM | [3330565](https://www.openstreetmap.org/relation/3330565) | Outer footprint |
| Historical Museum | [5963922](https://www.openstreetmap.org/relation/5963922) | Outer footprint |
| Saint Basil’s | [3030568](https://www.openstreetmap.org/relation/3030568) | Outer foundation footprint |
| Lenin Mausoleum | [3272726](https://www.openstreetmap.org/relation/3272726) | Outer platform footprint |
| Spasskaya | [1360656](https://www.openstreetmap.org/relation/1360656) | Tower foundation footprint |
| Nikolskaya | [1359372](https://www.openstreetmap.org/relation/1359372) | Tower foundation footprint |
| Senatskaya | [1359374](https://www.openstreetmap.org/relation/1359374) | Tower foundation footprint |

Local origin: **55.754° N, 37.620° E**. One Blender unit equals one metre. X points approximately northeast (bearing 41.6°); Y points northwest (311.6°). A local tangent-plane approximation projects the coordinates, then rotates the scene to align with GUM. The broader paving footprint is roughly 414 m long in this coordinate frame and includes space beyond the often-quoted 330 m central rectangle. These are different boundaries.


## Additional references and asset provenance

- [Saint Basil’s Cathedral, Red Square photograph](https://commons.wikimedia.org/wiki/File:St._Basil%27s_Cathedral,_Red_Square.jpg): longmandancer@btopenworld.com, CC BY-SA 2.0, 4 June 2008. Visually inspected for masonry, trim and dome character. Reference only; image is not bundled or used as a texture.
- [Kremlin clock](https://en.wikipedia.org/wiki/Kremlin_Clock): 6.12 m dial diameter used for modeled faces; face elevation and decorative construction remain estimates.

Map data © OpenStreetMap contributors, available under the [Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/). `map-layout.json` and `building-parts.json` are derived OSM data supplied under ODbL 1.0. Preserve attribution with redistribution; see [OSM copyright](https://www.openstreetmap.org/copyright).

No third-party 3D meshes, photographic textures, HDRIs or paid assets were imported. The geometric reconstruction and materials are procedural. Blender renders show the actual saved geometry; Higgsfield imagery, when generated, is separate visual development.

Repository note: the playable GLB is at `../../public/assets/red-square.glb`. Preview renders and the full original artifact package remain in the original local project outputs; they are not required to run the game.
