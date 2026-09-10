import { expect, it } from "vitest";
import OpenAI from "openai";
import type {
  Response as OpenAIResponse,
  ResponseFunctionToolCall,
  ResponseInput,
  ResponseReasoningItem,
  ResponseStreamEvent,
} from "openai/resources/responses/responses";
import {
  parseConversationTool,
  requestConversationActions,
  streamConversationSpeech,
} from "../src/conversation-provider";

const toolCall: ResponseFunctionToolCall = {
  type: "function_call",
  call_id: "call-delivery",
  name: "offer_delivery",
  arguments: "{}",
};

const reasoning: ResponseReasoningItem = {
  type: "reasoning",
  id: "reason-1",
  summary: [],
  encrypted_content: "opaque",
};

const hidden: ResponseStreamEvent = {
  type: "response.function_call_arguments.delta",
  item_id: "hidden",
  output_index: 0,
  sequence_number: 0,
  delta: "private arguments",
};

function responseFixture(output: OpenAIResponse["output"] = []): OpenAIResponse {
  return {
    id: "response-fixture",
    object: "response",
    created_at: 1000,
    status: "completed",
    error: null,
    incomplete_details: null,
    instructions: null,
    metadata: null,
    model: "gpt-6-astra",
    output,
    output_text: "",
    parallel_tool_calls: false,
    temperature: null,
    tool_choice: "auto",
    tools: [],
    top_p: null,
    usage: {
      input_tokens: 40,
      input_tokens_details: { cached_tokens: 12, cache_write_tokens: 0 },
      output_tokens: 10,
      output_tokens_details: { reasoning_tokens: 2 },
      total_tokens: 50,
    },
  };
}

function delta(text: string, sequence = 0): ResponseStreamEvent {
  return {
    type: "response.output_text.delta",
    content_index: 0,
    output_index: 0,
    item_id: "spoken-message",
    delta: text,
    logprobs: [],
    sequence_number: sequence,
  };
}

const completed: ResponseStreamEvent = {
  type: "response.completed",
  sequence_number: 10,
  response: responseFixture(),
};

function streamResponse(events: ResponseStreamEvent[]) {
  const body = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
  return new Response(body, { headers: { "content-type": "text/event-stream" } });
}

function fixture(responses: Response[]) {
  const requests: unknown[] = [];
  const client = new OpenAI({
    apiKey: "provider-fixture",
    maxRetries: 3,
    logLevel: "off",
    fetch: async (_url, options) => {
      requests.push(JSON.parse(String(options?.body)));
      const response = responses.shift();
      if (!response) throw new Error("The provider fixture has no response.");
      return response;
    },
  });
  return { client, requests };
}

function request() {
  const input: ResponseInput = [{ role: "user", content: "Can you help me?" }];
  return { model: "gpt-6-astra", input, deadline: Date.now() + 10_000 };
}

function recorder() {
  const chunks: { offset: number; text: string }[] = [];
  return {
    chunks,
    append: async (offset: number, text: string) => {
      chunks.push({ offset, text });
      return true;
    },
  };
}

it("retains reasoning and call identity for private continuation", async () => {
  const { client, requests } = fixture([Response.json(responseFixture([reasoning, toolCall]))]);
  const result = await requestConversationActions(client, { ...request(), tools: [] });
  expect(result.output).toEqual([reasoning, toolCall]);
  expect(result.usage?.input_tokens).toBe(40);
  expect(requests[0]).toMatchObject({
    store: false,
    parallel_tool_calls: false,
    include: ["reasoning.encrypted_content"],
  });
});

it("streams only speech and uses UTF-16 offsets without enabling tools", async () => {
  const { client, requests } = fixture([
    streamResponse([hidden, delta("👋"), delta(" Hello", 1), completed]),
  ]);
  const recording = recorder();
  const result = await streamConversationSpeech(client, request(), recording.append);
  expect(recording.chunks).toEqual([
    { offset: 0, text: "👋" },
    { offset: 2, text: " Hello" },
  ]);
  expect(result).toMatchObject({ status: "completed", usage: { output_tokens: 10 } });
  expect(requests[0]).toMatchObject({ tools: [], stream: true, store: false });
});

it("stops publishing when the World rejects a speech chunk", async () => {
  const { client } = fixture([streamResponse([delta("First"), delta(" second", 1), completed])]);
  const chunks: string[] = [];
  const result = await streamConversationSpeech(client, request(), async (_offset, text) => {
    chunks.push(text);
    return false;
  });
  expect(result).toEqual({ status: "interrupted" });
  expect(chunks).toEqual(["First"]);
});

it("fails a truncated stream while preserving the accepted prefix", async () => {
  const { client } = fixture([streamResponse([delta("I can")])]);
  const recording = recorder();
  await expect(streamConversationSpeech(client, request(), recording.append)).rejects.toMatchObject(
    { code: "incomplete" },
  );
  expect(recording.chunks).toEqual([{ offset: 0, text: "I can" }]);
});

it("does not retry a provider failure or publish a fallback reply", async () => {
  const { client, requests } = fixture([
    Response.json({ error: { message: "fixture failure" } }, { status: 503 }),
  ]);
  const recording = recorder();
  await expect(streamConversationSpeech(client, request(), recording.append)).rejects.toMatchObject(
    { code: "speech_failed" },
  );
  expect(requests).toHaveLength(1);
  expect(recording.chunks).toEqual([]);
});

it("rejects an expired deadline before calling the provider", async () => {
  const { client, requests } = fixture([]);
  await expect(
    requestConversationActions(client, { ...request(), tools: [], deadline: 0 }),
  ).rejects.toMatchObject({ code: "deadline" });
  expect(requests).toEqual([]);
});

it("rejects malformed arguments and attempts to select another player", () => {
  expect(parseConversationTool(toolCall)).toEqual({ name: "offer_delivery", arguments: {} });
  expect(parseConversationTool({ ...toolCall, arguments: "{" })).toBeNull();
  expect(
    parseConversationTool({ ...toolCall, arguments: '{"playerId":"another-player"}' }),
  ).toBeNull();
  expect(parseConversationTool({ ...toolCall, name: "give_money" })).toBeNull();
});
