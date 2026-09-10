import { createRootRoute, HeadContent, Link, Outlet, Scripts } from "@tanstack/react-router";
import stylesheet from "../ui/styles.css?url";
import tokens from "../ui/astra-tokens.css?url";
import screens from "../ui/astra-screens.css?url";
import panels from "../ui/astra-panels.css?url";
import game from "../ui/astra-game.css?url";
import pause from "../ui/astra-pause.css?url";
import map from "../ui/astra-map.css?url";
import conversation from "../ui/astra-conversation.css?url";
import { gameLogo, menuArtwork, SITE_URL, siteIcons, socialCard } from "../ui/game-artwork";

const TITLE = "Grand Theft Astra — Moscow";
const DESCRIPTION =
  "Start in Red Square. Explore Moscow, find work, and make your place in a living city.";

/** The shell stays independent of browser-only rendering and physics. */
export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "theme-color", content: "#08090b" },
      { name: "application-name", content: "Grand Theft Astra" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Grand Theft Astra" },
      { property: "og:locale", content: "en_US" },
      { property: "og:url", content: `${SITE_URL}/` },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:image", content: `${SITE_URL}${socialCard.src}` },
      { property: "og:image:width", content: String(socialCard.width) },
      { property: "og:image:height", content: String(socialCard.height) },
      { property: "og:image:alt", content: socialCard.alt },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: `${SITE_URL}${socialCard.src}` },
      { name: "twitter:image:alt", content: socialCard.alt },
    ],
    links: [
      ...[stylesheet, tokens, screens, panels, game, pause, map, conversation].map((href) => ({
        rel: "stylesheet",
        href,
      })),
      { rel: "canonical", href: `${SITE_URL}/` },
      { rel: "icon", href: siteIcons.favicon, sizes: "48x48" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: siteIcons.small },
      { rel: "icon", type: "image/png", sizes: "192x192", href: siteIcons.standard },
      { rel: "apple-touch-icon", sizes: "180x180", href: siteIcons.apple },
      { rel: "manifest", href: siteIcons.manifest },
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
