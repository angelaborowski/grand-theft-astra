import type { EntityId, Player, Position, WorldSnapshot } from "@gpta/core/world";
import type { PlayerControl, PlayerControlResult } from "@gpta/core/gameplay-v2";

/** A correction contains only the position that the controller must restore. */
export type MovementResult =
  | { status: "accepted" }
  | { status: "corrected"; position: Position }
  | { status: "superseded" };

/** The operation owns submission and restoration readiness. */
export type MovementState =
  | { status: "ready" }
  | { status: "submitting" }
  | { status: "restoring" }
  | { status: "failed"; message: string };

/** Resolve after acceptance or a completed restoration read. */
export type Move = (position: Position) => Promise<MovementResult>;
/** Null means local work was superseded; it is not a server acknowledgement. */
export type Control = (
  input: Omit<PlayerControl, "sequence">,
) => Promise<PlayerControlResult | null>;

/** Callers derive input availability from this state and their connection. */
export type MovementControl = {
  state: MovementState;
  actions: { move: Move; restore: () => Promise<void> };
};

type Transport = {
  move: (position: Position) => Promise<void>;
  control: (input: PlayerControl) => Promise<PlayerControlResult>;
  snapshot: () => Promise<WorldSnapshot>;
};
type Source = { transport: Transport; playerId: EntityId; context: string };

/** Local restoration failure leaves the controller disabled until recovery. */
export class MovementRestoreError extends Error {
  readonly _tag = "MovementRestoreError";

  constructor(cause?: unknown) {
    super("Your position could not be restored. Retry restoration.", { cause });
    this.name = "MovementRestoreError";
  }
}

/** Own one movement operation and discard work from an obsolete connection or space. */
export class PlayerMovement {
  private readonly events = new EventTarget();
  private readonly applySnapshot: (snapshot: WorldSnapshot) => void;
  private source: Source | null = null;
  private generation = 0;
  private sequence = 0;
  private state: MovementState = { status: "ready" };

  constructor(applySnapshot: (snapshot: WorldSnapshot) => void) {
    this.applySnapshot = applySnapshot;
  }

  /** React observes the same state that gates synchronous submissions. */
  readonly getSnapshot = (): MovementState => this.state;

  /** EventTarget owns change notification without another state store. */
  readonly subscribe = (listener: () => void): (() => void) => {
    this.events.addEventListener("change", listener);
    return () => this.events.removeEventListener("change", listener);
  };

  /** Enable a connection only after its authoritative snapshot is restored. */
  connect(transport: Transport, playerId: EntityId, context: string): void {
    this.generation += 1;
    this.source = { transport, playerId, context };
    this.setState({ status: "ready" });
  }

  /** Invalidate pending work before the connection starts its recovery. */
  disconnect(): void {
    this.generation += 1;
    this.source = null;
    this.setState({ status: "ready" });
  }

  /** Door and vehicle transitions supersede movement from the previous context. */
  observeContext(context: string): void {
    if (!this.source || this.source.context === context) return;
    this.generation += 1;
    this.source = { ...this.source, context };
    this.setState({ status: "ready" });
  }

  /** Reject duplicate submissions locally while the current operation owns completion. */
  readonly move: Move = async (position) => {
    const source = this.source;
    if (!source || this.state.status !== "ready") return { status: "superseded" };
    const generation = this.generation;
    this.setState({ status: "submitting" });
    try {
      await source.transport.move(position);
    } catch {
      if (generation !== this.generation) return { status: "superseded" };
      return this.restorePosition(source, generation);
    }
    if (generation !== this.generation) return { status: "superseded" };
    this.setState({ status: "ready" });
    return { status: "accepted" };
  };

  /** Both controllers share submission, connection, and restoration ownership. */
  readonly control: Control = async (input) => {
    const source = this.source;
    if (!source || this.state.status !== "ready") return null;
    const generation = this.generation;
    this.setState({ status: "submitting" });
    try {
      const result = await source.transport.control({ ...input, sequence: this.sequence++ });
      if (generation !== this.generation) return null;
      this.setState({ status: "ready" });
      return result;
    } catch {
      if (generation !== this.generation) return null;
      await this.restorePosition(source, generation);
      return null;
    }
  };

  /** Retry reads authoritative state; it never resends a movement request. */
  readonly restore = async (): Promise<void> => {
    if (!this.source || this.state.status !== "failed") return;
    await this.restorePosition(this.source, this.generation);
  };

  private async restorePosition(source: Source, generation: number): Promise<MovementResult> {
    this.setState({ status: "restoring" });
    try {
      const snapshot = await source.transport.snapshot();
      if (generation !== this.generation) return { status: "superseded" };
      const player = snapshot.entities.find(
        (entity): entity is Player => entity.kind === "player" && entity.id === source.playerId,
      );
      if (!player) throw new MovementRestoreError();
      this.applySnapshot(snapshot);
      if (generation !== this.generation) return { status: "superseded" };
      this.setState({ status: "ready" });
      return { status: "corrected", position: player.position };
    } catch (cause) {
      if (generation !== this.generation) return { status: "superseded" };
      const error = new MovementRestoreError(cause);
      this.setState({ status: "failed", message: error.message });
      throw error;
    }
  }

  private setState(state: MovementState): void {
    this.state = state;
    this.events.dispatchEvent(new Event("change"));
  }
}
