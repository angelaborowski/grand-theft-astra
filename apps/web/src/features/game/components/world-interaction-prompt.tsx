import { isActor, type Entity } from "@gpta/core/world";
import { Html } from "@react-three/drei";

/** The single visible person owns this prompt; clicking uses the same action as E. */
export function WorldInteractionPrompt({
  target,
  interact,
}: {
  target: Entity | null;
  interact: () => void;
}) {
  if (!target || !isActor(target) || target.kind === "player") return null;
  return (
    <Html
      position={[target.position.x, target.elevation + 2.1, target.position.z]}
      center
      occlude
      zIndexRange={[8, 0]}
    >
      <button className="astra-world-prompt" onClick={interact}>
        <span>
          <kbd>E</kbd> Talk
        </span>
        <small>{target.name}</small>
      </button>
    </Html>
  );
}
