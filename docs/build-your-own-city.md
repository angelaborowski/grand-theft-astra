# Build your own city

Want to turn this into a London game? Start with one walkable place—Trafalgar Square, for example—and one mission. This repository is a working starting point, not an automatic city generator: locations, collisions, characters and missions are currently wired into the code.

## 1. Run the existing game first

Fork the repository, clone your fork, then use Node.js 22.13 or later and the pnpm version in `package.json`:

```sh
pnpm install
pnpm dev
```

Open http://localhost:3000. The backend runs on port 8787. Keep the original prototype (`pnpm start`, port 4173) separate from the TypeScript game.

NPC simulation runs without a model key. For live OpenAI-backed decisions and conversations, configure `OPENAI_API_KEY` in the ignored `apps/server/.dev.vars` file. Keep the key server-side and out of Git. The model is configured in `apps/server/wrangler.jsonc`; use one your team can access. Live calls incur API costs.

## 2. Plan one playable district

Collect maps, dimensions and photographs you have permission to use. For a Trafalgar Square prototype, map the square, the National Gallery frontage, Nelson’s Column, fountains, stairs and entrances. Record reference sources, asset licenses and which dimensions are approximate. Generated images are visual references, not survey measurements.

Choose a local origin and use metres throughout. The game uses X/Z for horizontal position and Y for elevation. Record north, scale and the Blender-to-game export orientation before building details.

## 3. Build the actual assets in Blender

Read `source/blender/README.md` and the relevant building/export directories. Start with correctly scaled geometry, recognizable silhouettes and a walkable ground surface. Add windows, doors, stonework and materials after the blockout works.

Keep editable `.blend` files and sources in `source/blender/`; export runtime GLBs and textures to `public/assets/`. Use descriptive London paths rather than overwriting Red Square sources. The web app exposes assets through its existing `apps/web/public/assets` symlink.

Higgsfield can help explore lighting, atmosphere and reference images. A generated picture or video does not supply a playable mesh, collision geometry or animation rig. Compare Blender renders against real photographs from several views before calling a reconstruction accurate.

## 4. Connect visuals and game rules together

| Area                       | Starting point                                                                     | What to adapt                                                       |
| -------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| District layout            | `packages/core/src/scene.ts`                                                       | Bounds, buildings, colliders, spawn, doors and checkpoint positions |
| Starting world             | `packages/core/src/simulation.ts`                                                  | Residents, places and initial game state                            |
| Mission rules              | `packages/core/src/actions.ts`                                                     | Objectives, validated actions and rewards                           |
| Scene rendering            | `apps/web/src/features/game/components/game-scene.tsx` and its imported components | London geometry, terrain, lighting and props                        |
| Character assets           | `apps/web/src/features/game/models/scene-assets.ts`                                | Models mapped to stable character IDs                               |
| Quest UI                   | `apps/web/src/features/game/models/quest-view.ts`                                  | Names, directions and targets that match the actual mission         |
| Server world configuration | `apps/server/wrangler.jsonc`                                                       | Separate instance naming and deployment configuration               |

Changing an asset alone does not move its collision walls, map marker or interaction point. Update their shared coordinates together. Keep IDs stable when retaining saves; use an explicit migration or a separate development world when replacing the district. Changing `WORLD_NAME` alone does not create London geometry or migrate old saves. Do not delete someone else’s local save to test a new city.

For a first London mission, have a courier meet the player by the gallery, collect a parcel, navigate a short marked route, and hand it over near a fountain. Get start, progress, failure, retry and one-time payment working before expanding the map.

## 5. Prove it is playable

Run the repository checks:

```sh
pnpm check
pnpm exec node --test test/*.test.mjs
```

Then play through the actual browser game: enter, walk the entire route, try doors and stairs, interact with characters, complete the mission, and reconnect. Confirm rewards are paid once, NPC IDs are not duplicated, and saved progress survives. Check camera collisions and frame times from street level as well as the overview. Use modest texture sizes, shared materials and distance-based character detail before increasing density.

## Before sharing your fork

Keep code and asset attribution, verify redistribution rights for every imported model, texture and photo, and check the repository’s license files. Public source availability does not automatically grant rights to every included asset. Add screenshots, your city’s source notes, known limitations and setup steps to your fork’s README. Never include API keys or local save databases.
