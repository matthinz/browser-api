import { z } from "zod";
import { BrowserSession } from "../browser-session.js";
import { Logger } from "../logger.js";
import { HttpStatusError, createJsonRoute } from "./utils.js";
import { getSessionById } from "../sessions.js";

type DeleteSessionRouteOptions = {
  logger: Logger;

  sessions: BrowserSession[];
};

export function deleteSessionRoute({
  logger,
  sessions,
}: DeleteSessionRouteOptions) {
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

      logger.debug("Deleting session %s", session.id);

      const index = sessions.indexOf(session);
      sessions.splice(index, 1);

      await session.browserTab.close();
    },
  });
}
