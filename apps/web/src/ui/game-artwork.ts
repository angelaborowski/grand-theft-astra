type GameArtwork = {
  readonly src: string;
  readonly title: string;
  readonly position: string;
};

/** The title and loading screens share these asset definitions. */
export const menuArtwork: GameArtwork = {
  src: "/assets/interface/menu-arrival.webp",
  title: "Red Square arrival",
  position: "66% center",
};

export const loadingArtworks: readonly [GameArtwork, GameArtwork, GameArtwork] = [
  {
    src: "/assets/interface/loading-gum.webp",
    title: "GUM after midnight",
    position: "68% center",
  },
  {
    src: "/assets/interface/loading-winter.webp",
    title: "Red Square in winter",
    position: "58% center",
  },
  {
    src: "/assets/interface/loading-metro.webp",
    title: "Beneath Moscow",
    position: "62% center",
  },
];

export const gameLogo = "/assets/interface/grand-theft-astra.webp";

/** The public site address; link previews need absolute image URLs. */
export const SITE_URL = "https://grandtheftastra.com";

/** Link preview card composed from the title artwork and logo. */
export const socialCard = {
  src: "/assets/interface/social-card.jpg",
  width: 1200,
  height: 630,
  alt: "Grand Theft Astra logo over Red Square at dusk",
} as const;

/** Square icons derived from the logo for browser tabs and home screens. */
export const siteIcons = {
  favicon: "/favicon.ico",
  small: "/assets/interface/icons/favicon-32.png",
  standard: "/assets/interface/icons/icon-192.png",
  apple: "/assets/interface/icons/apple-touch-icon.png",
  manifest: "/site.webmanifest",
} as const;
