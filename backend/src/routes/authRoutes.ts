import { Router, type Request, type Response } from "express";
import {
  completeGoogleAuthFlow,
  createGoogleAuthFlow,
  getGoogleAuthFlowStatus,
  getSessionUserFromRequest
} from "../services/authService.js";

export const authRouter = Router();

authRouter.post("/google/start", (_req: Request, res: Response) => {
  try {
    const payload = createGoogleAuthFlow();
    res.status(201).json(payload);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

authRouter.get("/google/start", (_req: Request, res: Response) => {
  try {
    const payload = createGoogleAuthFlow();
    res.json(payload);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

authRouter.get("/google/callback", async (req: Request, res: Response) => {
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";

  if (!code || !state) {
    res.status(400).send("Missing code/state");
    return;
  }

  try {
    await completeGoogleAuthFlow(code, state);
    res.type("html").send(`<!doctype html><html><head><title>Mailstorm Auth</title></head><body style="font-family:Segoe UI,Arial,sans-serif;padding:24px;">` +
      `<h2>Mailstorm account connected</h2><p>You can close this tab and return to Gmail.</p></body></html>`);
  } catch (error) {
    res.status(500).type("html").send(`<!doctype html><html><head><title>Mailstorm Auth</title></head><body style="font-family:Segoe UI,Arial,sans-serif;padding:24px;">` +
      `<h2>Mailstorm connection failed</h2><p>${(error as Error).message}</p></body></html>`);
  }
});

authRouter.get("/google/status/:flowId", (req: Request, res: Response) => {
  const payload = getGoogleAuthFlowStatus(req.params.flowId);
  res.json(payload);
});

authRouter.get("/me", (req: Request, res: Response) => {
  try {
    const user = getSessionUserFromRequest(req);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName
      }
    });
  } catch (error) {
    res.status(401).json({ error: (error as Error).message });
  }
});
