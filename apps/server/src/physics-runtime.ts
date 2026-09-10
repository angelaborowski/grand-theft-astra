import type { ActionContext, ActionError, ActionResult, PlayerAction } from "@gpta/core/actions";
import {
  applyGameplayCommand,
  completeReloads,
  HELICOPTER,
  PHYSICS,
  PISTOL,
  PUNCH,
  type PlayerCommand,
  type PlayerControl,
  type PlayerControlResult,
} from "@gpta/core/gameplay-v2";
import {
  BUILDINGS,
  DISTRICT_BOUNDS,
  GUESTHOUSE,
  GUESTHOUSE_COLLIDERS,
  isInsideGuesthouse,
  positionIsWalkable,
  type CollisionBox,
} from "@gpta/core/scene";
import {
  isActor,
  type Actor,
  type Entity,
  type EntityId,
  type Player,
  type Position,
  type WorldSnapshot,
} from "@gpta/core/world";
import { RAPIER } from "./physics-engine";

const STEP = 1 / 60;
const INPUT_TIMEOUT = 500;
const OFFSET = 0.01;
const IDENTITY = { x: 0, y: 0, z: 0, w: 1 };
type Space = "district" | "guesthouse";
type Body = {
  collider: RAPIER.Collider;
  controller: RAPIER.KinematicCharacterController;
  space: Space;
  verticalSpeed: number;
  speed: number;
};
type Controls = { owner: string; input: PlayerControl; updatedAt: number };
type ControlAcceptance =
  | { accepted: true; world: WorldSnapshot; result: PlayerControlResult }
  | { accepted: false; error: ActionError };

/** World owns this fixed-step simulation; controls never contain a client pose or elapsed time. */
export class PhysicsRuntime {
  private readonly spaces: Record<Space, RAPIER.World>;
  private readonly bodies = new Map<EntityId, Body>();
  private readonly colliderIds = new Map<RAPIER.Collider, EntityId>();
  private readonly controls = new Map<EntityId, Controls>();
  private readonly active = new Set<EntityId>();
  private updatedAt: number;
  private remainder = 0;

  constructor(world: WorldSnapshot, now: number) {
    this.updatedAt = now;
    this.spaces = {
      district: new RAPIER.World({ x: 0, y: 0, z: 0 }),
      guesthouse: new RAPIER.World({ x: 0, y: 0, z: 0 }),
    };
    for (const physics of Object.values(this.spaces)) {
      physics.timestep = STEP;
      physics.createCollider(new RAPIER.ColliderDesc(new RAPIER.HalfSpace({ x: 0, y: 1, z: 0 })));
    }
    const bounds = DISTRICT_BOUNDS;
    const district = {
      x: (bounds.minX + bounds.maxX) / 2,
      z: (bounds.minZ + bounds.maxZ) / 2,
      width: bounds.maxX - bounds.minX,
      depth: bounds.maxZ - bounds.minZ,
    };
    for (const box of BUILDINGS) this.addBox("district", box);
    for (const x of [bounds.minX - 0.5, bounds.maxX + 0.5])
      this.addBox("district", { ...district, x, width: 1, depth: district.depth + 2, height: 90 });
    for (const z of [bounds.minZ - 0.5, bounds.maxZ + 0.5])
      this.addBox("district", { ...district, z, width: district.width + 2, depth: 1, height: 90 });
    const room = GUESTHOUSE.bounds;
    const interior = {
      x: (room.minX + room.maxX) / 2,
      z: (room.minZ + room.maxZ) / 2,
      width: room.maxX - room.minX,
      depth: room.maxZ - room.minZ,
    };
    this.addBox("guesthouse", { ...interior, height: 0.2 }, 3.5);
    for (const box of GUESTHOUSE_COLLIDERS) this.addBox("guesthouse", box);
    this.synchronize(world);
  }

