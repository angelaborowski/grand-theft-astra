import { expect, it } from "vitest";
import { createTestHarness } from "wrangler";
import { PHYSICS, HELICOPTER, type PlayerControl } from "@gpta/core/gameplay-v2";
import { SCENE_IDS, GUESTHOUSE } from "@gpta/core/scene";
import { PlayerSchema, WorldSnapshotSchema } from "@gpta/core/world";
import { z } from "zod";
import type { Scenario } from "./fixtures/physics-worker";

const responseSchema = z.object({
  world: WorldSnapshotSchema,
  player: PlayerSchema,
  results: z.array(z.object({ accepted: z.boolean() })),
});
const idle: PlayerControl = {
  sequence: 0,
  forward: 0,
  right: 0,
  cameraYaw: 0,
  cameraPitch: 0,
  run: false,
  aim: false,
  ascend: 0,
  turn: 0,
};
function controls(
  input: Partial<PlayerControl>,
  duration = 1000,
  interval = 50,
): Scenario["instructions"] {
  return Array.from({ length: duration / interval + 1 }, (_, sequence) => ({
    type: "control",
    at: sequence * interval,
    input: { ...idle, ...input, sequence },
  }));
}
const test = it.extend<{
  simulate: (scenario: Scenario) => Promise<z.infer<typeof responseSchema>>;
}>({
  simulate: async ({ onTestFailed }, use) => {
    const server = createTestHarness({
      workers: [
        {
          config: {
            name: "physics-test",
            main: "./tests/fixtures/physics-worker.ts",
            compatibility_date: "2026-09-10",
          },
        },
      ],
    });
    onTestFailed(() => server.debug());
    try {
      await server.listen();
      await use(async (scenario) =>
        responseSchema.parse(
          await (
            await server.getWorker().fetch("/", { method: "POST", body: JSON.stringify(scenario) })
          ).json(),
        ),
      );
    } finally {
      await server.close();
    }
  },
});

test("moves by server time at the shared walk, run, and crouch speeds", async ({ simulate }) => {
  const walk = await simulate({ instructions: controls({ forward: 1 }) });
  const run = await simulate({ instructions: controls({ forward: 1, run: true }) });
  const crouch = await simulate({
    crouched: true,
    instructions: controls({ forward: 1, run: true }),
  });
  expect(100 - walk.player.position.z).toBeCloseTo(PHYSICS.walkSpeed, 1);
  expect(100 - run.player.position.z).toBeCloseTo(PHYSICS.runSpeed, 1);
  expect(100 - crouch.player.position.z).toBeCloseTo(PHYSICS.crouchSpeed, 1);
});

test("normalizes diagonal controls and does not grant extra distance for more packets", async ({
  simulate,
}) => {
  const sparse = await simulate({ instructions: controls({ forward: 1, right: 1 }, 1000, 100) });
  const dense = await simulate({ instructions: controls({ forward: 1, right: 1 }, 1000, 10) });
  expect(Math.hypot(sparse.player.position.x - 20, sparse.player.position.z - 100)).toBeCloseTo(
    PHYSICS.walkSpeed,
    1,
  );
  expect(dense.player.position.z).toBeCloseTo(sparse.player.position.z, 1);
});

test("blocks a wall while preserving movement along it", async ({ simulate }) => {
  const result = await simulate({
    position: { x: 51, z: 78 },
    instructions: controls({ right: 1 }),
  });
  expect(result.player.position.x).toBeLessThan(52.56);
  expect(result.player.position.x).toBeGreaterThan(52.4);
});

test("jumps, rejects a second jump, and lands", async ({ simulate }) => {
  const result = await simulate({
    instructions: [
      { type: "command", at: 0, command: { type: "jump" } },
      { type: "command", at: 100, command: { type: "jump" } },
      ...controls({}, 1500).map((row) => ({ ...row, at: row.at + 100 })),
    ],
  });
  expect(result.results[0]?.accepted).toBe(true);
  expect(result.results[1]?.accepted).toBe(false);
  expect(result.player.elevation).toBeCloseTo(0, 1);
  expect(result.player.grounded).toBe(true);
});

test("prevents standing through the interior ceiling", async ({ simulate }) => {
  const result = await simulate({
    position: GUESTHOUSE.spawn,
    elevation: 1.7,
    crouched: true,
    instructions: [{ type: "command", at: 0, command: { type: "crouch" } }],
  });
  expect(result.results[0]?.accepted).toBe(false);
  expect(result.player.posture).toBe("crouched");
});

test("rays hit a visible target and stop at a wall", async ({ simulate }) => {
  const shot = [
    {
      type: "command" as const,
      at: 0,
      command: { type: "primary" as const, yaw: Math.PI / 2, pitch: 0 },
    },
  ];
  const clear = await simulate({
    position: { x: 40, z: 78 },
    armed: true,
    target: { x: 45, z: 78 },
    instructions: shot,
  });
  const blocked = await simulate({
    position: { x: 51, z: 78 },
    armed: true,
    target: { x: 61, z: 78 },
    instructions: shot,
  });
  expect(
    clear.world.entities.find((entity) => entity.id === SCENE_IDS.practiceTarget),
  ).toMatchObject({ health: 75 });
  expect(
    blocked.world.entities.find((entity) => entity.id === SCENE_IDS.practiceTarget),
  ).toMatchObject({ health: 100 });
});

test("bounds helicopter height and hovers after input expires", async ({ simulate }) => {
  const result = await simulate({
    helicopter: true,
    elevation: HELICOPTER.maxElevation - 1,
    instructions: [...controls({ ascend: 1 }), { type: "advance", at: 2000 }],
  });
  expect(result.player.elevation).toBeCloseTo(HELICOPTER.maxElevation, 1);
  const hover = await simulate({
    helicopter: true,
    elevation: 10,
    instructions: [
      { type: "control", at: 0, input: { ...idle, forward: 1 } },
      { type: "advance", at: 1000 },
    ],
  });
  expect(hover.player.position).toEqual({ x: 20, z: -93 });
  expect(hover.player.elevation).toBe(10);
});

test("rejects a duplicate socket lease and permits control after disconnect", async ({
  simulate,
}) => {
  const result = await simulate({
    instructions: [
      { type: "control", at: 0, input: idle },
      { type: "control", at: 50, input: idle, owner: "second" },
      { type: "disconnect", at: 50, owner: "first" },
      { type: "control", at: 50, input: idle, owner: "second" },
    ],
  });
  expect(result.results.map((result) => result.accepted)).toEqual([true, false, true]);
});
