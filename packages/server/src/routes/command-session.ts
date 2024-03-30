import { z } from "zod";
import { BrowserSession } from "../browser-session.js";
import { BrowserCommandSchema } from "../browser/schema.js";
import { Logger } from "../logger.js";
import { getSessionById } from "../sessions.js";
import { HttpNotFoundError } from "../utils/http-errors.js";
import { RouteParams, createJsonRoute } from "../utils/routes.js";

export const ROUTE_INFO = {
  method: "POST",
  path: "/sessions/{id}/command",
  paramsSchema: {
    id: z.string().uuid(),
  },
  bodySchema: z.object({
    commands: z.array(BrowserCommandSchema),
  }),
};

type CommandSessionRouteOptions = {
  logger: Logger;
  sessions: BrowserSession[];
};

type Body = z.infer<(typeof ROUTE_INFO)["bodySchema"]>;
type Params = RouteParams<(typeof ROUTE_INFO)["paramsSchema"]>;

export function commandSessionRoute({
  logger,
  sessions,
}: CommandSessionRouteOptions) {
  return createJsonRoute({
    bodySchema: ROUTE_INFO.bodySchema,
    paramsSchema: ROUTE_INFO.paramsSchema,
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
