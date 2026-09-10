import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import OpenAI from "openai";
import type { FunctionTool, ResponseInput } from "openai/resources/responses/responses";
import { zodResponsesFunction } from "openai/helpers/zod";
import {
  conversationToolSchemas,
  type ConversationAction,
  type TurnId,
} from "@gpta/core/conversations";
import {
  ConversationProviderFailure,
  parseConversationTool,
  requestConversationActions,
  streamConversationSpeech,
} from "./conversation-provider";
import type { World } from "./world";

/** A saved turn supplies both participants and the permitted action scope. */
export type ConversationParams = { worldName: string; turnId: TurnId };

const toolDescriptions: Record<ConversationAction["name"], string> = {
  offer_delivery: "Mila offers her existing delivery with its two fixed reward choices.",
  accept_delivery:
    "Mila hands over the parcel after this player explicitly accepts the known delivery offer.",
  complete_delivery:
    "Lev or Niko receives this player's parcel and grants the fixed reward after an explicit handover request.",
  offer_bed: "Irina offers this player a bed at the current price without charging money.",
  rent_bed:
    "Irina rents a bed after this player explicitly accepts the supplied saved offer and price.",
};

const providerStep = {
  retries: { limit: 0, delay: "1 second" },
  timeout: "30 seconds",
} as const;

/** Private tool steps finish before one public stream; World prevents replay of audible speech. */
export class AstraConversation extends WorkflowEntrypoint<Env, ConversationParams> {
  override async run(event: WorkflowEvent<ConversationParams>, step: WorkflowStep) {
    const { worldName, turnId } = event.payload;
    const world = this.env.WORLD.getByName(worldName);
    try {
      const { context, deadline } = await step.do("read conversation context", async () => {
        const context: Awaited<ReturnType<World["conversationContext"]>> =
          await world.conversationContext(turnId);
        return { context, deadline: Date.now() + 120_000 };
      });
      const tools: FunctionTool[] = context.tools.map((name) =>
        zodResponsesFunction({
          name,
          description: toolDescriptions[name],
          parameters: conversationToolSchemas[name],
        }),
      );
      const input: ResponseInput = [{ role: "user", content: JSON.stringify(context) }];
      const client = new OpenAI({
        apiKey: this.env.OPENAI_API_KEY,
        maxRetries: 0,
        timeout: 25_000,
        logLevel: "off",
      });
      const requests = [];
      for (let round = 0; round < 3; round += 1) {
        const response = await step.do(`conversation actions ${round}`, providerStep, () =>
          requestConversationActions(client, {
            model: this.env.OPENAI_MODEL,
            input,
            tools,
            deadline,
          }),
        );
        requests.push({ phase: "actions", durationMs: response.durationMs, usage: response.usage });
        input.push(...response.output);
        const calls = response.output.filter((item) => item.type === "function_call");
        if (calls.length === 0) break;
        for (const call of calls) {
          const result = await step.do(`conversation tool ${round} ${call.call_id}`, async () => {
            const tool = parseConversationTool(call);
            if (!tool)
              return {
                accepted: false as const,
                error: {
                  _tag: "ActionRejected" as const,
                  message: "The tool arguments are invalid.",
                },
              };
            const result: Awaited<ReturnType<World["executeConversationTool"]>> =
              await world.executeConversationTool(turnId, call.call_id, tool);
            return result;
          });
          input.push({
            type: "function_call_output",
            call_id: call.call_id,
            output: JSON.stringify(result),
          });
        }
      }
      const speech = await step.do("public conversation speech", providerStep, async () => {
        if (!(await world.beginConversationSpeech(turnId)))
          return { status: "interrupted" as const };
        return streamConversationSpeech(
          client,
          { model: this.env.OPENAI_MODEL, input, deadline },
          (offset, text) => world.appendConversationSpeech(turnId, offset, text),
        );
      });
      if (speech.status === "interrupted") {
        await step.do("interrupt conversation", () =>
          world.failConversation(turnId, "The conversation was interrupted."),
        );
        return { status: "interrupted", requests };
      }
      requests.push({ phase: "speech", durationMs: speech.durationMs, usage: speech.usage });
      await step.do("complete conversation", () => world.completeConversation(turnId));
      console.info({ event: "conversation_completed", turnId, requests });
      return { status: "completed", requests };
    } catch (cause) {
      console.error({
        event: "conversation_failed",
        turnId,
        reason: cause instanceof ConversationProviderFailure ? cause.code : "workflow_failed",
      });
      await step.do("fail conversation", () =>
        world.failConversation(turnId, "The character's response could not complete. Try again."),
      );
      return { status: "failed" };
    }
  }
}
