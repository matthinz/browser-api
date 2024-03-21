import { z } from "zod";
import { BrowserSession } from "../browser-session.js";
import { HttpStatusError, createJsonRoute } from "./utils.js";
import { Logger } from "../logger.js";
import { getSessionById } from "../sessions.js";
import { formatSessionResponse } from "../session-response.js";
import { commandSessionRoute } from "./command-session.js";

type NavigateRouteOptions = {
  sessions: BrowserSession[];
  logger: Logger;
};

const paramsSchema = z.object({
  id: z.string(),
  "0": z.string().url(),
});

const bodySchema = z.any().optional();

export function navigateRoute({ logger, sessions }: NavigateRouteOptions) {
  return createJsonRoute({
    paramsSchema,
    bodySchema,
    logger,
    async handler(params) {
      const { id } = params;
      const session = getSessionById(sessions, id);

      if (!session) {
        throw new HttpStatusError(404, "not_found", "Not found");
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
