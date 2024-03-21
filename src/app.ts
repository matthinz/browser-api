import express, { json } from "express";
import { createSessionRoute } from "./routes/create-session.js";
import { BrowserSession } from "./browser-session.js";
import { navigateRoute } from "./routes/navigate.js";
import { createGoogleChromeBrowser } from "./browser/chrome/index.js";
import { Browser } from "./browser/types.js";
import { Logger, createConsoleLogger } from "./logger.js";
import { deleteSessionRoute } from "./routes/delete-session.js";
import { getSessionRoute } from "./routes/get-session.js";
import { commandSessionRoute } from "./routes/command-session.js";

type CreateAppOptions = {
  browserTabMaxIdleTimeInMs?: number;
  cleanupIntervalInMs?: number;
  maxSessions?: number;
  port?: number;
  sessionHistoryLimit?: number;
  verbose?: boolean;
};

type ScheduleCleanupOptions = {
  browser: Browser;
  browserTabMaxIdleTimeInMs: number;
  cleanupIntervalInMs: number;
  logger: Logger;
  sessions: BrowserSession[];
};

const DEFAULT_CLEANUP_INTERVAL = 10 * 1000;
const DEFAULT_BROWSER_TAB_MAX_IDLE_TIME = 3 * 60 * 1000;
const DEFAULT_MAX_SESSIONS = 10;
const DEFAULT_PORT = 7890;
const DEFAULT_SESSION_HISTORY_LIMIT = 1000;

export function createApp(
  options: CreateAppOptions = {},
): () => Promise<number> {
  const port =
    [options.port, parseInt(process.env.PORT ?? "", 10)].find(
      (p) => p && !isNaN(p),
    ) ?? DEFAULT_PORT;

  const {
    cleanupIntervalInMs = DEFAULT_CLEANUP_INTERVAL,
    browserTabMaxIdleTimeInMs = DEFAULT_BROWSER_TAB_MAX_IDLE_TIME,
    maxSessions = DEFAULT_MAX_SESSIONS,
    sessionHistoryLimit = DEFAULT_SESSION_HISTORY_LIMIT,
  } = options;

  const logger = createConsoleLogger(options);

  const sessions: BrowserSession[] = [];

  const browser = createGoogleChromeBrowser({ logger });

  const app = express();

  app.use(json());

  app.get(
    "/sessions/:id",
    getSessionRoute({
      logger,
      sessions,
    }),
  );

  app.post(
    "/sessions/:id/command",
    commandSessionRoute({
      logger,
      sessions,
    }),
  );

  app.get(
    "/sessions/:id/*",
    navigateRoute({
      logger,
      sessions,
    }),
  );

  app.delete(
    "/sessions/:id",
    deleteSessionRoute({
      sessions,
      logger,
    }),
  );

  app.post(
    "/sessions",
    createSessionRoute({
      browser,
      logger,
      maxSessions,
      sessionHistoryLimit,
      sessions,
    }),
  );

  scheduleCleanup({
    browser,
    browserTabMaxIdleTimeInMs,
    cleanupIntervalInMs,
    logger,
    sessions,
  });

  return () =>
    new Promise<number>((resolve) => {
      app.listen(port, () => {
        resolve(port);
      });
    });
}

function scheduleCleanup(options: ScheduleCleanupOptions) {
  const {
    browser,
    sessions,
    browserTabMaxIdleTimeInMs,
    cleanupIntervalInMs,
    logger,
  } = options;

  setTimeout(() => {
    const sessionsToClose = sessions.filter((session) => {
      if (session.browserTab.isBusy) {
        return false;
      }

      const msSinceLastAction =
        Date.now() - session.browserTab.lastActionAt.getTime();

      return msSinceLastAction > browserTabMaxIdleTimeInMs;
    });

    sessionsToClose.forEach((session) => {
      const index = sessions.indexOf(session);
      sessions.splice(index, 1);
    });

    Promise.all(
      sessionsToClose.map(async (session) => {
        logger.debug("Cleaning up session %s", session.id);
        await session.browserTab.close();
      }),
    ).then(async () => {
      if (sessions.length === 0 && sessionsToClose.length > 0) {
        logger.debug("No more active sessions. Exiting browser.");
        await browser.exit();
      }

      scheduleCleanup(options);
    });
  }, cleanupIntervalInMs);
}
