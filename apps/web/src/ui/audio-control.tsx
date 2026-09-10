/** Keep mute available when one file fails, so remaining sounds remain controllable. */
export function AudioControl({
  muted,
  locked,
  unavailable,
  message,
  variant,
  actions,
}: {
  muted: boolean;
  locked: boolean;
  unavailable: boolean;
  message: string;
  variant: "menu" | "button";
  actions: { toggle: () => void };
}) {
  return (
    <div>
      <button
        className={variant === "menu" ? "astra-menu-action" : "astra-button"}
        data-sound-control
        aria-pressed={!muted && !locked}
        onClick={actions.toggle}
      >
        {muted || locked ? "Enable sound" : "Mute sound"}
      </button>
      {unavailable && <p role="status">{message}</p>}
    </div>
  );
}
