import { z } from "zod";
import { Logger } from "../logger.js";
import { BrowserCommandSchema } from "./schema.js";

export type BrowserCommand = z.infer<typeof BrowserCommandSchema>;

export interface BrowserElement {
  id?: string;
  classes?: string[];
  selector?: string;
  text?: string;
  visible: boolean;
}

export interface BrowserLink extends BrowserElement {
  href?: URL;
}

export interface BrowserTabOptions {
  readonly allowedHosts?: Iterable<string>;
  readonly logger: Logger;
  readonly timezone?: string;
  readonly onConsoleMessage?: (
    type: "log" | "debug" | "error" | "info" | "warn",
    text: string,
  ) => void;
  readonly onRequestBlocked?: (url: URL) => void;
  readonly viewport?: Partial<BrowserViewport>;
}

export interface BrowserViewport {
  width: number;
  height: number;
}

export interface Browser {
  /**
   * Closes all tabs and exits the browser.
   */
  exit(): Promise<void>;

  /**
   * Creates a new tab on the browser.
   * @returns {BrowserTab}
   */
  newTab(options?: Partial<BrowserTabOptions>): BrowserTab;
}

export interface BrowserTab {
  get isBusy(): boolean;

  /**
   * Whether this tab has been closed.
   */
  get isClosed(): boolean;

  /**
   * Returns when this browser tab last did something.
   */
  get lastActionAt(): Date;

  click(selector: string): Promise<void>;

  /**
   * Closes this tab.
   */
  close(): Promise<void>;

  /**
   * Scans the page and returns information about links present.
   */
  findLinks(): Promise<BrowserLink[]>;

  /**
   *  @returns {Promise<string>} The source HTML for the current page.
   */
  html(): Promise<string>;

  /**
   * Navigates the tab to a new URL.
   * @param url {URL} URL to which to navigate.
   * @returns {Promise<void>} A Promise that resolves when navigation completes.
   */
  navigate(url: URL): Promise<void>;

  screenshot(filename: string): Promise<void>;

  type(selector: string, value: string | number): Promise<void>;

  /**
   * @returns {URL} The current url of the tab.
   */
  url(): Promise<URL>;
}
