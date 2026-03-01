import { Router, type Request, type Response } from "express";
import { writeAuditEvents } from "../services/audit-service";
import { authGuard } from "../middleware/auth-guard";

const router = Router();

/** POST /audit/events — receive and persist audit events from the plugin */
router.post("/events", authGuard, async (req: Request, res: Response) => {
  const { events } = req.body;

  if (!Array.isArray(events) || events.length === 0) {
    res.status(400).json({
      error: "bad_request",
      message: "events array is required and must not be empty",
      statusCode: 400,
    });
    return;
  }

  const received = await writeAuditEvents(events);

  res.json({ received });
});

export default router;
