import type { Preview } from "@storybook/react-vite";
import "../src/ui/styles.css";
import "../src/ui/astra-tokens.css";
import "../src/ui/astra-screens.css";
import "../src/ui/astra-panels.css";
import "../src/ui/astra-game.css";

const preview: Preview = {
  parameters: { layout: "padded", backgrounds: { default: "dark" } },
};

export default preview;
