import type { ReactNode } from "react";

/** Use the same visible key prompt in menus, loading screens, and the game. */
export function ControlHint({ keys, children }: { keys: string; children: ReactNode }) {
  return (
    <span className="astra-control-hint">
      <kbd>{keys}</kbd>
      <span>{children}</span>
    </span>
  );
}

/** Each context documents the controls supplied by the physics and menu owners. */
export type ControlContext = "on-foot" | "helicopter" | "menus";

const controls: Record<ControlContext, { label: string; keys: string }[]> = {
  "on-foot": [
    { label: "Move", keys: "W A S D" },
    { label: "Look", keys: "Mouse" },
    { label: "Run", keys: "Shift" },
    { label: "Jump", keys: "Space" },
    { label: "Crouch", keys: "Ctrl" },
    { label: "Interact", keys: "E" },
    { label: "Enter vehicle", keys: "F" },
    { label: "Fire / punch", keys: "Left mouse" },
    { label: "Aim", keys: "Right mouse" },
    { label: "Reload", keys: "R" },
  ],
  helicopter: [
    { label: "Move", keys: "W A S D" },
    { label: "Look", keys: "Mouse" },
    { label: "Ascend", keys: "Space" },
    { label: "Descend", keys: "Shift" },
    { label: "Turn left / right", keys: "Q / E" },
    { label: "Exit when landed", keys: "F" },
  ],
  menus: [
    { label: "Inventory", keys: "I / Middle mouse" },
    { label: "Map", keys: "M" },
    { label: "Quests", keys: "Tab" },
    { label: "Close / menu", keys: "Esc" },
    { label: "Next control", keys: "Tab" },
    { label: "Previous control", keys: "Shift + Tab" },
    { label: "Change tab", keys: "← / →" },
    { label: "Select", keys: "Enter" },
  ],
};

/** Shared controls use the same labels in Settings and the title screen. */
export function GameControls({ context = "on-foot" }: { context?: ControlContext }) {
  return (
    <div className="astra-controls">
      <dl className="astra-control-list">
        {controls[context].map((control) => (
          <div key={control.label}>
            <dt>{control.label}</dt>
            <dd>
              <kbd>{control.keys}</kbd>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
