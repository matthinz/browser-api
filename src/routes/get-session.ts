import { z } from "zod";

import { HttpStatusError, createJsonRoute } from "./utils.js";
import { BrowserSession } from "../browser-session.js";
import { Logger } from "../logger.js";
import { getSessionById } from "../sessions.js";
import { formatSessionResponse } from "../session-response.js";

type GetSessionRouteOptions = {
  logger: Logger;
  sessions: BrowserSession[];
};

export function getSessionRoute({ logger, sessions }: GetSessionRouteOptions) {
  return createJsonRoute({
    bodySchema: z.any().optional(),
    paramsSchema: z.object({
      id: z.string(),
    }),
    logger,
    async handler({ id }) {
      const session = getSessionById(sessions, id);
      if (!session) {
        throw new HttpStatusError(404, "not_found", "Session not found");
      }

      return formatSessionResponse(session);
    },
  });
}
