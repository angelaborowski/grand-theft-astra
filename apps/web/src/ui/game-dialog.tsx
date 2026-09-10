import type { ReactNode } from "react";
import { useGameDialog } from "./use-game-dialog";

/** Mount while open. The caller owns the heading, close control, and contents. */
export function GameDialog({
  title,
  children,
  actions,
  className = "",
}: {
  title: string;
  children: ReactNode;
  actions: { close: () => void };
  className?: string;
}) {
  const ref = useGameDialog();
  return (
    <dialog
      ref={ref}
      className={`astra-dialog ${className}`}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        actions.close();
      }}
    >
      {children}
    </dialog>
  );
}
