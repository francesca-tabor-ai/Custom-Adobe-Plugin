/**
 * Adapter factory — detects the host application and returns the appropriate adapter.
 */

import type { HostAdapter } from "./adapter-interface";
import { InDesignAdapter } from "./indesign-adapter";
import { PhotoshopAdapter } from "./photoshop-adapter";

let cachedAdapter: HostAdapter | null = null;

export function getAdapter(): HostAdapter {
  if (cachedAdapter) return cachedAdapter;

  // UXP exposes the host app info
  try {
    const uxp = require("uxp");
    const hostName = uxp.host?.name;

    if (hostName === "InDesign") {
      cachedAdapter = new InDesignAdapter();
    } else if (hostName === "Photoshop") {
      cachedAdapter = new PhotoshopAdapter();
    } else {
      throw new Error(`Unsupported host application: ${hostName}`);
    }
  } catch {
    // Fallback detection — try importing host modules
    try {
      require("indesign");
      cachedAdapter = new InDesignAdapter();
    } catch {
      try {
        require("photoshop");
        cachedAdapter = new PhotoshopAdapter();
      } catch {
        throw new Error("Unable to detect host application. Run this plugin inside InDesign or Photoshop.");
      }
    }
  }

  return cachedAdapter;
}
