# Grand Theft Astra interface

Reuse these components and tokens for new game screens. Verify changes in the running game with `pnpm dev`.

| Owner | Use |
| --- | --- |
| `astra-tokens.css` | Colors, typography, spacing, focus, and map colors |
| `game-artwork.ts` | Title image, three loading images, and logo paths |
| `GameBrand` | Shared logo and Moscow label |
| `GameDialog` | Modal focus, Escape, and focus restoration |
| `ControlHint`, `GameControls` | Key prompts and controls |

`TitleScreen` owns the title actions. `LoadingScreen` displays actual pending or failed states.
`astra-screens.css`, `astra-game.css`, and `astra-panels.css` style screens, game menus, and interaction panels.
The root route loads these styles after the original base stylesheet.

Use one UI font, sizes 12, 16, and 24 px, and weights 400 and 700.
The illustrated logo is the only separate lettering style. Use the shared tokens; do not add another font or size.
Use white for selected actions, black for panels, and brick red for accents. Keep keyboard focus visible.

Every control must perform an implemented action. Keep labels short. Put help beside the control that needs it.
Use a specific failure message and an available recovery action. Do not show internal state in normal play.
Keep movement and camera input disabled while a modal menu owns input.

## Replace artwork

1. Keep the source PNG in `source/interface/` and its prompt in `source/interface/prompts.md`.
2. Export a WebP to `public/assets/interface/`.
3. Update the matching path and crop position in `game-artwork.ts`.
4. Check the title and all three loading images in the game.

The three loading images crossfade every eight seconds. They never delay game entry.
Reduced motion keeps the first image still. Preserve the artwork count when replacing images.

## Debug information

Normal play hides Debug, entity state, actor memory, model names, and map coordinates.
Start with `VITE_GAME_DEBUG=true pnpm dev` to enable them.
For a debug build, set that flag before the build command. The flag changes presentation, not server authorization.
Vite reads this flag at startup. Restart the server after changing it.

Conversation, physics, and music keep their existing owners. Reuse their states and actions instead of duplicating their logic.
