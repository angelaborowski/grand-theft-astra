import { createRootRoute, HeadContent, Link, Outlet, Scripts } from "@tanstack/react-router";
import stylesheet from "../ui/styles.css?url";
import tokens from "../ui/astra-tokens.css?url";
import screens from "../ui/astra-screens.css?url";
import panels from "../ui/astra-panels.css?url";
import game from "../ui/astra-game.css?url";
import pause from "../ui/astra-pause.css?url";
import map from "../ui/astra-map.css?url";
import conversation from "../ui/astra-conversation.css?url";
import { gameLogo, menuArtwork } from "../ui/game-artwork";

/** The shell stays independent of browser-only rendering and physics. */
export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Grand Theft Astra — Moscow" },
      {
        name: "description",
        content:
          "Start in Red Square. Explore Moscow, find work, and make your place in a living city.",
      },
    ],
    links: [
      ...[stylesheet, tokens, screens, panels, game, pause, map, conversation].map((href) => ({
        rel: "stylesheet",
        href,
      })),
      { rel: "preload", as: "image", href: menuArtwork.src },
      { rel: "preload", as: "image", href: gameLogo },
    ],
  }),
  notFoundComponent: () => (
    <main className="astra-screen astra-not-found">
      <img className="astra-screen-artwork" src={menuArtwork.src} alt="" />
      <div className="astra-loading-failure">
        <h1 className="astra-heading">Page not found</h1>
        <Link to="/" className="astra-button">
          Main menu
        </Link>
      </div>
    </main>
  ),
  component: () => (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  ),
});
