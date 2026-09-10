import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";

/** Only the dedicated test file can authorize paid provider requests. */
export function liveConfiguration() {
  const path = new URL("../../.env.test", import.meta.url);
  if (!existsSync(path))
    return { status: "disabled" as const, reason: "apps/server/.env.test does not exist." };
  const values = parseEnv(readFileSync(path, "utf8"));
  const key = values.OPENAI_API_KEY?.trim();
  if (!key)
    return { status: "disabled" as const, reason: "apps/server/.env.test has no OPENAI_API_KEY." };
  return {
    status: "enabled" as const,
    key,
    model: values.OPENAI_MODEL?.trim() || "gpt-6-astra",
  };
}
