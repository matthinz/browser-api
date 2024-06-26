import { z } from "zod";
import { BrowserSession } from "../browser-session.js";
import { Browser } from "../browser/types.js";
import { Logger } from "../logger.js";
import { HttpBadRequestError } from "../utils/http-errors.js";
import { createJsonRoute } from "../utils/routes.js";

export const ROUTE_INFO = {
  method: "POST",
  path: "/sessions",
  bodySchema: z
    .object({
      allowedHosts: z.array(z.string()).optional(),
    })
    .optional(),
};

type Body = z.infer<(typeof ROUTE_INFO)["bodySchema"]>;

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
    bodySchema: ROUTE_INFO.bodySchema,
    logger,
    async handler(body: Body) {
      if (sessions.length >= maxSessions) {
        throw new HttpBadRequestError(
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
