import { entrypoints } from "uxp";
import { renderPanel, destroyPanel } from "./ui/App";

entrypoints.setup({
  panels: {
    brandSyncPanel: {
      show() {
        renderPanel();
      },
      hide() {
        destroyPanel();
      },
    },
  },
});
