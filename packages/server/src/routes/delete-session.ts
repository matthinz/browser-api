import { z } from "zod";
import { BrowserSession } from "../browser-session.js";
import { Logger } from "../logger.js";
import { getSessionById } from "../sessions.js";
import { HttpNotFoundError } from "../utils/http-errors.js";
import { RouteParams, createJsonRoute } from "../utils/routes.js";

type DeleteSessionRouteOptions = {
  logger: Logger;
  sessions: BrowserSession[];
};

export const PARAMS_SCHEMA = {
  id: z.string().uuid(),
} as const;

type Params = RouteParams<typeof PARAMS_SCHEMA>;

export function deleteSessionRoute({
  logger,
  sessions,
}: DeleteSessionRouteOptions) {
  return createJsonRoute({
    paramsSchema: PARAMS_SCHEMA,
    logger,
    async handler({ id }: Params) {
      const session = getSessionById(sessions, id);

      if (!session) {
        throw new HttpNotFoundError();
      }

      logger.debug("Deleting session %s", session.id);

      const index = sessions.indexOf(session);
      sessions.splice(index, 1);

      await session.browserTab.close();
    },
  });
}
