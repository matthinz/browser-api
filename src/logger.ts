export interface Logger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

export type CreateConsoleLoggerOptions = {
  verbose?: boolean;
};

export function createConsoleLogger(options?: CreateConsoleLoggerOptions) {
  const { verbose = false } = options ?? {};

  const NOOP = () => {};

  const debug = verbose
    ? (...args: unknown[]) => {
        console.error(...args);
      }
    : NOOP;

  const info = (...args: unknown[]) => {
    console.log(...args);
  };

  const warn = (...args: unknown[]) => {
    console.error(...args);
  };

  const error = (...args: unknown[]) => {
    console.error(...args);
  };

  return { debug, info, warn, error };
}