  /** Accept a socket's latest controls and return the physical state already reached at server time. */
  control(
    world: WorldSnapshot,
    id: EntityId,
    input: PlayerControl,
    owner: string,
    now: number,
  ): ControlAcceptance {
    const player = this.player(world, id);
    if (!player || player.health <= 0) return rejected("This player cannot move.");
    if (this.vehicle(world, player)?.vehicleType === "car")
      return rejected("Use the car controls while driving.");
    const previous = this.controls.get(id);
    if (previous && previous.owner !== owner && now - previous.updatedAt < INPUT_TIMEOUT)
      return rejected("This player is controlled in another window.");
    if (previous?.owner === owner && input.sequence <= previous.input.sequence)
      return rejected("This movement input is obsolete.");
    const next = this.advance(world, now);
    this.controls.set(id, { owner, input, updatedAt: now });
    this.active.add(id);
    const current = this.player(next, id);
    if (!current) return rejected("This player is unavailable.");
    const heading = input.aim ? input.cameraYaw : current.heading;
    const accepted = { ...current, heading };
    const result = {
      ...next,
      revision: next.revision + 1,
      entities: next.entities.map((entity) => (entity.id === id ? accepted : entity)),
    };
    return {
      accepted: true,
      world: result,
      result: { sequence: input.sequence, revision: result.revision, player: accepted },
    };
  }

  /** Existing car movement remains available; on-foot v2 controls exclude client pose submissions. */
  controlsPosition(world: WorldSnapshot, id: EntityId): boolean {
    const player = this.player(world, id);
    const vehicle = player ? this.vehicle(world, player) : undefined;
    return vehicle?.vehicleType === "helicopter" || (this.active.has(id) && !vehicle);
  }

  /** Stop held input from a disconnected socket without changing another socket's lease. */
  disconnect(owner: string): void {
    for (const [id, controls] of this.controls)
      if (controls.owner === owner) this.controls.delete(id);
  }

  /** Door and vehicle transitions invalidate input and clear physical momentum. */
  afterAction(previous: WorldSnapshot, next: WorldSnapshot, id: EntityId): void {
    const before = this.player(previous, id);
    const after = this.player(next, id);
    if (!before || !after) return;
    const beforeVehicle = before.behavior.type === "driving" ? before.behavior.vehicleId : null;
    const afterVehicle = after.behavior.type === "driving" ? after.behavior.vehicleId : null;
    if (before.grounded && !after.grounded && afterVehicle === null) {
      const body = this.bodies.get(id);
      if (body) body.verticalSpeed = PHYSICS.jumpSpeed;
    }
    if (spaceFor(before.position) === spaceFor(after.position) && beforeVehicle === afterVehicle)
      return;
    this.controls.delete(id);
    const body = this.bodies.get(id);
    if (body) {
      body.verticalSpeed = 0;
      body.speed = 0;
    }
    this.synchronize(next);
  }

  /** Catch up only bounded elapsed server time, independently of packet frequency. */
  advance(world: WorldSnapshot, now: number): WorldSnapshot {
    const elapsed = Math.max(0, now - this.updatedAt) / 1000;
    this.updatedAt = Math.max(now, this.updatedAt);
    this.remainder += Math.min(elapsed, 0.25);
    let next = completeReloads(world, now);
    while (this.remainder + 1e-9 >= STEP) {
      this.remainder = Math.max(0, this.remainder - STEP);
      next = this.step(next, now);
    }
    return next;
  }

  /** Resolve physical evidence before core rules apply and World persists an action. */
  command(
    world: WorldSnapshot,
    id: EntityId,
    command: PlayerCommand,
    context: ActionContext,
  ): ActionResult {
    const player = this.player(world, id);
    if (!player || player.health <= 0) return rejected("This player cannot act.");
    this.synchronize(world);
    const body = this.bodies.get(id);
    if (!body) return rejected("This player has no physical body.");
    if (command.type === "jump" || command.type === "crouch")
      return this.characterCommand(world, player, body, command.type);
    if (command.type === "primary") {
      const range = player.equipment.pistol?.equipped ? PISTOL.range : PUNCH.range;
      const hit = this.ray(world, player, command.yaw, command.pitch, range);
      const result = applyGameplayCommand(
        world,
        id,
        { type: "primary", hitTargetId: hit },
        context,
      );
      if (!result.accepted) return result;
      return {
        ...result,
        world: {
          ...result.world,
          entities: result.world.entities.map((entity) =>
            entity.id === id ? { ...entity, heading: command.yaw } : entity,
          ),
        },
      };
    }
    if (command.type === "pickup" || command.type === "enter_vehicle") {
      const target = world.entities.find((entity) => entity.id === command.targetId);
      if (!target || !this.visible(player, target)) return rejected("The target is blocked.");
    }
    if (command.type === "exit_vehicle") {
      const vehicle = this.vehicle(world, player);
      if (!vehicle) return rejected("This player is not driving.");
      const vehicleBody = this.bodies.get(vehicle.id);
      const exitPosition = this.exitPosition(vehicle.position);
      if (!exitPosition) return rejected("There is no clear place to exit.");
      return applyGameplayCommand(
        world,
        id,
        {
          type: "exit_vehicle",
          exitPosition,
          grounded: player.grounded,
          speed: vehicleBody?.speed ?? 0,
        },
        context,
      );
    }
    return applyGameplayCommand(world, id, command, context);
  }

