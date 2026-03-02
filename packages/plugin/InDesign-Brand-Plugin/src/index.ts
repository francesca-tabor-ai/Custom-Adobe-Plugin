import { entrypoints } from "uxp";
import { renderPanel, destroyPanel, registerAdapter } from "@brand-sync/plugin-core";
import { InDesignAdapter } from "./adapters/indesign-adapter";

// Register the InDesign adapter so plugin-core can access host APIs
registerAdapter(new InDesignAdapter());

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
