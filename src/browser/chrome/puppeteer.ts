import {
  Browser as PuppeteerBrowser,
  Page,
  connect,
  BrowserContext,
} from "puppeteer";
import puppeteer from "puppeteer-extra";
import stealthPlugin from "puppeteer-extra-plugin-stealth";
import { Logger } from "../../logger.js";
import {
  Browser,
  BrowserLink,
  BrowserTab,
  BrowserTabOptions,
} from "../types.js";

// @ts-ignore
puppeteer.use(stealthPlugin());

type PuppeteerBrowserOptions = {
  launchBrowser: () => Promise<string>;
  logger: Logger;
};

const DEFAULT_BROWSER_TAB_OPTIONS: Partial<BrowserTabOptions> = {
  allowedHosts: undefined,
  viewport: undefined,
};

export class PuppeteerBrowserImpl implements Browser {
  #browserPromise: Promise<PuppeteerBrowser> | undefined;
  #options: PuppeteerBrowserOptions;

  constructor(options: PuppeteerBrowserOptions) {
    this.#options = options;
  }

  async exit(): Promise<void> {
    if (!this.#browserPromise) {
      return;
    }

    const browser = await this.#browserPromise;
    this.#browserPromise = undefined;
    await browser.close();
  }

  newTab(options?: Partial<BrowserTabOptions>): BrowserTab {
    const finalOptions: BrowserTabOptions = {
      ...(options ?? {}),
      logger: this.logger,
    };

    return new PuppeteerBrowserTab(finalOptions, () =>
      this.getPuppeteerBrowser().then((browser) =>
        browser.createBrowserContext(),
      ),
    );
  }

  getPuppeteerBrowser(): Promise<PuppeteerBrowser> {
    this.#browserPromise =
      this.#browserPromise ??
      this.#options.launchBrowser().then((browserWSEndpoint) =>
        connect({
          browserWSEndpoint,
        }),
      );

    return this.#browserPromise;
  }

  private get logger(): Logger {
    return this.#options.logger;
  }
}

class PuppeteerBrowserTab implements BrowserTab {
  #options: BrowserTabOptions;
  #contextFactory: () => Promise<BrowserContext>;
  #contextPromise: Promise<BrowserContext> | undefined;
  #pageFactory: () => Promise<Page>;
  #pagePromise: Promise<Page> | undefined;
  #page: Page | undefined;
  #thingsInFlight: number = 0;
  #lastActionAt: Date = new Date();

