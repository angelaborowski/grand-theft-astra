# GPT8 engineering rules

These rules apply to every agent, including agents that build Angela's assets. Read relevant code and preserve working paths.

## Ownership

- `apps/web/`: React game, controls, rendering, interface, and asset integration.
- `apps/server/`: Cloudflare Worker, Durable Objects, persistence, and Astra Workflows.
- `packages/core/`: shared schemas, game rules, stable entity IDs, coordinates, and collision definitions.
- `public/assets/` and `source/blender/`: Angela's runtime assets, editable sources, export scripts, and attribution.
- `public/*.js`, `server.mjs`, `world.mjs`, and `test/`: original prototype; preserve its behavior and entrypoints.

## Commands and dependencies

Use pnpm for all JavaScript and TypeScript work. Read package scripts and use them instead of invoking their underlying tools directly.

- `pnpm dev`: new game on port 3000; Cloudflare backend on port 8787.
- `pnpm start`: original prototype on port 4173.
- `pnpm check`: required checks for the new game and the original prototype tests.
- `pnpm storybook`: interface stories. Update the relevant story when changing the interface.
- `pnpm cf-typegen`: regenerate binding types after Cloudflare configuration changes.

The pnpm catalog owns dependency versions. Use `catalog:` in package manifests.
The named `legacy` catalog can preserve the original prototype's dependency versions through `catalog:legacy` references.
Use pnpm for dependency changes. Check that it preserves catalog references.
`.oxlintrc.json` configures minimal anti-slop rules; `tools/oxlint/anti-slop/UPSTREAM.md` records vendored provenance. Update these plugins and Oxlint together.
Keep TypeScript strict. Applications import shared packages; applications must not import each other.
Reuse the installed runtime, SDK, and libraries before adding infrastructure. Do not introduce another framework.

## Game and AI contracts

World owns positions, money, inventory, ownership, missions, and accepted action effects.
Person objects own individual memory and schedules. They must not duplicate World's physical state.
Astra Workflows use the official OpenAI SDK and Responses API outside simulation ticks and database transactions.
Astra proposes permitted actions. World validates current state, saves effects, and acknowledges completed operations.
Preserve JSON-RPC contracts, server-supplied identity, and idempotency for player actions and model tools.
Do not present scripted behavior as Astra output. Show disabled and failed provider states accurately.
Preserve stable entity IDs. Rendering, movement, interactions, and collision checks must use compatible coordinates.

## Assets and existing work

Preserve Angela's assets, original prototype, source files, attribution, and existing Git history.
Use the existing Blender source and export pipeline. Do not overwrite generated assets with unrelated replacements.
Validate changed exports with the existing asset validators. Keep original sources editable.
Change shared coordinates or collision definitions together with their consumers. Account for saved positions before moving game locations.
Do not delete or revert another person's work. Inspect concurrent changes before editing shared files.

## Verification and secrets

Use existing lint, format, type, build, and focused test scripts. Fix failures before pushing.
Add only minimal tests for important changed behavior. This hackathon prioritizes a working, understandable game.
Keep secrets in ignored local files such as `apps/server/.dev.vars`; never print them or commit them.
Keep `.wrangler/`, `data/`, dependencies, and generated build output out of Git. Preserve local saves during migration.
Use one independent agent review for substantial changes. Fix its relevant findings without expanding scope.

## Git and collaboration

Work on the current default branch. Do not create a branch unless the user requests it.
Stage only the intended changes. Fetch before pushing and preserve concurrent remote changes; never force-push.
Do not start duplicate development servers. Stop servers you start after verification, unless the user requests they remain running.
Write concise comments and documentation. Report what works, what was checked, and any remaining blocker.
