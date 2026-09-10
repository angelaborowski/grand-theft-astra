import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { GameBrand } from "./game-brand";
import { GameControls } from "./game-controls";
import { GameDialog } from "./game-dialog";
import { LoadingScreen } from "./loading-screen";
import { TitleScreen } from "./title-screen";

const meta = {
  title: "Grand Theft Astra/Screens",
  component: TitleScreen,
  parameters: { layout: "fullscreen" },
  args: { actions: { start: () => {} } },
} satisfies Meta<typeof TitleScreen>;
export default meta;
type Story = StoryObj<typeof meta>;

export const MainMenu: Story = {};

export const Loading: Story = {
  render: () => <LoadingScreen state={{ status: "pending", message: "Entering Red Square" }} />,
};

export const Failed: Story = {
  render: () => (
    <LoadingScreen
      state={{
        status: "failed",
        message: "The city could not connect. Check your connection and try again.",
        actions: { retry: () => {}, label: "Reconnect" },
      }}
    />
  ),
};

export const Controls: Story = { render: () => <ControlsExample /> };

export const BrandAndTokens: Story = {
  render: () => (
    <section className="astra-design-reference">
      <GameBrand size="loading" />
      <div>
        <p className="astra-kicker">Interface library</p>
        <h1 className="astra-heading">Grand Theft Astra</h1>
        <p>White menu rows. Black panels. Brick red accents.</p>
        <div className="astra-token-list">
          <span className="astra-token-sample astra-token-paper">Paper</span>
          <span className="astra-token-sample astra-token-ink">Ink</span>
          <span className="astra-token-sample astra-token-red">Brick red</span>
          <span className="astra-token-sample astra-token-gold">Moscow gold</span>
        </div>
        <GameControls />
      </div>
    </section>
  ),
};

function ControlsExample() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <TitleScreen actions={{ start: () => setOpen(true) }} />
      {open ? (
        <GameDialog title="Controls" actions={{ close: () => setOpen(false) }}>
          <header className="astra-dialog-header">
            <h1 className="astra-heading">Controls</h1>
            <button className="astra-button" onClick={() => setOpen(false)}>
              Close <kbd>Esc</kbd>
            </button>
          </header>
          <GameControls />
        </GameDialog>
      ) : null}
    </>
  );
}