  /** Legacy mission actions keep their rules and gain physical state checks. */
  validateAction(
    world: WorldSnapshot,
    id: EntityId,
    action: PlayerAction,
  ): ActionError | undefined {
    if (action.type === "hit") return rejected("Use the primary attack control.").error;
    if (action.type === "talk" || action.type === "finish_stunt" || action.type === "exit_vehicle")
      return undefined;
    const player = this.player(world, id);
    if (!player || player.behavior.type === "driving" || !player.grounded || player.elevation > 0.2)
      return rejected("Stand on the ground before using this action.").error;
    const target = world.entities.find((entity) => entity.id === action.targetId);
    if (!target) return rejected("This target is unavailable.").error;
    if (action.type === "enter" || action.type === "leave_location") return undefined;
    this.synchronize(world);
    if (!this.visible(player, target)) return rejected("The target is blocked.").error;
    return undefined;
  }

  /** Release WASM resources when an isolated runtime test ends. */
  free(): void {
    for (const physics of Object.values(this.spaces)) physics.free();
  }

  private step(world: WorldSnapshot, now: number): WorldSnapshot {
    this.synchronize(world);
    const changes = new Map<EntityId, Entity>();
    for (const id of this.active) {
      const player = this.player(world, id);
      if (!player || player.health <= 0) continue;
      const controls = this.controls.get(id);
      const input =
        controls && now - controls.updatedAt < INPUT_TIMEOUT ? controls.input : undefined;
      const vehicle = this.vehicle(world, player);
      if (vehicle?.vehicleType === "car") continue;
      if (vehicle?.vehicleType === "helicopter") {
        const moved = this.fly(vehicle, input);
        changes.set(vehicle.id, moved.vehicle);
        changes.set(id, {
          ...player,
          position: moved.vehicle.position,
          elevation: moved.vehicle.elevation,
          heading: moved.vehicle.heading,
          grounded: moved.grounded,
        });
      } else changes.set(id, this.walk(player, input));
    }
    if (changes.size === 0) return world;
    return {
      ...world,
      revision: world.revision + 1,
      entities: world.entities.map((entity) => changes.get(entity.id) ?? entity),
    };
  }

  private walk(player: Player, input: PlayerControl | undefined): Player {
    const body = this.bodies.get(player.id);
    if (!body) return player;
    const speed =
      player.posture === "crouched"
        ? PHYSICS.crouchSpeed
        : input?.run
          ? PHYSICS.runSpeed
          : PHYSICS.walkSpeed;
    const movement = direction(
      input?.cameraYaw ?? player.heading,
      input?.forward ?? 0,
      input?.right ?? 0,
    );
    body.verticalSpeed = Math.max(-30, body.verticalSpeed + PHYSICS.gravity * STEP);
    body.controller.computeColliderMovement(
      body.collider,
      { x: movement.x * speed * STEP, y: body.verticalSpeed * STEP, z: movement.z * speed * STEP },
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
    );
    const delta = body.controller.computedMovement();
    const grounded = body.controller.computedGrounded();
    if (grounded || (body.verticalSpeed > 0 && delta.y < body.verticalSpeed * STEP - 0.001))
      body.verticalSpeed = 0;
    const position = { x: player.position.x + delta.x, z: player.position.z + delta.z };
    const elevation = Math.max(0, player.elevation + delta.y);
    const heading = input?.aim
      ? input.cameraYaw
      : Math.hypot(movement.x, movement.z) > 0
        ? Math.atan2(movement.x, -movement.z)
        : player.heading;
    return { ...player, position, elevation, heading, grounded };
  }

