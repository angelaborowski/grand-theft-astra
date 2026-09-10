import { PhysicsRuntime } from "../../src/physics-runtime";
import { PlayerCommandSchema, PlayerControlSchema } from "@gpta/core/gameplay-v2";
import { addPlayer, createInitialWorld } from "@gpta/core/simulation";
import { EntityIdSchema, PositionSchema, type WorldSnapshot } from "@gpta/core/world";
import { SCENE_IDS, STUNT } from "@gpta/core/scene";
import { z } from "zod";

const instruction = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("control"),
    at: z.number(),
    input: PlayerControlSchema,
    owner: z.string().default("first"),
  }),
  z.object({ type: z.literal("command"), at: z.number(), command: PlayerCommandSchema }),
  z.object({ type: z.literal("advance"), at: z.number() }),
  z.object({ type: z.literal("disconnect"), at: z.number(), owner: z.string() }),
]);
export const ScenarioSchema = z.object({
  position: PositionSchema.default({ x: 20, z: 100 }),
  elevation: z.number().default(0),
  crouched: z.boolean().default(false),
  helicopter: z.boolean().default(false),
  armed: z.boolean().default(false),
  target: PositionSchema.optional(),
  instructions: z.array(instruction),
});
export type Scenario = z.input<typeof ScenarioSchema>;

export default {
  async fetch(request: Request): Promise<Response> {
    const scenario = ScenarioSchema.parse(await request.json());
    const id = EntityIdSchema.parse("player-physics-test");
    let world: WorldSnapshot = addPlayer(createInitialWorld(0, false), id);
    world = {
      ...world,
      entities: world.entities
        .filter((entity) => entity.id === id || !["person", "police"].includes(entity.kind))
        .map((entity) => {
          if (entity.id === SCENE_IDS.practiceTarget && scenario.target)
            return { ...entity, position: scenario.target };
          if (entity.id === SCENE_IDS.helicopter && entity.kind === "vehicle")
            return { ...entity, elevation: scenario.helicopter ? scenario.elevation : 0 };
          if (entity.id !== id || entity.kind !== "player") return entity;
          return {
            ...entity,
            position: scenario.helicopter ? STUNT.pickup : scenario.position,
            elevation: scenario.elevation,
            grounded: scenario.elevation === 0,
            posture: scenario.crouched ? "crouched" : "standing",
            behavior: scenario.helicopter
              ? { type: "driving", vehicleId: SCENE_IDS.helicopter }
              : { type: "idle" },
            equipment: {
              pistol: scenario.armed ? { equipped: true, loaded: 8, reserve: 16 } : null,
            },
          };
        }),
    };
    const physics = new PhysicsRuntime(world, 0);
    const results: unknown[] = [];
    try {
      for (const instruction of scenario.instructions) {
        if (instruction.type === "control") {
          const result = physics.control(
            world,
            id,
            instruction.input,
            instruction.owner,
            instruction.at,
          );
          if (result.accepted) world = result.world;
          results.push(result.accepted ? { accepted: true, player: result.result.player } : result);
        } else if (instruction.type === "command") {
          world = physics.advance(world, instruction.at);
          const result = physics.command(world, id, instruction.command, {
            id: crypto.randomUUID(),
            now: instruction.at,
          });
          if (result.accepted) {
            physics.afterAction(world, result.world, id);
            world = result.world;
          }
          results.push(result.accepted ? { accepted: true } : result);
        } else if (instruction.type === "disconnect") physics.disconnect(instruction.owner);
        else world = physics.advance(world, instruction.at);
      }
      return Response.json({
        world,
        results,
        player: world.entities.find((entity) => entity.id === id),
      });
    } finally {
      physics.free();
    }
  },
};
