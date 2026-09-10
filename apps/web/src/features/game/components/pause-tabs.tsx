import { useRef, type KeyboardEvent } from "react";
import { PAUSE_TABS, type PauseTab } from "../models/menu-state";

/** Arrow keys follow the same order as the visible menu tabs. */
export function PauseTabs({ tab, select }: { tab: PauseTab; select: (tab: PauseTab) => void }) {
  const list = useRef<HTMLDivElement>(null);
  function keydown(event: KeyboardEvent<HTMLDivElement>) {
    const index = PAUSE_TABS.findIndex((entry) => entry.id === tab);
    let nextIndex: number;
    switch (event.key) {
      case "ArrowRight":
        nextIndex = (index + 1) % PAUSE_TABS.length;
        break;
      case "ArrowLeft":
        nextIndex = (index + PAUSE_TABS.length - 1) % PAUSE_TABS.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = PAUSE_TABS.length - 1;
        break;
      default:
        return;
    }
    const next = PAUSE_TABS[nextIndex];
    if (!next) return;
    event.preventDefault();
    select(next.id);
    list.current?.querySelector<HTMLButtonElement>(`#menu-tab-${next.id}`)?.focus();
  }
  return (
    <div
      className="astra-pause-tabs"
      ref={list}
      role="tablist"
      aria-label="Game menu"
      onKeyDown={keydown}
    >
      {PAUSE_TABS.map((entry) => (
        <button
          key={entry.id}
          id={`menu-tab-${entry.id}`}
          role="tab"
          aria-selected={tab === entry.id}
          aria-controls={`menu-page-${entry.id}`}
          tabIndex={tab === entry.id ? 0 : -1}
          autoFocus={tab === entry.id}
          onClick={() => select(entry.id)}
        >
          {entry.label}
        </button>
      ))}
    </div>
  );
}