  private fly(vehicle: Extract<Entity, { kind: "vehicle" }>, input: PlayerControl | undefined) {
    const body = this.bodies.get(vehicle.id);
    if (!body) return { vehicle, grounded: vehicle.elevation <= 0.02 };
    const heading = vehicle.heading + (input?.turn ?? 0) * STEP * 1.4;
    const movement = direction(heading, input?.forward ?? 0, input?.right ?? 0);
    const vertical = Math.min(
      HELICOPTER.maxElevation - vehicle.elevation,
      (input?.ascend ?? 0) * HELICOPTER.maxVerticalSpeed * STEP,
    );
    body.controller.computeColliderMovement(
      body.collider,
      {
        x: movement.x * HELICOPTER.maxHorizontalSpeed * STEP,
        y: vertical - (vehicle.elevation < 0.02 && vertical <= 0 ? 0.01 : 0),
        z: movement.z * HELICOPTER.maxHorizontalSpeed * STEP,
      },
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
    );
    const delta = body.controller.computedMovement();
    body.speed = Math.hypot(delta.x, delta.y, delta.z) / STEP;
    const elevation = Math.max(0, Math.min(HELICOPTER.maxElevation, vehicle.elevation + delta.y));
    return {
      vehicle: {
        ...vehicle,
        heading,
        position: { x: vehicle.position.x + delta.x, z: vehicle.position.z + delta.z },
        elevation,
      },
      grounded: body.controller.computedGrounded() || elevation <= 0.02,
    };
  }

  private characterCommand(
    world: WorldSnapshot,
    player: Player,
    body: Body,
    command: "jump" | "crouch",
  ): ActionResult {
    if (player.behavior.type === "driving") return rejected("Exit the vehicle first.");
    this.active.add(player.id);
    if (command === "jump") {
      if (!player.grounded || player.posture === "crouched")
        return rejected("Stand on the ground before jumping.");
      return replacePlayer(world, { ...player, grounded: false });
    }
    const posture = player.posture === "standing" ? "crouched" : "standing";
    if (posture === "standing" && !this.clear(player.position, player.elevation, body.space))
      return rejected("There is not enough room to stand.");
    return replacePlayer(world, { ...player, posture });
  }

  private ray(
    world: WorldSnapshot,
    player: Player,
    yaw: number,
    pitch: number,
    range: number,
  ): EntityId | null {
    const origin = eye(player);
    const direction = {
      x: Math.sin(yaw) * Math.cos(pitch),
      y: Math.sin(pitch),
      z: -Math.cos(yaw) * Math.cos(pitch),
    };
    const hit = this.spaces[spaceFor(player.position)].castRay(
      new RAPIER.Ray(origin, direction),
      range,
      true,
      undefined,
      undefined,
      this.bodies.get(player.id)?.collider,
    );
    const id = hit ? this.colliderIds.get(hit.collider) : undefined;
    const target = world.entities.find((entity) => entity.id === id);
    return target && (isActor(target) || target.kind === "target") ? target.id : null;
  }

  private visible(player: Player, target: Entity): boolean {
    if (spaceFor(player.position) !== spaceFor(target.position)) return false;
    const origin = eye(player);
    const y = target.kind === "vehicle" ? target.elevation + 0.75 : 0.3;
    const delta = {
      x: target.position.x - origin.x,
      y: y - origin.y,
      z: target.position.z - origin.z,
    };
    const length = Math.hypot(delta.x, delta.y, delta.z);
    if (length === 0) return true;
    const ray = new RAPIER.Ray(origin, {
      x: delta.x / length,
      y: delta.y / length,
      z: delta.z / length,
    });
    return (
      this.spaces[spaceFor(player.position)].castRay(
        ray,
        length,
        true,
        RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
        undefined,
        this.bodies.get(target.id)?.collider,
      ) === null
    );
  }

  private exitPosition(position: Position): Position | undefined {
    const offset = HELICOPTER.radius + PHYSICS.actorRadius + 0.25;
    return [
      { x: position.x + offset, z: position.z },
      { x: position.x - offset, z: position.z },
      { x: position.x, z: position.z + offset },
      { x: position.x, z: position.z - offset },
    ].find(
      (candidate) => positionIsWalkable(candidate) && this.clear(candidate, 0, spaceFor(position)),
    );
  }

  private clear(position: Position, elevation: number, space: Space): boolean {
    const shape = new RAPIER.Capsule(PHYSICS.standingHalfHeight, PHYSICS.actorRadius);
    return (
      this.spaces[space].intersectionWithShape(
        { ...position, y: elevation + PHYSICS.actorRadius + PHYSICS.standingHalfHeight + OFFSET },
        IDENTITY,
        shape,
        RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
      ) === null
    );
  }

