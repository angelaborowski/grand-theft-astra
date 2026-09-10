import type { Meta, StoryObj } from "@storybook/react-vite";
import { AudioControl } from "./audio-control";

const meta = {
  title: "Game/Audio",
  component: AudioControl,
  args: {
    muted: false,
    locked: false,
    unavailable: false,
    message: "",
    variant: "button",
    actions: { toggle: () => {} },
  },
} satisfies Meta<typeof AudioControl>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playing: Story = {};
export const Muted: Story = { args: { muted: true } };
export const Locked: Story = { args: { locked: true, variant: "menu" } };
export const Unavailable: Story = {
  args: { unavailable: true, message: "One sound could not load. Other sounds remain available." },
};
