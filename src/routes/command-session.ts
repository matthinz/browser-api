import { z } from "zod";
import { BrowserSession } from "../browser-session.js";
import { HttpStatusError, createJsonRoute } from "./utils.js";
import { getSessionById } from "../sessions.js";
import { BrowserCommandSchema } from "../browser/schema.js";
import { Logger } from "../logger.js";

type CommandSessionRouteOptions = {
  logger: Logger;
  sessions: BrowserSession[];
};

const bodySchema = z.object({
  commands: z.array(BrowserCommandSchema),
});

const paramsSchema = z.object({
  id: z.string(),
});

export function commandSessionRoute({
  logger,
  sessions,
}: CommandSessionRouteOptions) {
  return createJsonRoute({
    bodySchema,
    paramsSchema,
    logger,
    async handler({ id }, { commands }) {
      const session = getSessionById(sessions, id);
      if (!session) {
        throw new HttpStatusError(404, "not_found", "Session not found");
      }

      await session.execute(commands);
    },
  });
}