  private synchronize(world: WorldSnapshot): void {
    const present = new Set(world.entities.map((entity) => entity.id));
    for (const [id, body] of this.bodies) {
      if (present.has(id)) continue;
      this.colliderIds.delete(body.collider);
      this.spaces[body.space].removeCollider(body.collider, false);
      this.spaces[body.space].removeCharacterController(body.controller);
      this.bodies.delete(id);
      this.controls.delete(id);
      this.active.delete(id);
    }
    for (const entity of world.entities) {
      if (!isActor(entity) && entity.kind !== "vehicle" && entity.kind !== "target") continue;
      const space = spaceFor(entity.position);
      let body = this.bodies.get(entity.id);
      if (body && body.space !== space) {
        this.colliderIds.delete(body.collider);
        this.spaces[body.space].removeCollider(body.collider, false);
        this.spaces[body.space].removeCharacterController(body.controller);
        this.bodies.delete(entity.id);
        body = undefined;
      }
      const halfHeight =
        isActor(entity) && entity.posture === "crouched"
          ? PHYSICS.crouchedHalfHeight
          : PHYSICS.standingHalfHeight;
      const shape =
        entity.kind === "vehicle"
          ? new RAPIER.Cylinder(0.75, entity.vehicleType === "helicopter" ? HELICOPTER.radius : 1)
          : entity.kind === "target"
            ? new RAPIER.Cuboid(0.6, 1, 0.25)
            : new RAPIER.Capsule(halfHeight, PHYSICS.actorRadius);
      const y =
        entity.kind === "vehicle"
          ? entity.elevation + 0.75 + OFFSET
          : entity.kind === "target"
            ? 1
            : entity.elevation + halfHeight + PHYSICS.actorRadius + OFFSET;
      if (!body) {
        const collider = this.spaces[space].createCollider(
          new RAPIER.ColliderDesc(shape).setSensor(entity.kind !== "vehicle"),
        );
        const controller = this.spaces[space].createCharacterController(OFFSET);
        controller.setSlideEnabled(true);
        controller.setApplyImpulsesToDynamicBodies(false);
        body = { collider, controller, space, verticalSpeed: 0, speed: 0 };
        this.bodies.set(entity.id, body);
        this.colliderIds.set(collider, entity.id);
      }
      body.collider.setShape(shape);
      body.collider.setTranslation({ x: entity.position.x, y, z: entity.position.z });
    }
    for (const physics of Object.values(this.spaces)) physics.step();
  }

  private addBox(space: Space, box: CollisionBox, y = box.height / 2): void {
    this.spaces[space].createCollider(
      RAPIER.ColliderDesc.cuboid(box.width / 2, box.height / 2, box.depth / 2).setTranslation(
        box.x,
        y,
        box.z,
      ),
    );
  }

  private player(world: WorldSnapshot, id: EntityId): Player | undefined {
    return world.entities.find(
      (entity): entity is Player => entity.id === id && entity.kind === "player",
    );
  }

  private vehicle(world: WorldSnapshot, player: Player) {
    const vehicleId = player.behavior.type === "driving" ? player.behavior.vehicleId : null;
    return world.entities.find(
      (entity): entity is Extract<Entity, { kind: "vehicle" }> =>
        entity.id === vehicleId && entity.kind === "vehicle",
    );
  }
}

function direction(yaw: number, forward: number, right: number) {
  const length = Math.max(1, Math.hypot(forward, right));
  return {
    x: (Math.sin(yaw) * forward + Math.cos(yaw) * right) / length,
    z: (-Math.cos(yaw) * forward + Math.sin(yaw) * right) / length,
  };
}

function eye(player: Actor) {
  const halfHeight =
    player.posture === "crouched" ? PHYSICS.crouchedHalfHeight : PHYSICS.standingHalfHeight;
  return {
    x: player.position.x,
    y: player.elevation + (halfHeight + PHYSICS.actorRadius) * 1.8,
    z: player.position.z,
  };
}

function spaceFor(position: Position): Space {
  return isInsideGuesthouse(position) ? "guesthouse" : "district";
}

function rejected(message: string): { accepted: false; error: ActionError } {
  return { accepted: false, error: { _tag: "ActionRejected", message } };
}

function replacePlayer(world: WorldSnapshot, player: Player): ActionResult {
  return {
    accepted: true,
    world: {
      ...world,
      revision: world.revision + 1,
      entities: world.entities.map((entity) => (entity.id === player.id ? player : entity)),
    },
    eventIds: [],
  };
}
