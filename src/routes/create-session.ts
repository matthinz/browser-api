import { z } from "zod";
import { BrowserSession } from "../browser-session.js";
import { Browser } from "../browser/types.js";
import { HttpStatusError, createJsonRoute } from "./utils.js";
import { Logger } from "../logger.js";

const BodySchema = z
  .object({
    allowedHosts: z.array(z.string()).optional(),
  })
  .optional();

type CreateSessionRouteOptions = {
  browser: Browser;
  logger: Logger;
  maxSessions: number;
  sessions: BrowserSession[];
  sessionHistoryLimit: number;
  workingDir: string;
};

export const createSessionRoute = ({
  browser,
  logger,
  maxSessions,
  sessions,
  sessionHistoryLimit,
  workingDir,
}: CreateSessionRouteOptions) =>
  createJsonRoute({
    paramsSchema: z.any().optional(),
    bodySchema: BodySchema,
    logger,
    async handler(_params, body) {
      if (sessions.length >= maxSessions) {
        throw new HttpStatusError(
          400,
          "too_many_sessions",
          "Too many sessions active.",
        );
      }

      logger.debug("createSession: %o", body);

      const session = new BrowserSession({
        ...(body ?? {}),
        browser,
        historyLimit: sessionHistoryLimit,
        workingDir,
      });

      sessions.push(session);

      return {
        id: session.id,
        allowedHosts: body?.allowedHosts ?? ["*"],
      };
    },
  });
