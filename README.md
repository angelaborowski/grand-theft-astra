# GPT8 — Astra game integration

Want to adapt the game to London or another place? Read [Build your own city](docs/build-your-own-city.md).

The new TypeScript game combines the GPTA systems with Angela's Red Square assets. Normal gameplay now includes the extended GUM facade, raycast-fitted museum details, scanned brick/paving materials, sky/environment lighting, contact shadows, and original furnishings adapted to the new guesthouse. Mila uses the latest Blender study; its likeness remains unfinished. The other five named NPC models remain integrated. No separate asset-library UI is required.

The original renders, source files, comparison view, and two team-character image references remain preserved. The two team characters still have no playable meshes. Guesthouse furniture remains visual, matching the new game's existing non-collidable furniture behavior; server movement and saved coordinates were not changed.
The working repository moves to `/Users/az/projects/gpt8-red-square`.

```sh
pnpm install
pnpm dev
```

Open **http://localhost:3000** and select **Start / continue**. The backend uses port **8787**.
The game includes third-person controls, a city overview, vehicles, dialogue, a shelter mission, and 100 NPCs with individual Durable Objects.
Astra Workflows use the Responses API. Set the backend key in ignored `apps/server/.dev.vars`; without it, the interface shows **Astra disabled**.

Angela's assets remain in `public/assets/`. The new web app reads them through the `apps/web/public/assets` symlink.
The original Blender source and export pipeline remain unchanged. Shared scene coordinates and collision definitions connect the assets to game rules.

The original prototype remains available through **`pnpm start`** at **http://localhost:4173**.
Its original documentation appears below unchanged. Its mission rules and saved data remain separate from the new game.

Before this port, a real WebSocket session completed the direct delivery and bed rental: **₽40 remaining, reputation 1, shelter rented**.
The integrated scene still needs runtime validation. See the [v3 implementation plan](docs/implementation-plan.md) for scope, ownership, and evidence.

---

# GPT8 — Red Square playable MVP

A browser game using the editable Red Square environment built in Blender. The 3D game and the separate Higgsfield presentation image are different deliverables.

## Play

With the included server running, open http://localhost:4173.

To start from this folder with Node.js 22.13 or later:

```sh
npm install
npm start
```

Open the address shown by the server. Enter a name. WASD or arrow keys move, Shift runs, drag looks around, and E interacts. The on-screen interaction button also works. **Walk to marker** assists navigation. **Lock mouse** enables first-person mouse capture if the browser supports it; Esc releases it.

Your first task is to find somewhere to sleep. Talk to Mila, collect her parcel, then either deliver it to Lev for ₽80 or ask Niko to finish for ₽60 after his fee. Rent a bed from Irina for ₽20; speak again to enter the fictional guesthouse room. Buy the book stall for ₽50 if it is still available. Help Sasha water the flowers to earn ₽10 and reputation and change the planter for every connected player.

## What works

- Real 3D movement in the Red Square scene with bounded collision checks.
- Six named characters with roles, scripted dialogue and per-player saved interaction memories; seven background walkers follow shared time-based routines.
- Delivery mission with two resolutions, inventory, reputation, shelter and a shared property.
- The book stall has a single owner across all players and earns ₽12 per real minute, with offline earnings capped at eight hours per return.
- One fictional, enterable hostel interior. This is a prototype room, not a reconstruction of a real Red Square interior.
- Node HTTP + WebSocket server; nearby player avatars, shared garden changes and event notices.
- SQLite saves for player state, possessions, memories, property ownership, events and world epoch.
- Saved progress resumes after reconnect and server restart. The twelve-minute day and resident routines use server time.

## Play together

Use a different browser/profile for a second explorer. Tabs in the same browser share the saved explorer token; opening the same explorer twice transfers the connection to the latest tab.

Friends on the same network can visit this computer's LAN address on port 4173 while this server is running and the firewall allows it. Use your host computer’s current private network address. This is not a deployed internet service. Closing the browser preserves progress; shutting down the computer stops live connections. Time-based earnings are calculated when you return.

## Frontend/backend contract

The client sends movement or interaction intent. The server validates bounds, movement distance, proximity, prerequisites and balances. Only the server awards money, changes inventory/reputation, assigns property or authorizes interior transitions. Important actions persist before the result is returned; movement autosaves every five seconds and on disconnect. SQLite stores a small world snapshot in a transactional row; this is suitable for the prototype, not a claim of million-entity database architecture.

The browser keeps an opaque session token in localStorage. This is lightweight local-session identity, not production account authentication. The server binds to the network to support the local multiplayer test. Public deployment needs authentication, TLS, operational limits, hosting, backups and a database migration plan.

## Validation

Run `npm test`. Automated tests cover both mission branches, duplicate-reward prevention, insufficient funds, collision bounds, capped offline income, remembered interactions, room transitions, real two-client WebSocket state and SQLite recovery after a server restart. See `VALIDATION.md` for browser playtest results.

## Visuals and limitations

Actual game geometry: `public/assets/red-square.glb`, based on our Blender reconstruction (214,292 triangles). The game supplies procedural paving and brick textures and real-time lighting. Many facades remain simplified. This is not a hyperrealistic finished city.

The separate `docs/visual-development/higgsfield-visual-target.png` shows the photographic direction. It has not been projected onto the buildings or substituted for geometry.

Characters use deterministic dialogue and persistent counters/context. **Live Astra/OpenAI dialogue is not connected**, and no API credentials were available during setup. No ongoing inference costs are incurred. Further work: richer state-grounded conversations, authored character animation, accurate exterior details, material baking, scene optimization, more interiors and public multiplayer hosting. There is no any-city generator, vehicle/combat system or photo-avatar generator.

## Attribution

Map data © OpenStreetMap contributors, ODbL 1.0: https://www.openstreetmap.org/copyright . Derived geometry and references are documented in `source/blender/README.md`. No third-party photographic textures are used in the playable scene. Three.js and ws licenses are included in `THIRD-PARTY-LICENSES.txt`.

`data/` contains the live local save and is excluded from the distribution ZIP. Keep it to preserve this server's world. The isolated playtest used a separate data directory.

## Repository layout

- `public/`: browser game and game-ready GLB.
- `server.mjs`, `world.mjs`: authoritative simulation and persistence.
- `test/`: automated game-rule and multiplayer integration checks.
- `source/blender/`: editable Blender source, reproducible construction/export scripts and map data.
- `docs/visual-development/`: verified Higgsfield photographic target.

GitHub Actions runs the test suite on pushes and pull requests. Local save data, dependencies and credentials are excluded from Git.

## GUM facade detail pass

Open [the facade preview](http://localhost:4173/?view=gum) while the server is running. Three camera views inspect the actual game renderer; the same geometry is loaded in gameplay. The pass adds a 60m reference-informed facade, original PBR paving textures, sky reflections and screen-space contact shadows. Source and accuracy notes are in [source/blender/gum-detail](source/blender/gum-detail/README.md). It is an approximation with substantially more geometry, not a finished hyperrealistic or measured reconstruction. A rigged character and Unreal prototype remain future work.
