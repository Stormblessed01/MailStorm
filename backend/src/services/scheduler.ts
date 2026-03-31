import { processDueFollowUps } from "./mergeService.js";

let timer: NodeJS.Timeout | undefined;

export function startScheduler(): void {
  if (timer) {
    return;
  }

  timer = setInterval(() => {
    processDueFollowUps().catch((error) => {
      console.error("[scheduler] failed to process followups", error);
    });
  }, 60_000);
}

export function stopScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = undefined;
  }
}
