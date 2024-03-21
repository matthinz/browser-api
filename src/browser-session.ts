import { randomUUID } from "node:crypto";
import { Browser, BrowserCommand, BrowserTab } from "./browser/types.js";

type BrowserSessionOptions = {
  browser: Browser;
  createdAt?: Date;
  allowedHosts?: string[];
  historyLimit: number;
};

export type BrowserSessionHistoryItem = { at: number } & (
  | {
      command: BrowserCommand;
    }
  | {
      urlBlocked: URL;
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
  #blockedRequests: Set<string>;

  constructor({
    allowedHosts,
    browser,
    createdAt,
    historyLimit,
  }: BrowserSessionOptions) {
    this.#id = randomUUID();
    this.#allowedHosts = allowedHosts ? [...allowedHosts] : undefined;
    this.#browser = browser;
    this.#createdAt = createdAt ? new Date(createdAt) : new Date();
    this.#history = [];
    this.#historyLimit = historyLimit;
    this.#blockedRequests = new Set();
  }

  get browserTab(): BrowserTab {
    if (this.#browserTab) {
      return this.#browserTab;
    }

    return (this.#browserTab = this.#browser.newTab({
      allowedHosts: this.#allowedHosts,
      onRequestBlocked: (url) => {
        this.addToHistory({
          at: Date.now(),
          urlBlocked: url,
        });
      },
    }));
  }

  get blockedRequests(): string[] {
    return Array.from(this.#blockedRequests);
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