  constructor(
    options: BrowserTabOptions,
    contextFactory: () => Promise<BrowserContext>,
  ) {
    this.#options = Object.assign({}, DEFAULT_BROWSER_TAB_OPTIONS, options);
    this.#contextFactory = contextFactory;
    this.#pageFactory = async () => {
      this.#contextPromise = this.#contextPromise ?? this.#contextFactory();
      const context = await this.#contextPromise;
      return context.newPage();
    };
  }

  get isBusy(): boolean {
    return this.#thingsInFlight > 0;
  }

  get isClosed(): boolean {
    if (!this.#pagePromise) {
      return true;
    }

    if (this.#page) {
      return this.#page.isClosed();
    }

    return false;
  }

  get lastActionAt(): Date {
    return new Date(this.#lastActionAt);
  }

  async click(selector: string): Promise<void> {
    return this.usePage(async (page) => {
      await page.click(selector);
    });
  }

  async close(): Promise<void> {
    if (this.isBusy) {
      throw new Error("Wait for pending requests to complete before closing");
    }

    if (!this.#pagePromise) {
      return;
    }

    const promise = this.#pagePromise;
    this.#pagePromise = undefined;

    try {
      const page = await promise;
      await page.close();
    } catch {}
  }

  findLinks(): Promise<BrowserLink[]> {
    return this.usePage(async (page) => {
      const links = await page.evaluate(() => {
        const links: HTMLAnchorElement[] = [].slice.call(
          document.querySelectorAll("a[href]"),
        );

        return links.map((el) => {
          return {
            id: el.id,
            href: el.href,
            selector: getBestSelector(el),
            classes: el.className.split(/\s+/),
            text: el.innerText,
            visible: el.checkVisibility(),
          };
        });

        function getBestSelector(
          el: HTMLElement,
          prefix?: string,
        ): string | undefined {
          type Strategy = () => string | undefined;
          const strategies: Strategy[] = [
            function byId() {
              if (el.id.length > 0) {
                return `#${el.id}`;
              }
            },
            function byClass() {
              if (el.classList.length > 0) {
                return `.${Array.from(el.classList).join(".")}`;
              }
            },
            function byName() {
              const name = el.getAttribute("name");
              if (!name) {
                return;
              }
              return `[name="${name}"]`;
            },
            function tag() {
              return el.tagName;
            },
            function exhaustive() {
              if (prefix) {
                return;
              }

              if (!el.parentElement || el.parentElement === el) {
                return;
              }
              const parentSelector = getBestSelector(el.parentElement);
              if (parentSelector) {
                return getBestSelector(el, `${parentSelector} > `);
              }
            },
          ];

          for (const strat of strategies) {
            const selector = strat();
            if (selector == null) {
              continue;
            }

            const selectorWithPrefix = prefix
              ? `${prefix}${selector}`
              : selector;

            try {
              const all = [].slice.apply(
                document.querySelectorAll(selectorWithPrefix),
              );
              if (all.length === 1 && all[0] === el) {
                return selectorWithPrefix;
              }
            } catch {}
          }
        }
      });

      return links.map((link) => ({
        ...link,
        href: tryParseUrl(link.href),
      }));
    });

    function tryParseUrl(url: string): URL | undefined {
      if (url === "") {
        return;
      }
      try {
        return new URL(url);
      } catch {}
    }
  }

  async html(): Promise<string> {
    return this.usePage(async (page) => {
      // @ts-ignore
      return page.evaluate(() => document.documentElement.outerHTML);
    });
  }

  async navigate(url: URL): Promise<void> {
    await this.usePage(async (page) => {
      this.#lastActionAt = new Date();
      await page.goto(url.toString());
    });
  }

  screenshot(filename: string): Promise<void> {
    return this.usePage(async (page) => {
      await page.screenshot({
        fullPage: true,
        path: filename,
      });
    });
  }

  type(selector: string, value: string | number): Promise<void> {
    return this.usePage(async (page) => {
      await page.type(selector, String(value));
    });
  }

  url(): Promise<URL> {
    return this.usePage(async (page) => new URL(page.url()));
  }

  async configurePage(page: Page): Promise<Page> {
    page.emulateTimezone(
      this.#options.timezone ??
        Intl.DateTimeFormat().resolvedOptions().timeZone,
    );

    page.setViewport(
      Object.assign(
        {
          width: 1024 + Math.floor(Math.random() * 416),
          height: 768 + Math.floor(Math.random() * 312),
        },
        this.#options.viewport ?? {},
      ),
    );

    if (this.#options.allowedHosts != null) {
      this.logger.debug(
        "Configuring allowedHosts: %o",
        this.#options.allowedHosts,
      );
      this.configureRequestInterception(page, this.#options.allowedHosts);
    } else {
      this.logger.debug("All hosts allowed");
    }

    return page;
  }

  configureRequestInterception(page: Page, allowedHosts: Iterable<string>) {
    page.setRequestInterception(true);

    let allowedHostsArray: string[] | undefined;

    page.on("request", (request) => {
      allowedHostsArray = allowedHostsArray ?? [...allowedHosts];

      const requestUrl = new URL(request.url());

      const shouldBlock =
        allowedHosts != null &&
        !allowedHostsArray.includes(requestUrl.hostname);

      if (shouldBlock) {
        request.abort();
        if (this.#options.onRequestBlocked) {
          setImmediate(this.#options.onRequestBlocked, requestUrl);
        }
      } else {
        request.continue();
      }
    });
  }

  async usePage<T>(callback: (page: Page) => Promise<T>): Promise<T> {
    try {
      this.#thingsInFlight += 1;

      if (!this.#pagePromise) {
        this.#pagePromise = this.#pageFactory().then((page) => {
          if (page.isClosed()) {
            return page;
          }

          return this.configurePage(page);
        });
      }

      const page = await this.#pagePromise;

      if (page.isClosed()) {
        return this.usePage(callback);
      }

      return await callback(page);
    } finally {
      this.#thingsInFlight -= 1;
    }
  }

  private get logger(): Logger {
    return this.#options.logger;
  }
}
