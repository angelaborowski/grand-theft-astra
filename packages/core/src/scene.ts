import { EntityIdSchema, type Position } from "./world";

/** Named scene identities remain stable when placeholder assets are replaced. */
export const SCENE_IDS = {
  player: EntityIdSchema.parse("player-demo"),
  witness: EntityIdSchema.parse("person-witness"),
  merchant: EntityIdSchema.parse("person-merchant"),
  dispatcher: EntityIdSchema.parse("person-dispatcher"),
  police: EntityIdSchema.parse("police-1"),
  vehicle: EntityIdSchema.parse("vehicle-1"),
  shop: EntityIdSchema.parse("business-kiosk"),
  headquarters: EntityIdSchema.parse("location-police"),
  square: EntityIdSchema.parse("location-square"),
  mila: EntityIdSchema.parse("person-witness"),
  lev: EntityIdSchema.parse("person-merchant"),
  niko: EntityIdSchema.parse("person-niko"),
  irina: EntityIdSchema.parse("person-irina"),
  sasha: EntityIdSchema.parse("person-sasha"),
  alexei: EntityIdSchema.parse("person-alexei"),
  guesthouse: EntityIdSchema.parse("location-guesthouse"),
  guesthouseBed: EntityIdSchema.parse("location-guesthouse-bed"),
  guesthouseDesk: EntityIdSchema.parse("location-guesthouse-desk"),
} as const;
/** Shared rules prevent client and server movement from diverging. */
export const MOVEMENT = {
  walkSpeed: 7,
  driveSpeed: 16,
  interactionRange: 7,
  actorRadius: 0.45,
} as const;
/** Angela's GLB uses native meters; its paving surface sits 0.12 meters above the gameplay floor. */
export const RED_SQUARE_SCENE = { asset: "/assets/red-square.glb", offsetY: -0.12 } as const;
/** These limits match the playable area in Angela's original world.mjs. */
export const DISTRICT_BOUNDS = { minX: -42, maxX: 62, minZ: -115, maxZ: 222 } as const;
/** Stable scene anchors place new entities beside Angela's buildings and street props. */
export const SCENE_POSITIONS = {
  player: { x: 39, z: 83 },
  mila: { x: 37, z: 100 },
  lev: { x: 20, z: 201 },
  niko: { x: 46, z: 161 },
  sasha: { x: 48, z: 46 },
  alexei: { x: -15, z: 113 },
  dispatcher: { x: -20, z: -70 },
  police: { x: -10, z: -60 },
  vehicle: { x: 43, z: 86 },
  shop: { x: 56, z: 82 },
  square: { x: 25, z: 100 },
} as const;
/** The guesthouse uses a separate physical room; only explicit door actions cross between spaces. */
export const GUESTHOUSE = {
  entrance: { x: 58, z: 64 },
  spawn: { x: 96, z: 3 },
  host: { x: 96, z: -2 },
  bed: { x: 99, z: -3 },
  bounds: { minX: 90, maxX: 102, minZ: -6, maxZ: 6 },
} as const;
/** Position is the canonical fact that determines which space the player occupies. */
export function isInsideGuesthouse(position: Position): boolean {
  const bounds = GUESTHOUSE.bounds;
  return (
    position.x >= bounds.minX &&
    position.x <= bounds.maxX &&
    position.z >= bounds.minZ &&
    position.z <= bounds.maxZ
  );
}
/** Map footprints use Blender x and negative y; conservative boxes also drive client collision shapes. */
export const BUILDINGS = [
  {
    id: "kremlin",
    name: "Kremlin wall",
    x: -55,
    z: 18,
    width: 8,
    depth: 320,
    height: 13,
    color: "#a54632",
  },
  {
    id: "gum",
    name: "GUM",
    x: 115.58,
    z: 17.43,
    width: 98.78,
    depth: 267.1,
    height: 24,
    color: "#cfb58b",
  },
  {
    id: "museum",
    name: "State Historical Museum",
    x: 15.87,
    z: -204.14,
    width: 59.18,
    depth: 121.1,
    height: 40,
    color: "#ae4939",
  },
  {
    id: "cathedral",
    name: "Saint Basil's Cathedral",
    x: 2.24,
    z: 254.05,
    width: 51.82,
    depth: 59.86,
    height: 65,
    color: "#e4bd92",
  },
  {
    id: "mausoleum",
    name: "Lenin's Mausoleum",
    x: -25,
    z: 16,
    width: 34,
    depth: 42,
    height: 12,
    color: "#8c5349",
  },
  {
    id: "monument",
    name: "Lobnoye Mesto",
    x: 36,
    z: 188,
    width: 14.4,
    depth: 14.4,
    height: 3,
    color: "#c2b8a3",
  },
  {
    id: "book-stall",
    name: "Book stall",
    x: 56,
    z: 78,
    width: 6,
    depth: 4.8,
    height: 2.8,
    color: "#516556",
  },
] as const;
/** Seed each persistent person once; only accepted Astra actions choose later destinations. */
export function crowdPosition(index: number): Position {
  const angle = index * 2.399963229728653;
  const position = {
    x: 10 + Math.cos(angle) * (18 + (index % 28)),
    z: 50 + Math.sin(angle) * (75 + (index % 85)),
  };
  return positionIsWalkable(position) ? position : { x: 0, z: position.z };
}
/** Convert the first prototype's positions without changing stored gameplay progress. */
export function migrateDistrictPosition(position: Position): Position {
  if (isInsideGuesthouse(position)) return position;
  const migrated = {
    x: Math.max(
      DISTRICT_BOUNDS.minX + 1,
      Math.min(DISTRICT_BOUNDS.maxX - 1, position.x * 0.75 + 10),
    ),
    z: Math.max(
      DISTRICT_BOUNDS.minZ + 1,
      Math.min(DISTRICT_BOUNDS.maxZ - 1, position.z * 1.8 + 55),
    ),
  };
  // The central corridor remains clear when an old position intersects a new building footprint.
  return positionIsWalkable(migrated) ? migrated : { x: 0, z: migrated.z };
}
/** Both physics setup and server checks use these same footprints. */
export function positionIsWalkable(position: Position): boolean {
  const r = MOVEMENT.actorRadius;
  if (isInsideGuesthouse(position)) {
    const bounds = GUESTHOUSE.bounds;
    return (
      position.x >= bounds.minX + r &&
      position.x <= bounds.maxX - r &&
      position.z >= bounds.minZ + r &&
      position.z <= bounds.maxZ - r
    );
  }
  if (
    position.x < DISTRICT_BOUNDS.minX + r ||
    position.x > DISTRICT_BOUNDS.maxX - r ||
    position.z < DISTRICT_BOUNDS.minZ + r ||
    position.z > DISTRICT_BOUNDS.maxZ - r
  )
    return false;
  return !BUILDINGS.some(
    (building) =>
      Math.abs(position.x - building.x) < building.width / 2 + r &&
      Math.abs(position.z - building.z) < building.depth / 2 + r,
  );
}
