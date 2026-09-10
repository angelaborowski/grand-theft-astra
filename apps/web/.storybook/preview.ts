import type { Preview } from "@storybook/react-vite";
import "../src/ui/styles.css";

const preview: Preview = {
  parameters: { layout: "padded", backgrounds: { default: "dark" } },
};

export default preview;
