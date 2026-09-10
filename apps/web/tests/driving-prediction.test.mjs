import assert from "node:assert/strict";
import { test } from "node:test";
import { boundedDrivingSpeed } from "../src/features/game/models/driving-prediction.ts";

test("a delayed acknowledgement cannot carry a car beyond the server credit cap", () => {
  for (const delta of [1 / 120, 1 / 60, 1 / 20]) {
    let position = 0;
    for (let frame = 0; frame < Math.ceil(3 / delta); frame++) {
      position += boundedDrivingSpeed(14.72, position, delta) * delta;
    }
    assert.ok(position <= 3.5 + 1e-9);
    assert.ok(position > 3.4);
    assert.equal(boundedDrivingSpeed(14.72, 0, delta), 14.72);
  }
});

test("prediction preserves reverse travel and stops at its bound", () => {
  assert.equal(boundedDrivingSpeed(-5, 0, 1 / 60), -5);
  assert.equal(Math.abs(boundedDrivingSpeed(-5, 8, 1 / 60)), 0);
});
