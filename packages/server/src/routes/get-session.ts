import { z } from "zod";
import { BrowserSession } from "../browser-session.js";
import { Logger } from "../logger.js";
import {
  SessionResponseSchema,
  formatSessionResponse,
} from "../session-response.js";
import { getSessionById } from "../sessions.js";
import { HttpNotFoundError } from "../utils/http-errors.js";
import { RouteParams, createJsonRoute } from "../utils/routes.js";

export const ROUTE_INFO = {
  method: "GET",
  path: "/sessions/{id}",
  paramsSchema: {
    id: z.string().uuid(),
  },
  responseSchema: SessionResponseSchema,
};

type GetSessionRouteOptions = {
  logger: Logger;
  sessions: BrowserSession[];
};

type Params = RouteParams<(typeof ROUTE_INFO)["paramsSchema"]>;

export function getSessionRoute({ logger, sessions }: GetSessionRouteOptions) {
  return createJsonRoute({
    paramsSchema: ROUTE_INFO.paramsSchema,
    logger,
    async handler({ id }: Params) {
      const session = getSessionById(sessions, id);
      if (!session) {
        throw new HttpNotFoundError();
      }

      return formatSessionResponse(session);
    },
  });
}
