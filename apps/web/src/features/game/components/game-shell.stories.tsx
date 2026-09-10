import { addPlayer, createInitialWorld } from "@gpta/core/simulation";
import { EntityIdSchema, PlayerSchema } from "@gpta/core/world";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { PauseTab } from "../models/menu-state";
import { GameHud } from "./game-hud";
import { PauseMenu } from "./pause-menu";
import "../../../ui/astra-game.css";

const playerId = EntityIdSchema.parse("menu-preview-player");
const snapshot = addPlayer(createInitialWorld(Date.UTC(2026, 8, 10, 19, 42)), playerId);
const player = PlayerSchema.parse(snapshot.entities.find((entity) => entity.id === playerId));
const meta = {
  title: "Game/Grand Theft Astra/Game shell",
  parameters: { layout: "fullscreen" },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** The preview uses seeded world data without opening a connection or loading the 3D scene. */
function ShellPreview({ initialTab }: { initialTab?: PauseTab }) {
  const [tab, setTab] = useState<PauseTab | null>(initialTab ?? null);
  return (
    <main className="astra-game astra-game-preview">
      <GameHud
        snapshot={snapshot}
        player={player}
        connection={{ status: "connected" }}
        overview={false}
        actions={{
          pause: () => setTab("map"),
          interact: () => {},
          overview: () => {},
          mission: () => setTab("mission"),
        }}
      />
      {tab !== null && (
        <PauseMenu
          tab={tab}
          snapshot={snapshot}
          player={player}
          connection={{ status: "connected" }}
          pending={false}
          actions={{
            close: () => setTab(null),
            tab: setTab,
            select: () => {},
            overview: () => setTab(null),
            leave: () => setTab(null),
          }}
        />
      )}
    </main>
  );
}

export const FreeRoam: Story = { render: () => <ShellPreview /> };
export const Map: Story = { render: () => <ShellPreview initialTab="map" /> };
export const Mission: Story = { render: () => <ShellPreview initialTab="mission" /> };
export const Inventory: Story = { render: () => <ShellPreview initialTab="inventory" /> };
export const Activity: Story = { render: () => <ShellPreview initialTab="activity" /> };
export const Game: Story = { render: () => <ShellPreview initialTab="game" /> };
