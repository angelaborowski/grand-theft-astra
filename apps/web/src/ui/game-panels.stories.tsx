import type { Meta, StoryObj } from "@storybook/react-vite";
import { ActivityPanel, DialoguePanel, StatusBar } from "./game-panels";

const meta = {
  title: "Game/Activity",
  component: ActivityPanel,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "40rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ActivityPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Consequences: Story = {
  args: {
    events: [
      {
        id: "3",
        time: "09:42:08",
        title: "Police unit assigned",
        detail: "Patrol 01 moves toward the reported vehicle.",
        source: "simulation",
      },
      {
        id: "2",
        time: "09:42:06",
        title: "Witness reports theft",
        detail: "Elena → report_crime → report accepted",
        source: "astra",
      },
      {
        id: "1",
        time: "09:42:03",
        title: "You took a vehicle",
        detail: "Ownership changed. Two people witnessed the incident.",
        source: "player",
      },
    ],
    decisions: [{ id: "1", actor: "Elena", status: "completed", detail: "report_crime" }],
    mode: "Astra connected",
  },
};

export const Pending: Story = {
  args: {
    events: [],
    decisions: [
      { id: "2", actor: "Police dispatch", status: "pending", detail: "Deciding how to respond…" },
    ],
    mode: "Astra connected",
  },
};

export const Failed: Story = {
  args: {
    events: [],
    decisions: [
      {
        id: "3",
        actor: "Elena",
        status: "failed",
        detail: "Provider unavailable. City routines continue.",
      },
    ],
    mode: "Astra unavailable",
  },
};

export const Dialogue: StoryObj<typeof DialoguePanel> = {
  render: () => (
    <DialoguePanel
      messages={[
        { id: "1", speaker: "Elena", text: "I saw you take that car. I am calling the police." },
      ]}
    />
  ),
};

export const Disconnected: StoryObj<typeof StatusBar> = {
  render: () => <StatusBar connection="disconnected" time="09:42" population={1000} active={64} />,
};
