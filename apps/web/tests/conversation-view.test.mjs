import assert from "node:assert/strict";
import test from "node:test";
import {
  mergeConversationTurns,
  conversationPending,
} from "../src/features/game/models/conversation-view.ts";

const turn = (revision, response, fields = {}) => ({
  id: "b875c8d3-a432-4f22-a337-488351d8c80a",
  actorId: "mila",
  playerId: "player-one",
  requestId: 1,
  message: "Why did you become a courier?",
  createdAt: 100,
  revision,
  response,
  ...fields,
});

test("an older history response cannot erase streamed speech", () => {
  const streamed = turn(4, { status: "streaming", text: "I borrowed a bag." });
  const restored = turn(1, { status: "thinking" });
  assert.deepEqual(mergeConversationTurns([streamed], [restored]), [streamed]);
});

test("a restored terminal reply releases the composer without duplicating the turn", () => {
  const streamed = turn(4, { status: "streaming", text: "I borrowed" });
  const finished = turn(5, { status: "completed", text: "I borrowed a bag." });
  const merged = mergeConversationTurns([streamed], [finished, finished]);
  assert.deepEqual(merged, [finished]);
  assert.equal(conversationPending(merged[0]), false);
});

test("interleaved player replies retain both speakers in creation order", () => {
  const first = turn(3, { status: "completed", text: "I borrowed a bag." });
  const second = turn(
    1,
    { status: "queued" },
    {
      id: "380a2d79-ac9e-460d-b0a7-0b5aeb3c19cb",
      playerId: "player-two",
      createdAt: 200,
    },
  );
  const merged = mergeConversationTurns([second], [first]);
  assert.deepEqual(
    merged.map((entry) => entry.playerId),
    ["player-one", "player-two"],
  );
  assert.equal(conversationPending(merged[1]), true);
});
