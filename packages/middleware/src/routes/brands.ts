import { Router, type Request, type Response } from "express";
import { getBrandDb } from "../db/connection";
import { getBrands } from "../db/queries";
import { buildBrandPayload } from "../services/brand-payload-builder";
import { getCachedPayload, setCachedPayload } from "../services/cache-service";
import { authGuard } from "../middleware/auth-guard";

const router = Router();

/** GET /brands — list all brands */
router.get("/", authGuard, async (_req: Request, res: Response) => {
  const db = await getBrandDb();
  const rows = getBrands(db);

  res.json({
    brands: rows.map((r) => ({ brandId: r.brand_id, name: r.name })),
  });
});

/** GET /brands/:brandId/payload — full normalized brand payload with ETag caching */
router.get("/:brandId/payload", authGuard, async (req: Request, res: Response) => {
  const { brandId } = req.params;
  const ifNoneMatch = req.query.ifNoneMatch as string | undefined;

  // Check in-memory cache first
  let payload = getCachedPayload(brandId);

  if (!payload) {
    const db = await getBrandDb();
    payload = buildBrandPayload(db, brandId);

    if (!payload) {
      res.status(404).json({
        error: "not_found",
        message: `Brand '${brandId}' not found`,
        statusCode: 404,
      });
      return;
    }

    setCachedPayload(brandId, payload);
  }

  // ETag-style cache validation
  if (ifNoneMatch && ifNoneMatch === payload.meta.payloadVersion) {
    res.status(304).end();
    return;
  }

  res.setHeader("X-Payload-Version", payload.meta.payloadVersion);
  res.json(payload);
});

export default router;
