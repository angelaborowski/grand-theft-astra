import type { Meta, StoryObj } from "@storybook/react-vite";
import { ConversationPanel } from "./conversation-panel";

const meta = {
  title: "Game/Conversation",
  component: ConversationPanel,
  decorators: [
    (Story) => (
      <div className="panel conversation-story">
        <Story />
      </div>
    ),
  ],
  args: {
    actorName: "Mila",
    history: { status: "ready", turns: [] },
    composer: { status: "ready", draft: "" },
    actions: { changeDraft: () => {}, send: () => {}, retry: () => {}, reload: () => {} },
  },
} satisfies Meta<typeof ConversationPanel>;
export default meta;
type Story = StoryObj<typeof meta>;

const question = { id: "example", playerName: "You", message: "Why did you become a courier?" };

export const Empty: Story = {};
export const Waiting: Story = {
  args: {
    history: { status: "ready", turns: [{ ...question, response: { status: "queued" } }] },
    composer: { status: "waiting", draft: "" },
  },
};
export const Thinking: Story = {
  args: {
    history: { status: "ready", turns: [{ ...question, response: { status: "thinking" } }] },
    composer: { status: "waiting", draft: "" },
  },
};
export const Streaming: Story = {
  args: {
    history: {
      status: "ready",
      turns: [
        {
          ...question,
          response: {
            status: "streaming",
            text: "It started with one borrowed bag and a late rent payment. Now I",
          },
        },
      ],
    },
    composer: { status: "waiting", draft: "" },
  },
};
export const Completed: Story = {
  args: {
    history: {
      status: "ready",
      turns: [
        {
          ...question,
          response: {
            status: "completed",
            text: "It started with a borrowed bag and late rent. I stayed because I know every shortcut here. What brought you to the square?",
          },
        },
      ],
    },
  },
};
export const Interrupted: Story = {
  args: {
    history: {
      status: "ready",
      turns: [
        {
          ...question,
          response: {
            status: "interrupted",
            text: "It started with a borrowed bag",
            error: "The reply stopped before it finished. Send another message to continue.",
          },
        },
      ],
    },
  },
};
export const Unavailable: Story = {
  args: {
    composer: {
      status: "disabled",
      draft: "",
      reason: "Astra disabled. Conversations are unavailable.",
    },
  },
};
export const Failed: Story = {
  args: {
    history: {
      status: "ready",
      turns: [
        {
          ...question,
          response: {
            status: "failed",
            error: "Mila could not respond. Send another message to try again.",
          },
        },
      ],
    },
  },
};
export const SubmissionUncertain: Story = {
  args: {
    composer: {
      status: "uncertain",
      draft: question.message,
      error: "Connection lost. Retry checks the same message without sending it twice.",
    },
  },
};
export const TwoPlayers: Story = {
  args: {
    history: {
      status: "ready",
      turns: [
        {
          ...question,
          playerName: "Visitor 12",
          response: { status: "completed", text: "I borrowed a bag. The job grew from there." },
        },
        {
          id: "example-two",
          playerName: "You",
          message: "Who lent you the bag?",
          response: { status: "thinking" },
        },
      ],
    },
    composer: { status: "waiting", draft: "" },
  },
};
