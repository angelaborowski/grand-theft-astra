# Grand Theft Astra

A multiplayer browser-game prototype set in a 3D reconstruction of Red Square, Moscow. Explore on foot, drive vehicles, follow missions, and interact with residents in a server-managed world. Optional OpenAI integration supplies NPC conversations and decisions.

Want to adapt it to London or another place? Read **[Build your own city](docs/build-your-own-city.md)**. Creating a new city currently requires Blender assets and code changes; there is no in-app city generator.

## Run locally

Requirements: Node.js 22.13 or later and pnpm 11.22.0, as declared in `package.json`.

```sh
git clone https://github.com/angelaborowski/grand-theft-astra.git
cd grand-theft-astra
pnpm install
pnpm dev
```

Open **http://localhost:3000** and choose **Enter Red Square**. This starts the web app on port 3000 and the local Cloudflare backend on port 8787. Keep both running while playing.

New players begin inside the Historical Museum. Walk through the hall, down the steps, and through the doorway into the square. Existing players resume their saved progress. On foot in the square, **Play first mission** launches Last Flight when that mission is not already running or completed.

## What is implemented

- Third-person movement, running, jumping, crouching, camera controls, map and quest tracking.
- A museum opening and an enterable guesthouse.
- Cars, helicopter controls, and basic combat/equipment systems.
- **Last Flight:** a timed driving route with four ordered gates, two ramps, and a film handoff at the helipad.
- A shelter journey involving characters, parcel delivery, money and bed rental.
- Named characters and an expanded resident population with shared simulation state.
- Multiplayer world updates, persistent player progress, and server-validated actions and rewards.
- Blender-built environments and character assets, sky/environment lighting, clouds and snow.

These are prototype features. Buildings and characters remain approximations, and visual detail and animation quality vary across assets.

## Controls

| Action | Control |
| --- | --- |
| Walk | W A S D |
| Look | Mouse / camera drag |
| Run | Hold Shift |
| Jump | Space |
| Crouch | Ctrl |
| Interact | E |
| Enter or exit vehicle | F |
| Aim / fire or punch | Right / left mouse |
| Reload | R |
| Map | M |
| Quests | Tab |
| Inventory | I |
| Menu / close | Esc |

Helicopter controls use W A S D to move, Space to ascend, Shift to descend, and Q/E to turn. Exit with F after landing. The in-game Controls view provides context-specific bindings; aiming and firing use mouse capture.

## Optional live NPC AI

The backend includes OpenAI Responses API workflows for character decisions and conversations. World validates permitted actions before applying their effects; models do not directly own positions, inventory or rewards.

Configure `OPENAI_API_KEY` in the ignored **`apps/server/.dev.vars`** file, then restart the backend. Keep credentials server-side and out of Git. The model setting is in `apps/server/wrangler.jsonc`; use a model your team can access. Live API use incurs costs.

Without a key, the world simulation still runs and the interface reports that Astra is disabled. Scripted movement is not evidence of live model-driven behaviour. Live NPC AI has not been verified in the latest local handoff because no team key was configured.

## Persistence and multiplayer

The current app uses a Cloudflare Worker with World and Person Durable Objects and workflows. The server validates gameplay actions and maintains shared state. Local development data lives under Wrangler’s local persistence directory; retain it to keep local saves.

Use separate browser profiles for distinct local players. A remotely accessible multiplayer session requires a running, correctly configured deployment; localhost is only your development instance. Closing a client does not delete its save, but stopping the local backend stops its live simulation.

## Validation and known limitations

```sh
pnpm check
pnpm exec node --test test/*.test.mjs
```

`pnpm check` runs lint, formatting, type checks, current-app tests and production builds. The second command runs the original prototype's separate tests.

At the latest documented handoff, the checks passed. An isolated Rapier/WebSocket run completed all four Last Flight gates, both ramps, the handoff, one-time reward and reconnect persistence. That is physics/server verification, not a complete browser keyboard playthrough.

Intermittent browser position-recovery failures and variable outdoor frame rates remain under investigation. Recent changes bound car prediction during delayed acknowledgements and smooth visible walking corrections. They do not establish a bug-free or constant-frame-rate game. See [the implementation plan](docs/implementation-plan.md) for detailed evidence and remaining work.

## Repository layout

| Path | Purpose |
| --- | --- |
| `apps/web/` | React/TypeScript browser game and 3D renderer |
| `apps/server/` | Cloudflare backend, persistence and OpenAI workflows |
| `packages/core/` | Shared schemas, rules, coordinates and collision definitions |
| `public/assets/` | Runtime models, textures, audio and interface assets |
| `source/blender/` | Editable scenes, export scripts and source notes |
| `source/characters/` | Character reference and production files |
| `docs/` | City adaptation guide, implementation notes and visual studies |
| `server.mjs`, `world.mjs`, `public/*.js`, `test/` | Original Node.js prototype and its tests |

The web app exposes shared assets through the `apps/web/public/assets` symlink. Blender creates editable geometry and runtime exports; Higgsfield imagery establishes visual targets and presentation material, not automatically playable 3D assets.

## Original prototype

The earlier Node.js game remains available separately:

```sh
pnpm start
```

Open **http://localhost:4173**. Its controls, mission implementation and saves differ from the current TypeScript app. Do not use its historical validation notes as evidence for the current game. Preserve its ignored `data/` directory if you need those saves.

## Source and asset attribution

Map data attribution and Blender construction notes are in [source/blender/README.md](source/blender/README.md). Dependency notices are in [THIRD-PARTY-LICENSES.txt](THIRD-PARTY-LICENSES.txt); imported assets also have source-specific notices and licenses in their production directories.

The repository is public. A root project-wide license has not yet been supplied; public visibility alone does not grant a blanket license to redistribute the code or every included asset. Retain and check the applicable notices when adapting the project.
