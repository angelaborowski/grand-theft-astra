# City overview and context trees

The principal Red Square landmarks are present, with partial surrounding masses. This is a square-scale scene, not a complete model of central Moscow. A wide aerial view exposes the edge of modeled coverage. Trees improve the planted context but do not replace missing buildings, streets, gardens, riverbanks or terrain.

## Trees

`city-landscape.blend` retains a collection for each tree, with editable trunk, branches and crown clusters. `build.py` recreates it in Blender and exports `public/assets/city-landscape.glb`, consolidated into five material meshes. Tree height, crown shape and foliage are approximate visual choices, not a surveyed species inventory.

`osm-trees.json` contains the Overpass response for natural=tree nodes in 55.750,37.611–55.757,37.621, retrieved 10 September 2026. Only roots west of local X=-85m and within Y=-500…500m are considered. Building surfaces within a sampled five-metre crown clearance and roots closer than five metres to another accepted root are excluded. This deliberately selects a subset, rather than reproducing every mapped tree. The local tangent projection follows the original scene's documented origin and bearing; it is approximate.

Map data © OpenStreetMap contributors, [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). The downloaded node data and derived positions in `report.json` are supplied under ODbL 1.0. Preserve [OSM attribution](https://www.openstreetmap.org/copyright) on redistribution. Query: `node[natural=tree](55.750,37.611,55.757,37.621)` through https://overpass-api.de/api/interpreter. No third-party tree meshes or photographic textures used.

## Integration and limits

Load alongside the city with the existing -0.12m Y offset in Three.js. No additional scale, rotation or translation. Blender coordinates export automatically as game (x,z,-y). All roots are beyond the current square's western playable boundary. This is visual context without new collision shapes; expanded playable areas must account for tree trunks before allowing traversal there.

`preview.html` loads the exported city, revised museum and trees directly through Three.js. Serve the repository root and open `/source/blender/city-landscape/preview.html`. It is an asset coverage preview, not the full gameplay scene; runtime paving, GUM detail repetition, props and characters are not replicated. Buttons toggle trees and switch between oblique and overhead views. Empty surroundings expose model coverage rather than claiming the real city has empty lots.
