import { Router, type Request, type Response } from "express";
import { getMergeById, getMergesByUser, getProviderInfo, getRecipientThread, startMerge } from "../services/mergeService.js";
import type { StartMergePayload } from "../types.js";
import { getSessionUserFromRequest } from "../services/authService.js";

export const mergeRouter = Router();

mergeRouter.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true, provider: getProviderInfo() });
});

mergeRouter.get("/merges", (_req: Request, res: Response) => {
  try {
    const user = getSessionUserFromRequest(_req);
    const merges = getMergesByUser(user.id);
    res.json({ merges });
  } catch (error) {
    res.status(401).json({ error: (error as Error).message });
  }
});

mergeRouter.get("/merges/:id", (req: Request, res: Response) => {
  let userId = "";
  try {
    userId = getSessionUserFromRequest(req).id;
  } catch (error) {
    res.status(401).json({ error: (error as Error).message });
    return;
  }

  const merge = getMergeById(req.params.id, userId);
  if (!merge) {
    res.status(404).json({ error: "Merge not found" });
    return;
  }
  res.json({ merge });
});

mergeRouter.get("/merges/:id/recipients/:recipientId/thread", async (req: Request, res: Response) => {
  let userId = "";
  try {
    userId = getSessionUserFromRequest(req).id;
  } catch (error) {
    res.status(401).json({ error: (error as Error).message });
    return;
  }

  try {
    const payload = await getRecipientThread(req.params.id, req.params.recipientId, userId);
    res.json(payload);
  } catch (error) {
    const message = (error as Error).message;
    if (message.includes("not found") || message.includes("not available")) {
      res.status(404).json({ error: message });
      return;
    }
    res.status(500).json({ error: message });
  }
});

mergeRouter.post("/merges/start", async (req: Request, res: Response) => {
  let userId = "";
  try {
    userId = getSessionUserFromRequest(req).id;
  } catch (error) {
    res.status(401).json({ error: (error as Error).message });
    return;
  }

  const payload = req.body as StartMergePayload;

  if (!payload?.subjectTemplate || !payload?.bodyTemplate || !Array.isArray(payload.rows)) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  try {
    const merge = await startMerge(payload, userId);
    res.status(201).json({ merge });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});
