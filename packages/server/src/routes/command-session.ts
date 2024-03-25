import { z } from "zod";
import { BrowserSession } from "../browser-session.js";
import { BrowserCommandSchema } from "../browser/schema.js";
import { Logger } from "../logger.js";
import { getSessionById } from "../sessions.js";
import { HttpNotFoundError } from "../utils/http-errors.js";
import { RouteParams, createJsonRoute } from "../utils/routes.js";

type CommandSessionRouteOptions = {
  logger: Logger;
  sessions: BrowserSession[];
};

export const BODY_SCHEMA = z.object({
  commands: z.array(BrowserCommandSchema),
});

export const PARAMS_SCHEMA = {
  id: z.string(),
};

type Body = z.infer<typeof BODY_SCHEMA>;
type Params = RouteParams<typeof PARAMS_SCHEMA>;

export function commandSessionRoute({
  logger,
  sessions,
}: CommandSessionRouteOptions) {
  return createJsonRoute({
    bodySchema: BODY_SCHEMA,
    paramsSchema: PARAMS_SCHEMA,
    logger,
    async handler({ id }: Params, { commands }: Body) {
      const session = getSessionById(sessions, id);
      if (!session) {
        throw new HttpNotFoundError();
      }

      await session.execute(commands);
    },
  });
}
