# NPC conversations

Players type free text. Astra streams spoken replies from each NPC's story, saved encounters, and current game facts.
The first version uses the OpenAI Responses API. Audio and Realtime remain outside this change.

## Ownership

- Person Durable Objects store stable character profiles and encounters.
- World stores turns, speech, listeners, and action receipts.
- AstraConversation Workflows request permitted actions before streaming public speech.
- The game validates proximity, mission state, rewards, and rental payments.
- The browser renders saved turn updates through the existing JSON-RPC WebSocket.

The named cast uses the character bible. Other NPCs receive stable profiles based on their identity and role.
Astra can offer or accept a delivery, complete a delivery, offer a bed, and rent a bed where permitted.
Renting requires a completed price offer before the player's acceptance message.

## Persistence and failure

Each submission has an idempotency key. Repeated submissions return the same saved turn.
Each NPC answers one turn at a time. Later queued messages do not enter an earlier turn's context.
Replies save before publication. Reconnect restores the saved reply and its status.
Person memory saves before the reply completes. Failed replies retain their saved text and show an error.

Nearby players can hear a conversation. Bystanders lose history access if they leave before the reply finishes.
Private NPC reasoning never enters player history. Missing credentials disable chat without a scripted reply.
One decision slot remains available for conversations. Provider requests have bounded rounds and deadlines.
Interrupted provider requests can still incur charges.

## Tests

Run `pnpm test` for core, server, and browser tests in parallel. Legacy tests are excluded.
The basic tests cover role permissions, transactions, provider streaming, failures, saved turns, and restored browser state.

Run paid tests explicitly with `pnpm --filter @gpta/server test:live`.
Create the ignored `apps/server/.env.test` with `OPENAI_API_KEY` and an optional `OPENAI_MODEL`.
The live suite skips when this file has no key. Normal tests never load this key.
The live suite checks a real streamed reply and a remembered follow-up after reconnecting.

Storybook: `http://localhost:6006/?path=/story/game-conversation--streaming`.
Use `pnpm dev` to open the game at `http://localhost:3000`.
