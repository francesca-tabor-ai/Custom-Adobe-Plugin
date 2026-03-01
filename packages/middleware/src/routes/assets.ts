import { Router, type Request, type Response } from "express";
import * as path from "path";
import * as fs from "fs";
import { getBrandDb } from "../db/connection";
import { getAssetById } from "../db/queries";
import { authGuard } from "../middleware/auth-guard";
import { config } from "../config";

const router = Router();

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".ai": "application/postscript",
  ".eps": "application/postscript",
};

/** GET /assets/:assetId/file — stream the binary asset file */
router.get("/:assetId/file", authGuard, async (req: Request, res: Response) => {
  const { assetId } = req.params;

  const db = await getBrandDb();
  const asset = getAssetById(db, assetId);

  if (!asset) {
    res.status(404).json({
      error: "not_found",
      message: `Asset '${assetId}' not found`,
      statusCode: 404,
    });
    return;
  }

  // Try to find the local file in the asset directory
  // The Python attachment_sync downloads files to ASSET_DIR using the asset_id as folder name
  const assetDir = config.assetDir;
  let filePath: string | null = null;

  // Strategy 1: Look for file in ASSET_DIR/<asset_id>/ directory
  const assetFolder = path.join(assetDir, assetId);
  if (fs.existsSync(assetFolder)) {
    const files = fs.readdirSync(assetFolder);
    if (files.length > 0) {
      filePath = path.join(assetFolder, files[0]);
    }
  }

  // Strategy 2: Look for file directly in ASSET_DIR with asset_id prefix
  if (!filePath) {
    const dirFiles = fs.existsSync(assetDir) ? fs.readdirSync(assetDir) : [];
    const match = dirFiles.find((f) => f.startsWith(assetId));
    if (match) {
      filePath = path.join(assetDir, match);
    }
  }

  if (!filePath || !fs.existsSync(filePath)) {
    res.status(404).json({
      error: "file_not_found",
      message: `Asset file for '${assetId}' not found in asset directory`,
      statusCode: 404,
    });
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeType = MIME_TYPES[ext] || "application/octet-stream";
  const stat = fs.statSync(filePath);

  res.setHeader("Content-Type", mimeType);
  res.setHeader("Content-Length", stat.size);
  res.setHeader("Content-Disposition", `inline; filename="${path.basename(filePath)}"`);

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});

export default router;
