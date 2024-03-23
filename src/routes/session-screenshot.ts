import { Request, Response } from "express";
import fs from "node:fs";
import { z } from "zod";
import { BrowserSession } from "../browser-session.js";
import { Logger } from "../logger.js";
import { getSessionById } from "../sessions.js";

type SessionScreenshotRouteOptions = {
  logger: Logger;
  screenshotCacheDurationInSeconds: number;
  sessions: BrowserSession[];
};

const paramSchema = z
  .object({
    id: z.string(),
  })
  .passthrough();

export function sessionScreenshotRoute({
  logger,
  screenshotCacheDurationInSeconds,
  sessions,
}: SessionScreenshotRouteOptions) {
  return (req: Request, res: Response) => {
    const parsed = paramSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(404);
      res.end();
      return;
    }

    const session = getSessionById(sessions, parsed.data.id);
    if (!session) {
      res.status(404);
      res.end();
      return;
    }

    session.takeScreenshot().then((screenshotFile) => {
      res.setHeader(
        "Cache-Control",
        `public, max-age=${screenshotCacheDurationInSeconds}`,
      );

      fs.createReadStream(screenshotFile).pipe(res);
    });
  };
}
