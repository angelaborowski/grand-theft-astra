import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import stylesheet from "../ui/styles.css?url";

/** The shell stays independent of browser-only rendering and physics. */
export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "GPTA — a living city" },
      {
        name: "description",
        content: "Explore a small city simulation. Change the world and inspect its response.",
      },
    ],
    links: [{ rel: "stylesheet", href: stylesheet }],
  }),
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
