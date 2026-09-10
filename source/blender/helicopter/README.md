# Bell 206B-style helicopter

An original Blender mesh reconstructed from published dimensions and directly inspected aircraft photographs. This replaces a procedural game placeholder with an exported 3D asset. It is a Bell 206B-style approximation, not manufacturer CAD, a measured replica, or an airworthiness model. No paid generation or external mesh was used.

## Files and integration

- `helicopter.blend`: editable cabin, glazing, interior, engine deck, exhausts, tail boom, fins, skids, fittings and rotor parts.
- `../../../public/assets/vehicles/helicopter.glb`: runtime asset; repeated static fittings are merged for fewer draw calls.
- `build.py`: reproducible construction and export.
- `validate.py`: GLB reimport, finite geometry, UV, dimensions, rotor diameters and pivot rotation checks.
- `render.py`: renders the exported GLB, not the richer source scene or generated imagery.
- `front-quarter.png`, `side.png`, `rear-quarter.png`, `cabin.png`: actual GLB previews with fixed studio lighting.

The GLB uses metres, +Y up, +Z forward. Root `Helicopter` is at ground level, vertically below the main rotor mast. No scale or corrective rotation is needed. The cabin nose is near Z=+2.4; tail near Z=-7.15. Main rotor diameter is 10.16 m; tail rotor diameter is 1.65 m. Ground contact is within 0.3 mm of Y=0. Aircraft height is approximately 2.91 m. Do not use the rotor's full bounding box as a cabin collision box.

| Node | Pivot in GLB coordinates | Animate local axis |
| --- | --- | --- |
| `MainRotor` | `[0, 2.82, 0]` | `rotation.y` |
| `TailRotor` | `[-0.24, 1.82, -6.87]` | `rotation.x` |

Clone the hierarchy per vehicle before animating these nodes. The rotors have no baked clips; the game controls their rotation. The glass uses glTF transmission; provide scene lighting/environment for reflections. No aircraft registration, operator logo, pilot, flight physics or mission code is bundled.

## Reference traceability

- [Vertical Flight Society: Bell 206B-3 JetRanger III](https://vertipedia.vtol.org/aircraft/getAircraft/aircraftID/288): 10.16 m main rotor, 1.65 m tail rotor, two blades each. These rotor dimensions are enforced by the validator. This is a B-3 rotor configuration on an approximate short 206B cabin.
- [Kentucky Legislative Research Commission report](https://apps.legislature.ky.gov/lrc/publications/ResearchReports/rr184.pdf): indexed Bell 206B dimensions include 33 ft 4 in rotor and 31 ft 2 in fuselage. The approximately 9.5 m airframe length is a scale target, not a traced engineering drawing.
- [TransGlobal Aviation Bell 206B JetRanger II photo set](https://www.transglobalaviation.net/aircraft/7/901/bell/_bell-206b-jetranger-ii/): directly inspected front (`901_7550.jpg`), front quarter (`901_7547.jpg`) and rear quarter (`901_7549.jpg`). Informed windshield curvature, separate cabin windows, engine cowling, exhaust, tail fin, boom, skids and hub layout. The photographed aircraft has optional high skid equipment; optional floats and ground-handling wheels were not copied.

Photographs were viewed as references only. No third-party image pixels are embedded, redistributed, or used as textures. Navy/ivory/orange paint is an original game livery. All mesh geometry and materials are authored in the build script.

Cabin contour, door/window boundaries, interior, blade airfoil, engine fittings, fasteners and tail-fin planform are visual estimates. Real aircraft vary with equipment and production version. Small details and glass appearance still need art review in the mission's lighting. This is a substantial asset replacement, not a claim of exact reference matching or final photorealism.

## Rebuild and validation

From the repository root, using a separate background Blender process:

```sh
blender --background --factory-startup --python-exit-code 1 --python source/blender/helicopter/build.py
blender --background --factory-startup --python-exit-code 1 --python source/blender/helicopter/validate.py
blender --background --factory-startup --python-exit-code 1 --python source/blender/helicopter/render.py
```

Created with Blender 5.1.2. `validation.json` contains exact export counts and SHA-256. An independent review verified hierarchy/orientation and identified a protruding cabin floor; the floor was narrowed and raised before the final export. Browser GPU import was checked in an isolated Three.js viewer, including rotor toggling. Parent mission integration is a separate step; no shared gameplay components were changed.
