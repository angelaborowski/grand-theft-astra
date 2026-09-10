import { isInsideGuesthouse } from "@gpta/core/scene";
import type { EntityId } from "@gpta/core/world";
import { useEffect, useEffectEvent, useState } from "react";
import { isActor } from "@gpta/core/world";
import { SCENE_IDS } from "@gpta/core/scene";
import { conversationSendRejected } from "../../../lib/world-connection";
import { LoadingScreen } from "../../../ui/loading-screen";
import { useGameMenu } from "../hooks/use-game-menu";
import type { useWorld } from "../hooks/use-world";
import { nearbyInteraction } from "../models/world-interaction";
import { GameHud, initialDestination } from "./game-hud";
import { GameInteraction } from "./game-interaction";
import { GameScene } from "./game-scene";
import { PauseMenu } from "./pause-menu";
import { MovementStatus } from "./movement-status";
import { CommandFeedback, GameplayHud } from "./gameplay-hud";
import { useRejectionSound, useSessionAudio } from "../hooks/use-session-audio";

export type ReadyWorld = Extract<ReturnType<typeof useWorld>, { status: "ready" }>;

/** Scene, menus, and interaction use the same accepted snapshot. */
export function GameSession({
  world,
  actions,
}: {
  world: ReadyWorld;
  actions: { leave: () => void };
}) {
  const [selectedId, setSelectedId] = useState<EntityId | null>(null);
  const [overview, setOverview] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [lookTargetId, setLookTargetId] = useState<EntityId | null>(null);
  const [recoveryActive, setRecoveryActive] = useState(false);
  const [tracking, setTracking] = useState<
    { type: "objective" } | { type: "entity"; id: EntityId } | { type: "none" }
  >({ type: "objective" });
  const { menu, actions: menuActions } = useGameMenu(
    sceneReady,
    {
      clearSelection: () => setSelectedId(null),
      closeOverview: () => {
        if (!overview) return false;
        setOverview(false);
        return true;
      },
    },
    recoveryActive,
  );
  const { snapshot, player, connection, action } = world;
  const showOverview = overview && !isInsideGuesthouse(player.position);
  const entity = snapshot.entities.find((candidate) => candidate.id === selectedId);
  const objectiveId = initialDestination(player);
  const destinationId =
    tracking.type === "objective" ? objectiveId : tracking.type === "entity" ? tracking.id : null;
  const connected = connection.status === "connected";
  const audioScreen = sceneReady ? (menu.view === "pause" ? "paused" : "playing") : "loading";
  useSessionAudio({
    snapshot,
    player,
    connected,
    screen: audioScreen,
    conversation: menu.view === "interaction" || world.conversation.status === "pending",
  });
  useRejectionSound(action.error);
  useRejectionSound(world.command.error);
  useRejectionSound(world.conversation.error);
  const leavingBlocked =
    action.status === "pending" ||
    world.command.status === "pending" ||
    world.conversation.status === "pending" ||
    (world.conversation.status === "error" && !conversationSendRejected(world.conversation.error));
  const movementAvailable =
    world.movement.state.status === "ready" || world.movement.state.status === "submitting";
  const closeForRecovery = useEffectEvent(menuActions.close);
  useEffect(() => {
    if (world.movement.state.status === "failed" && menu.view !== "closed") closeForRecovery();
  }, [world.movement.state.status, menu.view]);
  function nearbyTarget(id: EntityId | null) {
    return nearbyInteraction(
      player,
      snapshot.entities.find((candidate) => candidate.id === id),
    );
  }
  function interact(id: EntityId | null) {
    const target = nearbyTarget(id);
    if (
      !target ||
      !movementAvailable ||
      !connected ||
      action.status === "pending" ||
      world.command.status === "pending"
    )
      return;
    if (target.kind === "pickup") {
      world.command.mutate({ type: "pickup", targetId: target.id });
      return;
    }
    if (target.id === SCENE_IDS.guesthouse) {
      action.mutate({
        type: isInsideGuesthouse(player.position) ? "leave_location" : "enter",
        targetId: target.id,
      });
      return;
    }
    if (target.id === SCENE_IDS.helipad) {
      action.mutate({ type: "finish_stunt", targetId: target.id });
      return;
    }
    if (isActor(target) && target.kind !== "player") select(target.id);
  }
  function vehicle(id: EntityId | null) {
    if (!movementAvailable || !connected || world.command.status === "pending") return;
    if (player.behavior.type === "driving") {
      world.command.mutate({ type: "exit_vehicle" });
      return;
    }
    const target = nearbyTarget(id);
    if (target?.kind === "vehicle")
      world.command.mutate({ type: "enter_vehicle", targetId: target.id });
  }
  function select(id: EntityId) {
    setSelectedId(id);
    if (action.status !== "pending") action.reset();
    menuActions.interact();
  }
  function openOverview() {
    setOverview(true);
    menuActions.close();
  }
  return (
    <main className="astra-game">
      <section
        className="astra-world"
        aria-label="Playable Red Square"
        inert={menu.view !== "closed" || !sceneReady || recoveryActive}
      >
        <GameScene
          snapshot={snapshot}
          player={player}
          enabled={connected && movementAvailable}
          inputEnabled={sceneReady && menu.view === "closed" && !recoveryActive}
          overview={showOverview}
          selectedId={entity?.id ?? null}
          actions={{
            move: world.move,
            control: world.control,
            command: world.command.mutateAsync,
            interact,
            vehicle,
            target: setLookTargetId,
            select: interact,
            ready: setSceneReady,
          }}
        />
      </section>
      {sceneReady && (
        <GameHud
          snapshot={snapshot}
          player={player}
          connection={connection}
          overview={showOverview}
          destinationId={destinationId}
          quiet={menu.view !== "closed" || recoveryActive}
          actions={{
            pause: () => menuActions.pause(),
            interact: menuActions.nearby,
            overview: () => setOverview(!showOverview),
            mission: () => menuActions.pause("mission"),
          }}
        />
      )}
      {connected && <MovementStatus {...world.movement} />}
      <GameplayHud
        player={player}
        target={menu.view === "closed" ? nearbyTarget(lookTargetId) : null}
        active={
          sceneReady && connected && menu.view === "closed" && !showOverview && !recoveryActive
        }
        command={world.command}
      />
      <GameInteraction
        active={menu.view === "interaction"}
        world={world}
        actorId={selectedId}
        actions={{ close: menuActions.close, recover: select, recovery: setRecoveryActive }}
      />
      {menu.view === "pause" && (
        <PauseMenu
          notice={<CommandFeedback command={world.command} />}
          tab={menu.tab}
          snapshot={snapshot}
          player={player}
          connection={connection}
          pending={leavingBlocked}
          destinationId={destinationId}
          actions={{
            close: menuActions.close,
            command: world.command.mutateAsync,
            tab: menuActions.pause,
            track: (id) =>
              setTracking(
                id === null
                  ? { type: "none" }
                  : id === objectiveId
                    ? { type: "objective" }
                    : { type: "entity", id },
              ),
            overview: openOverview,
            leave: () => {
              if (!leavingBlocked) actions.leave();
            },
          }}
        />
      )}
      {!sceneReady && (
        <LoadingScreen overlay state={{ status: "pending", message: "Entering Red Square…" }} />
      )}
    </main>
  );
}
