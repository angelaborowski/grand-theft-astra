# GPT8 engineering rules

These rules apply to every agent, including agents that build Angela's assets. Read relevant code and preserve working paths.

## Ownership

- Angela owns assets, editable sources, materials, lighting, and visual scene code, including React scene components.
- Alexander owns game rules, state, transport, shared contracts, CI, and deployment.
- Both people change `apps/web/`. State shared files and intended changes in the current conversation before editing.
- If another person is editing the same file, agree who applies the combined change before editing it.
- `docs/implementation-plan.md` owns project scope, decisions, and completion checks. Update it in place.

`apps/server/` owns the Cloudflare backend. `packages/core/` owns shared schemas, game rules, entity IDs, coordinates, and collision definitions.
`public/assets/`, `source/blender/`, and `source/characters/` hold runtime assets, editable sources, export scripts, and attribution.
`public/*.js`, `server.mjs`, `world.mjs`, and `test/` form the original prototype. Preserve its behavior and entrypoints.
Ownership identifies who coordinates changes; it does not prohibit agreed work across these areas.

## Commands and dependencies

Use pnpm for all JavaScript and TypeScript work. Read package scripts and use them instead of invoking their underlying tools directly.

- `pnpm dev`: new game on port 3000; Cloudflare backend on port 8787.
- `pnpm start`: original prototype on port 4173.
- `pnpm check`: required checks for the new game and the original prototype tests.
- `pnpm cf-typegen`: regenerate binding types after Cloudflare configuration changes.

The pnpm catalog owns dependency versions. Use `catalog:` in package manifests.
The named `legacy` catalog can preserve the original prototype's dependency versions through `catalog:legacy` references.
Use pnpm for dependency changes. Check that it preserves catalog references.
`.oxlintrc.json` configures minimal anti-slop rules; `tools/oxlint/anti-slop/UPSTREAM.md` records vendored provenance. Update these plugins and Oxlint together.
Keep TypeScript strict. Applications import shared packages; applications must not import each other.
Reuse the installed runtime, SDK, and libraries before adding infrastructure. Do not introduce another framework.

## Skills

Load the relevant installed skills before changing their area. Keep essential shared rules here; personal skills may be unavailable to other contributors.

| Work            | Skills                                                                    |
| --------------- | ------------------------------------------------------------------------- |
| TypeScript      | `coding-standards`                                                        |
| React           | `frontend-react-tanstack`, `vercel-react-best-practices`                  |
| Server          | `backend-architecture-cloudflare`, `cloudflare`, `workers-best-practices` |
| Durable Objects | `durable-objects`                                                         |
| Deployment      | `wrangler`                                                                |

Apply skills to changed behavior. Preserve existing game and transport contracts; do not start unrelated migrations.
User instructions take precedence over skill guidance. Report missing skills without claiming to have used them.

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
Validate changed exports with the existing asset validators. Verify their appearance in the game. Keep original sources editable.
Preserve asset paths, entity IDs, coordinates, scale, and animation names unless the change includes their consumers.
Change shared coordinates or collision definitions together with their consumers. Account for saved positions before moving game locations.
Do not delete or revert another person's work. Inspect concurrent changes before editing shared files.

## Verification and secrets

Use existing lint, format, type, build, and focused test scripts. Fix failures before pushing.
Add only minimal tests for important changed behavior. This hackathon prioritizes a working, understandable game.
Keep secrets in ignored local files such as `apps/server/.dev.vars`; never print them or commit them.
Keep `.wrangler/`, `data/`, dependencies, and generated build output out of Git. Preserve local saves during migration.
Use one independent agent review for substantial changes. Fix its relevant findings without expanding scope.
Report the visible result, commit when created, checks, and remaining blockers. Report browser verification separately from automated checks.
Deployment commands and the live domain belong in `docs/implementation-plan.md`.

## Interface verification

Do not create, maintain, run, or use Storybook stories in this project.
Use the actual game for interface work. Alexander checks loading screens and visual appearance himself.
This project rule overrides Storybook requirements in personal rules, skills, and older project documents.

## Git and collaboration

Work on the current default branch. Do not create a branch unless the user requests it.
Use one agent for Git mutations in a shared checkout. Do not move, stage, or stash another person's changes.

1. Inspect `git status` and fetch before editing. Preserve concurrent local and remote changes.
2. Stage only intended files and commit on the current branch. Never bypass hooks.
3. Fetch before pushing. Rebase only your unpushed commits when no tracked changes or active edits remain.
4. Inspect the combined diff after integration. Run `pnpm check` before pushing code, assets, or build changes.
5. Push normally. If the remote changes again, repeat synchronization and checks for the combined changes.

Never force-push or resolve conflicts with blanket `ours` or `theirs`. Never use automatic stashing to hide concurrent changes.
Do not start duplicate development servers. Stop servers you start after verification, unless the user requests they remain running.
Write concise comments and documentation. Do not send messages to other people without explicit user authorization.
