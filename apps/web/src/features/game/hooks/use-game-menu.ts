import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { GameMenu, PauseTab } from "../models/menu-state";

/** One menu owns input; intentional pointer release never opens another menu. */
export function useGameMenu(
  enabled: boolean,
  actions: { clearSelection: () => void; closeOverview?: () => boolean },
  recoveryActive = false,
  inputContext = "",
) {
  const [menu, setMenu] = useState<GameMenu>({ view: "closed" });
  const hadPointerLock = useRef(false);
  const pointerContext = useRef(inputContext);
  const releasingForMenu = useRef(false);
  function open(next: GameMenu) {
    releasingForMenu.current = next.view !== "closed";
    setMenu(next);
    if (next.view !== "closed" && document.pointerLockElement) document.exitPointerLock();
  }
  const pointerChanged = useEffectEvent(() => {
    const locked = document.pointerLockElement !== null;
    if (
      hadPointerLock.current &&
      pointerContext.current === inputContext &&
      !locked &&
      !releasingForMenu.current &&
      !recoveryActive &&
      menu.view === "closed"
    )
      open({ view: "pause", tab: "game" });
    hadPointerLock.current = locked;
    if (locked) {
      pointerContext.current = inputContext;
      releasingForMenu.current = false;
    }
  });
  const keydown = useEffectEvent((event: KeyboardEvent) => {
    if (
      event.repeat ||
      event.defaultPrevented ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      recoveryActive
    )
      return;
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable || target.closest("input, textarea, select"))
    )
      return;
    if (menu.view === "interaction") return;
    if (event.key === "Escape") {
      if (menu.view !== "closed") return;
      event.preventDefault();
      if (actions.closeOverview?.()) return;
      open({ view: "pause", tab: "game" });
      return;
    }
    const tab =
      event.code === "KeyM"
        ? "map"
        : event.code === "KeyI"
          ? "inventory"
          : event.code === "Tab" && menu.view === "closed"
            ? "mission"
            : null;
    if (!tab) return;
    event.preventDefault();
    open(menu.view === "pause" && menu.tab === tab ? { view: "closed" } : { view: "pause", tab });
  });
  const middleClick = useEffectEvent((event: MouseEvent) => {
    if (event.button !== 1 || recoveryActive || menu.view === "interaction") return;
    const target = event.target;
    if (!(target instanceof Element) || !target.closest(".astra-world")) return;
    event.preventDefault();
    open(
      menu.view === "pause" && menu.tab === "inventory"
        ? { view: "closed" }
        : { view: "pause", tab: "inventory" },
    );
  });
  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => keydown(event);
    const onMiddle = (event: MouseEvent) => middleClick(event);
    const onLock = () => pointerChanged();
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onMiddle);
    document.addEventListener("pointerlockchange", onLock);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onMiddle);
      document.removeEventListener("pointerlockchange", onLock);
    };
  }, [enabled]);
  return {
    menu,
    actions: {
      close: () => open({ view: "closed" }),
      pause: (tab: PauseTab = "map") => open({ view: "pause", tab }),
      interact: () => open({ view: "interaction" }),
      nearby: () => {
        actions.clearSelection();
      },
    },
  };
}
