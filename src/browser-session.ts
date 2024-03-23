import { randomUUID } from "node:crypto";
import path from "node:path";
import { Browser, BrowserCommand, BrowserTab } from "./browser/types.js";

type BrowserSessionOptions = {
  browser: Browser;
  createdAt?: Date;
  allowedHosts?: string[];
  historyLimit: number;
  workingDir: string;
};

export type BrowserSessionHistoryItem = { at: number } & (
  | {
      command: BrowserCommand;
    }
  | {
      urlBlocked: URL;
    }
  | {
      consoleMessage: {
        type: string;
        text: string;
      };
    }
);

export class BrowserSession {
  #id: string;
  #allowedHosts: string[] | undefined;
  #browser: Browser;
  #browserTab: BrowserTab | undefined;
  #createdAt: Date;
  #history: BrowserSessionHistoryItem[];
  #historyLimit: number;
  #workingDir: string;

  constructor({
    allowedHosts,
    browser,
    createdAt,
    historyLimit,
    workingDir,
  }: BrowserSessionOptions) {
    this.#id = randomUUID();
    this.#allowedHosts = allowedHosts ? [...allowedHosts] : undefined;
    this.#browser = browser;
    this.#createdAt = createdAt ? new Date(createdAt) : new Date();
    this.#history = [];
    this.#historyLimit = historyLimit;
    this.#workingDir = workingDir;
  }

  get browserTab(): BrowserTab {
    if (this.#browserTab) {
      return this.#browserTab;
    }

    return (this.#browserTab = this.#browser.newTab({
      allowedHosts: this.#allowedHosts,
      onConsoleMessage: (type, text) => {
        this.addToHistory({
          at: Date.now(),
          consoleMessage: {
            type,
            text,
          },
        });
      },
      onRequestBlocked: (url) => {
        this.addToHistory({
          at: Date.now(),
          urlBlocked: url,
        });
      },
    }));
  }

  get createdAt(): Date {
    return new Date(this.#createdAt);
  }

  get history(): BrowserSessionHistoryItem[] {
    return [...this.#history];
  }

  get id(): string {
    return this.#id;
  }

  /**
   * Executes a set of commands in this browser.
   * @param commands
   */
  execute(commands: Iterable<BrowserCommand>): Promise<void> {
    return Array.from(commands).reduce(
      (promise, command) =>
        promise.then(async () => {
          await this.executeSingleCommand(command);
        }),
      Promise.resolve(),
    );
  }

  async takeScreenshot(): Promise<string> {
    const filename = path.join(this.#workingDir, `screenshot-${this.id}.png`);
    await this.browserTab.screenshot(filename);
    return filename;
  }

  private addToHistory(item: BrowserSessionHistoryItem) {
    this.#history.push(item);

    while (this.#history.length > this.#historyLimit) {
      this.#history.shift();
    }
  }

  private async executeSingleCommand(command: BrowserCommand): Promise<void> {
    switch (command.name) {
      case "navigate":
        await this.browserTab.navigate(new URL(command.url));
        break;

      case "click":
        await this.browserTab.click(command.selector);
        break;

      case "type":
        await this.browserTab.type(command.selector, command.text);
        break;
    }

    this.addToHistory({
      at: Date.now(),
      command,
    });
  }
}
