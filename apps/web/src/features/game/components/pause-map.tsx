import { isInsideGuesthouse } from "@gpta/core/scene";
import type { Actor, EntityId, WorldSnapshot } from "@gpta/core/world";
import { usePauseMap } from "../hooks/use-pause-map";
import { mapDestination, mapMarkers } from "../models/map-markers";
import { MapToolbar } from "./map-toolbar";
import { MapViewport } from "./map-viewport";
import "../../../ui/astra-map.css";

type PauseMapProps = {
  snapshot: WorldSnapshot;
  player: Actor;
  destinationId: EntityId | null;
  actions: { track: (id: EntityId | null) => void; overview: () => void };
};

/** Map selection only tracks a destination; it never starts a world interaction. */
export function PauseMap(props: PauseMapProps) {
  return (
    <PauseMapContent
      key={isInsideGuesthouse(props.player.position) ? "inside" : "outside"}
      {...props}
    />
  );
}

function PauseMapContent({ snapshot, player, destinationId, actions }: PauseMapProps) {
  const { surface, view, inside, actions: cameraActions, events } = usePauseMap(player);
  const markers = mapMarkers(snapshot, player, destinationId);
  const destination = mapDestination(snapshot, player, destinationId);
  return (
    <section className="astra-pause-map" aria-label="Map">
      <MapViewport
        ref={surface}
        view={view}
        inside={inside}
        player={player}
        markers={markers}
        actions={{ track: actions.track }}
        events={events}
      />
      <MapToolbar
        destinationId={destinationId}
        destinationName={destination?.name ?? null}
        span={view.span}
        actions={{ ...actions, ...cameraActions }}
      />
      <p className="astra-map-help">
        Drag / arrows: pan · Scroll / + −: zoom · Home: center · Hatched: outside district
      </p>
    </section>
  );
}
