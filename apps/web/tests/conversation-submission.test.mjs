import assert from "node:assert/strict";
import test from "node:test";
import {
  changeConversationDraft,
  clearAcceptedDraft,
  conversationComposer,
  latestPlayerTurn,
  retryConversationAttempt,
} from "../src/features/game/models/conversation-submission.ts";

const attempt = { actorId: "mila", message: "Where is Lev?", idempotencyKey: "same-attempt" };
const uncertain = { status: "uncertain", attempt, actorName: "Mila", error: "Connection lost." };
const context = {
  actorId: "mila",
  text: attempt.message,
  connected: true,
  movementReady: true,
  available: true,
  inRange: true,
  pending: false,
  submission: { status: "idle" },
};

test("closing one conversation cannot replace another person's draft", () => {
  const mila = changeConversationDraft(new Map(), "mila", attempt.message);
  const irina = changeConversationDraft(mila, "irina", "How much is a bed?");
  assert.equal(irina.get("mila"), attempt.message);
  assert.equal(irina.get("irina"), "How much is a bed?");
  assert.equal(changeConversationDraft(irina, "mila", "a".repeat(2001)).get("mila").length, 2000);
});

test("an acknowledgement clears only its unchanged draft", () => {
  const drafts = new Map([
    ["mila", attempt.message],
    ["irina", "How much is a bed?"],
  ]);
  assert.deepEqual([...clearAcceptedDraft(drafts, attempt)], [["irina", "How much is a bed?"]]);
  const edited = changeConversationDraft(drafts, "mila", "A later message");
  assert.equal(clearAcceptedDraft(edited, attempt), edited);
});

test("uncertain recovery reuses the original actor, message, and retry identity", () => {
  assert.equal(retryConversationAttempt(uncertain, true), attempt);
  assert.equal(retryConversationAttempt(uncertain, false), null);
  assert.equal(retryConversationAttempt({ ...uncertain, status: "rejected" }, true), null);
});

test("leaving range or losing the provider does not hide uncertain recovery", () => {
  const composer = conversationComposer({
    ...context,
    inRange: false,
    movementReady: false,
    available: false,
    submission: uncertain,
  });
  assert.equal(composer.status, "uncertain");
  assert.equal(composer.draft, attempt.message);
  const other = conversationComposer({
    ...context,
    actorId: "irina",
    text: "My draft",
    submission: uncertain,
  });
  assert.equal(other.status, "disabled");
  assert.equal(other.draft, "My draft");
});

test("nearby players cannot replace the local player's saved subtitles", () => {
  const own = {
    playerId: "you",
    response: { status: "interrupted", text: "Take the parcel", error: "Reply stopped." },
  };
  const nearby = {
    playerId: "another",
    response: { status: "completed", text: "A different reply" },
  };
  assert.equal(latestPlayerTurn([own, nearby], "you"), own);
  assert.equal(latestPlayerTurn([nearby], "you"), null);
});
