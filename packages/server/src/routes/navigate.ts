import { z } from "zod";
import { BrowserSession } from "../browser-session.js";
import { Logger } from "../logger.js";
import { formatSessionResponse } from "../session-response.js";
import { getSessionById } from "../sessions.js";
import { HttpNotFoundError } from "../utils/http-errors.js";
import { RouteParams, createJsonRoute } from "../utils/routes.js";

type NavigateRouteOptions = {
  sessions: BrowserSession[];
  logger: Logger;
};

const PARAMS_SCHEMA = {
  id: z.string().uuid(),
  "0": z.string().url(),
} as const;

type Params = RouteParams<typeof PARAMS_SCHEMA>;

export function navigateRoute({ logger, sessions }: NavigateRouteOptions) {
  return createJsonRoute({
    paramsSchema: PARAMS_SCHEMA,
    logger,
    async handler(params: Params) {
      const { id } = params;
      const session = getSessionById(sessions, id);

      if (!session) {
        throw new HttpNotFoundError();
      }

      await session.execute([
        {
          name: "navigate",
          url: new URL(params[0]).toString(),
        },
      ]);

      return await formatSessionResponse(session);
    },
  });
}
