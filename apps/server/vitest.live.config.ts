import { defineConfig } from "vitest/config";
import { liveConfiguration } from "./tests/live/configuration.ts";

const configuration = liveConfiguration();
if (configuration.status === "disabled")
  console.info(`Live conversation tests skipped: ${configuration.reason}`);

export default defineConfig({
  test: {
    include: ["tests/live/**/*.live.ts"],
    fileParallelism: false,
    maxWorkers: 1,
    testTimeout: 150_000,
    hookTimeout: 120_000,
  },
});
