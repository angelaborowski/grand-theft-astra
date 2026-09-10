import type { EntityId } from "@gpta/core/world";
import { World as GameWorld } from "../../src/world";

export { default, Person, AstraDecision, AstraConversation } from "../../src/worker";

/** Keep paid requests limited to the two explicit conversation turns under test. */
export class World extends GameWorld {
  override enqueueDecision(_actorId: EntityId, _trigger: string): "disabled" {
    return "disabled";
  }
}
