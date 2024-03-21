import fs from "fs/promises";
import { platform } from "node:os";
import { spawn } from "node:child_process";
import path from "node:path";
import { PuppeteerBrowserImpl } from "./puppeteer.js";
import { ChildProcess } from "child_process";
import { Browser } from "../types.js";
import { z } from "zod";
import { fetchJson } from "./utils.js";
import { Logger } from "../../logger.js";

type CreateGoogleChromeBrowserOptions = {
  findRunningInstanceTimeoutInMs: number;
  googleChromePath: string;
  logger: Logger;
  pidFile: string;
};

const DEFAULT_PID_FILE = "/tmp/browser.pid";
const DEFAULT_FIND_RUNNING_INSTANCE_TIMEOUT = 1000;

const PidInfoSchema = z.object({
  process: z.number().int(),
  port: z.number().int(),
});

export function createGoogleChromeBrowser(
  options: Partial<CreateGoogleChromeBrowserOptions> &
    Pick<CreateGoogleChromeBrowserOptions, "logger">,
): Browser {
  const {
    findRunningInstanceTimeoutInMs = DEFAULT_FIND_RUNNING_INSTANCE_TIMEOUT,
    googleChromePath = getDefaultGoogleChromePath(),
    logger,
    pidFile = DEFAULT_PID_FILE,
  } = options;

  const launchBrowser = async () => {
    const runningUrl = await findRunningGoogleChromeInstance({
      pidFile,
      findRunningInstanceTimeoutInMs,
    });

    if (runningUrl) {
      logger.debug("Found Google Chrome running");
      return runningUrl.toString();
    }

    const launchedUrl = await launchGoogleChrome({ googleChromePath, pidFile });

    if (!launchedUrl) {
      throw new Error("Could not launch or connect to Google Chrome");
    }
    return launchedUrl.toString();
  };

  return new PuppeteerBrowserImpl({ launchBrowser, logger });
}

async function findRunningGoogleChromeInstance({
  findRunningInstanceTimeoutInMs,
  pidFile,
}: Pick<
  CreateGoogleChromeBrowserOptions,
  "findRunningInstanceTimeoutInMs" | "pidFile"
>): Promise<URL | void> {
  const { port } = (await readPidFile(pidFile)) ?? {};

  if (!port) {
    return;
  }

  const url = await getWebSocketDebuggerUrl({
    port,
    maxDelayInMs: 1000,
    retries: 0,
    timeoutInMs: findRunningInstanceTimeoutInMs,
  });

  if (url) {
    return url;
  }
}

async function launchGoogleChrome({
  googleChromePath,
  pidFile,
}: Pick<
  CreateGoogleChromeBrowserOptions,
  "googleChromePath" | "pidFile"
>): Promise<URL | void> {
  const remoteDebuggingPort = Math.floor(10000 + Math.random() * 50000);

  const args = [
    "--bwsi",
    "--disable-extensions",
    "--disable-first-run-ui",
    "--disable-notifications",
    "--no-default-browser-check",
    "--no-experiments",
    "--no-first-run",
    "--no-startup-window",
    `--remote-debugging-port=${remoteDebuggingPort}`,
  ];

  const proc = await runCommand(
    googleChromePath ?? getDefaultGoogleChromePath(),
    args,
  );

  const url = await getWebSocketDebuggerUrl({
    port: remoteDebuggingPort,
    maxDelayInMs: 1000,
    retries: 10,
    timeoutInMs: 1000,
  });

  if (url) {
    await fs.writeFile(
      pidFile,
      JSON.stringify({
        process: proc.pid,
        port: remoteDebuggingPort,
      }),
    );
  }

  return url;
}

async function readPidFile(
  pidFile: string,
): Promise<z.infer<typeof PidInfoSchema> | undefined> {
  try {
    const result = PidInfoSchema.safeParse(
      JSON.parse(await fs.readFile(pidFile, "utf-8")),
    );
    return result.success ? result.data : undefined;
  } catch {
    // We couldn't actually talk to the instance, so it's probably not there
    await fs.unlink(pidFile).catch(() => {});
  }
}

function runCommand(cmd: string, args: string[]): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args);

    proc.on("spawn", () => {
      resolve(proc);
    });

    proc.on("error", (err) => {
      reject(err);
    });
  });
}

type GetWebSocketDebuggerUrlOptions = {
  port: number;
  timeoutInMs: number;
  retries: number;
  maxDelayInMs: number;
};

async function getWebSocketDebuggerUrl(
  options: GetWebSocketDebuggerUrlOptions,
): Promise<URL | void> {
  return fetchJson({
    ...options,
    url: `http://localhost:${options.port}/json/version`,
    schema: z
      .object({
        webSocketDebuggerUrl: z.string(),
      })
      .passthrough(),
  }).then((result) => {
    if (result) {
      return new URL(result.webSocketDebuggerUrl);
    }
  });
}

function getDefaultGoogleChromePath(): string {
  switch (platform()) {
    case "darwin":
      return path.join(
        "/",
        "Applications",
        "Google Chrome.app",
        "Contents",
        "MacOS",
        "Google Chrome",
      );
    default:
      throw new Error(`Unsupported operating system: ${platform()}`);
  }
}
