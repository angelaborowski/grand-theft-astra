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
  helipad: EntityIdSchema.parse("location-helipad"),
  helicopter: EntityIdSchema.parse("vehicle-helicopter"),
  pistolPickup: EntityIdSchema.parse("pickup-pistol"),
  ammoPickup: EntityIdSchema.parse("pickup-ammo-1"),
  secondAmmoPickup: EntityIdSchema.parse("pickup-ammo-2"),
  practiceTarget: EntityIdSchema.parse("target-practice"),
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
  crouchSpeed: 2.5,
  walkSpeed: 5.6,
  runSpeed: 7,
  driveSpeed: 16,
  helicopterSpeed: 20,
  interactionRange: 7,
  actorRadius: 0.45,
} as const;
/** The shelter journey requires these characters to remain alive. */
export const PROTECTED_CHARACTER_IDS = [
  SCENE_IDS.mila,
  SCENE_IDS.lev,
  SCENE_IDS.niko,
  SCENE_IDS.irina,
  SCENE_IDS.sasha,
  SCENE_IDS.alexei,
] as const;
/** Boxes start at the gameplay floor; their vertical center is half their height. */
export type CollisionBox = Readonly<{
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
}>;
/** Allow small solver penetration without adding any movement distance. */
export const CONTACT_TOLERANCE = 0.01;
/** Angela's GLB uses native meters; its paving surface sits 0.12 meters above the gameplay floor. */
export const RED_SQUARE_SCENE = { asset: "/assets/red-square.glb", offsetY: -0.12 } as const;
/** These limits match the playable area in Angela's original world.mjs. */
export const DISTRICT_BOUNDS = { minX: -42, maxX: 62, minZ: -142, maxZ: 222 } as const;
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
  pistolPickup: { x: 40, z: 78 },
  ammoPickup: { x: 44, z: 78 },
  secondAmmoPickup: { x: 23, z: -88 },
  practiceTarget: { x: 30, z: 72 },
} as const;
/** The guesthouse uses a separate physical room; only explicit door actions cross between spaces. */
export const GUESTHOUSE = {
  entrance: { x: 58, z: 64 },
  spawn: { x: 96, z: 3 },
  host: { x: 96, z: -2 },
  bed: { x: 99, z: -3 },
  bounds: { minX: 90, maxX: 102, minZ: -6, maxZ: 6 },
} as const;
const guesthouseWallThickness = 0.3;
const roomWidth = GUESTHOUSE.bounds.maxX - GUESTHOUSE.bounds.minX;
const roomDepth = GUESTHOUSE.bounds.maxZ - GUESTHOUSE.bounds.minZ;
const roomCenterX = (GUESTHOUSE.bounds.minX + GUESTHOUSE.bounds.maxX) / 2;
const roomCenterZ = (GUESTHOUSE.bounds.minZ + GUESTHOUSE.bounds.maxZ) / 2;
/** Room wall boxes retain the existing wall centers and physical height. */
export const GUESTHOUSE_WALLS = [
  {
    id: "west-wall",
    x: GUESTHOUSE.bounds.minX,
    z: roomCenterZ,
    width: guesthouseWallThickness,
    depth: roomDepth,
    height: 4,
  },
  {
    id: "east-wall",
    x: GUESTHOUSE.bounds.maxX,
    z: roomCenterZ,
    width: guesthouseWallThickness,
    depth: roomDepth,
    height: 4,
  },
  {
    id: "north-wall",
    x: roomCenterX,
    z: GUESTHOUSE.bounds.minZ,
    width: roomWidth,
    depth: guesthouseWallThickness,
    height: 4,
  },
  {
    id: "south-wall",
    x: roomCenterX,
    z: GUESTHOUSE.bounds.maxZ,
    width: roomWidth,
    depth: guesthouseWallThickness,
    height: 4,
  },
] as const satisfies readonly (CollisionBox & { readonly id: string })[];
/** Conservative furniture boxes include furnishRoom's 0.6 horizontal scale and -0.145 vertical offset. */
export const GUESTHOUSE_FURNITURE = [
  { id: "bed", x: 99, z: -3.0345, width: 1.26, depth: 1.599, height: 1.055 },
  { id: "bedside-table", x: 98.01, z: -3.48, width: 0.39, depth: 0.33, height: 1.085 },
  { id: "desk", x: 91.92, z: -3, width: 1.02, depth: 0.48, height: 0.81 },
  { id: "chair", x: 91.92, z: -2.28, width: 0.318, depth: 0.33, height: 1.055 },
] as const satisfies readonly (CollisionBox & { readonly id: string })[];
/** The server, Rapier, and camera consume the same room boxes. */
export const GUESTHOUSE_COLLIDERS = [...GUESTHOUSE_WALLS, ...GUESTHOUSE_FURNITURE] as const;
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
/** Separate lower entrance hall; exterior geometry remains owned by the building task. */
export const MUSEUM = {
  originX: 200,
  spawn: { x: 200, z: -25 },
  exit: { x: 13, z: -140 },
  bounds: { minX: 198.7, maxX: 201.3, minZ: -29, maxZ: 0.4 },
} as const;
/** Floor elevation along the central museum hall, in world metres. */
export function museumFloorHeight(position: Position): number {
  return isInsideMuseum(position) ? Math.min(1.2, Math.max(0, (-position.z - 7) * 0.5)) : 0;
}
/** Shared fixed collision geometry for the browser and authoritative server. */
export const MUSEUM_COLLIDERS = [
  { position: [200, -0.5, -3], halfExtents: [2, 0.5, 4], rotationX: 0 },
  { position: [200, 0.7, -19.7], halfExtents: [2, 0.5, 10.3], rotationX: 0 },
  {
    position: [200, 0.51, -8.2],
    halfExtents: [2, 0.08, Math.hypot(2.4, 1.2) / 2],
    rotationX: Math.atan(0.5),
  },
  { position: [198.1, 4, -15], halfExtents: [0.15, 4, 16], rotationX: 0 },
  { position: [201.9, 4, -15], halfExtents: [0.15, 4, 16], rotationX: 0 },
  { position: [200, 3, -29.6], halfExtents: [2, 3, 0.15], rotationX: 0 },
] as const;
export function isInsideMuseum(position: Position): boolean {
  const b = MUSEUM.bounds;
  return (
    position.x >= b.minX && position.x <= b.maxX && position.z >= b.minZ && position.z <= b.maxZ
  );
}
export function sceneSpace(position: Position): "museum" | "guesthouse" | "square" {
  return isInsideMuseum(position)
    ? "museum"
    : isInsideGuesthouse(position)
      ? "guesthouse"
      : "square";
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
  if (!Number.isFinite(position.x) || !Number.isFinite(position.z)) return false;
  const r = MOVEMENT.actorRadius - CONTACT_TOLERANCE;
  if (isInsideMuseum(position)) return true;
  if (isInsideGuesthouse(position)) {
    const bounds = GUESTHOUSE.bounds;
    return (
      position.x >= bounds.minX + r &&
      position.x <= bounds.maxX - r &&
      position.z >= bounds.minZ + r &&
      position.z <= bounds.maxZ - r &&
      !GUESTHOUSE_COLLIDERS.some((box) => circleOverlapsBox(position, box, r))
    );
  }
  if (
    position.x < DISTRICT_BOUNDS.minX + r ||
    position.x > DISTRICT_BOUNDS.maxX - r ||
    position.z < DISTRICT_BOUNDS.minZ + r ||
    position.z > DISTRICT_BOUNDS.maxZ - r
  )
    return false;
  return !BUILDINGS.some((building) => circleOverlapsBox(position, building, r));
}

function circleOverlapsBox(position: Position, box: CollisionBox, radius: number): boolean {
  const dx = Math.max(Math.abs(position.x - box.x) - box.width / 2, 0);
  const dz = Math.max(Math.abs(position.z - box.z) - box.depth / 2, 0);
  return dx * dx + dz * dz < radius * radius;
}

/** Fictional film-stunt course in the clear central corridor; all coordinates are shared. */
export const STUNT = {
  duration: 150_000,
  reward: 250,
  pickup: { x: 20, z: -93 },
  checkpoints: [
    { x: 20, z: 94, label: "Line up on the avenue" },
    { x: 20, z: 59, label: "Take the first ramp" },
    { x: 20, z: -18, label: "Clear the second ramp" },
    { x: 20, z: -74, label: "Brake at the landing zone" },
  ],
  ramps: [
    { x: 20, z: 68 },
    { x: 20, z: -9 },
  ],
} as const;

/** Stable personal mission vehicle, retained across reconnects. */
export function stuntVehicleId(playerId: string) {
  return EntityIdSchema.parse(`stunt:${playerId.slice(0, 90)}`);
}
