import { entrypoints } from "uxp";
import { renderPanel, destroyPanel, registerAdapter } from "@brand-sync/plugin-core";
import { PhotoshopAdapter } from "./adapters/photoshop-adapter";

// Register the Photoshop adapter so plugin-core can access host APIs
registerAdapter(new PhotoshopAdapter());

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
