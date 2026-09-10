type GameArtwork = {
  readonly src: string;
  readonly title: string;
  readonly position: string;
};

/** Replace artwork here so the title, loading screens, and stories stay aligned. */
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
