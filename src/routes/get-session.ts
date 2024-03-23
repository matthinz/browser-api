import { z } from "zod";
import { BrowserSession } from "../browser-session.js";
import { Logger } from "../logger.js";
import { formatSessionResponse } from "../session-response.js";
import { getSessionById } from "../sessions.js";
import { HttpNotFoundError } from "../utils/http-errors.js";
import { RouteParams, createJsonRoute } from "../utils/routes.js";

type GetSessionRouteOptions = {
  logger: Logger;
  sessions: BrowserSession[];
};

export const PARAMS_SCHEMA = {
  id: z.string().uuid(),
} as const;

type Params = RouteParams<typeof PARAMS_SCHEMA>;

export function getSessionRoute({ logger, sessions }: GetSessionRouteOptions) {
  return createJsonRoute({
    paramsSchema: PARAMS_SCHEMA,
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
