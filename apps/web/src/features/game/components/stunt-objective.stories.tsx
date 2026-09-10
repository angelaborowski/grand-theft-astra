import type { Meta, StoryObj } from "@storybook/react-vite";
import { addPlayer, createInitialWorld } from "@gpta/core/simulation";
import { SCENE_IDS } from "@gpta/core/scene";
import { PlayerSchema } from "@gpta/core/world";
import { StuntObjective } from "./stunt-objective";
const player = PlayerSchema.parse(
  addPlayer(createInitialWorld(1000), SCENE_IDS.player).entities.find(
    (e) => e.id === SCENE_IDS.player,
  ),
);
const meta = {
  title: "Game/Last Flight",
  component: StuntObjective,
  args: { player, time: 1000, select: () => {}, launch: () => {} },
} satisfies Meta<typeof StuntObjective>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Briefing: Story = {};
export const Running: Story = {
  args: {
    player: {
      ...player,
      stunt: { stage: "running", checkpoint: 2, deadline: 25000 },
      behavior: { type: "driving", vehicleId: SCENE_IDS.vehicle },
    },
  },
};
export const Completed: Story = { args: { player: { ...player, stunt: { stage: "completed" } } } };
export const MissedFlight: Story = { args: { player: { ...player, stunt: { stage: "failed" } } } };
