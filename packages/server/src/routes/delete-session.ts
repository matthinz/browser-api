import { z } from "zod";
import { BrowserSession } from "../browser-session.js";
import { Logger } from "../logger.js";
import { getSessionById } from "../sessions.js";
import { HttpNotFoundError } from "../utils/http-errors.js";
import { RouteParams, createJsonRoute } from "../utils/routes.js";

export const ROUTE_INFO = {
  method: "DELETE",
  path: "/sessions/{id}",
  paramsSchema: {
    id: z.string().uuid(),
  },
};

type DeleteSessionRouteOptions = {
  logger: Logger;
  sessions: BrowserSession[];
};

type Params = RouteParams<(typeof ROUTE_INFO)["paramsSchema"]>;

export function deleteSessionRoute({
  logger,
  sessions,
}: DeleteSessionRouteOptions) {
  return createJsonRoute({
    paramsSchema: ROUTE_INFO.paramsSchema,
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
