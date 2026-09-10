import { useLayoutEffect, useRef } from "react";

/** Native modal ownership supplies focus trapping and restores the previous focus on close. */
export function useGameDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return ref;
}
