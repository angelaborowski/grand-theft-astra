# Verification checkpoint

- Blender 5.1.2 reimport validator passed: 110,028 triangles, 14 material meshes, 13,927,972 bytes, maximum runtime texture dimension 4096. Editable source count, finite coordinates and UVs verified.
- Eleven ray samples verify lower floor, central stair, upper landing, gallery floor and gallery stair elevations. These are geometry checks, not a replacement for game collision testing.
- `pnpm check` passed: lint, formatting, types, prototype tests, web production build and server dry-run.
- Actual GLB loaded in Three.js. Entrance, landing and return presets inspected. Step-walk from 1.2m to 9.6m into hall reached the upper landing. No captured browser errors after the final load.
- Independent review confirmed GLB totals/hash, source attribution and floor/stair contract. Its gallery-clearance finding was addressed by declaring galleries decorative/non-traversable. Central route is conservatively narrowed to ±1.75m to keep a 0.35m capsule clear of seats.
- Source render `previews/entrance.png` is from the final geometry/PBR pass. It is a Cycles render, not an in-game screenshot. Runtime captures are separately named.
- Main game opening, exit transition, collision and lighting integration belong to the parent task. None are claimed complete by this asset commit.

- Final visual correction separates the end arch from the wall face by 45 mm, removing coplanar patches. The reimport validator checks this separation. Final GLB SHA-256: `e7a57092b25dc4c1c008892e375e369939b4a73f9d0424736ce13611a1288567`.
