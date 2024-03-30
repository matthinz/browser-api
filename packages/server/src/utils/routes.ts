import { Request, Response } from "express";
import { ZodSchema, ZodType, z } from "zod";
import { Logger } from "../logger.js";
import {
  HttpNotFoundError,
  HttpStatusError,
  ZodHttpBadRequestError,
} from "./http-errors.js";

export const RouteInfoSchema = z.object({
  method: z.enum(["GET", "POST", "PUT", "DELETE"]).optional(),
  path: z.string(),
  bodySchema: z.instanceof(ZodType).optional(),
  paramsSchema: z.record(z.instanceof(ZodType)).optional(),
  responseSchema: z.instanceof(ZodType).optional(),
});

export type RouteInfo = z.infer<typeof RouteInfoSchema>;

export type RouteParamsSchema = {
  [key: string]: z.ZodType<string | number | undefined>;
};

export type RouteParams<Schema extends RouteParamsSchema> = {
  [key in keyof Schema]: z.infer<Schema[key]>;
};

type RouteHandler = (req: Request, res: Response) => void;

/**
 * Creates a generic route handler.
 * @param options
 * @returns
 */
export function createRoute(options: {
  handler: (req: Request, res: Response) => Promise<void> | undefined;
  logger: Logger;
}): RouteHandler {
  const { handler, logger } = options;
  return (req, res) => {
    let promise: Promise<void> | undefined;
    try {
      promise = handler(req, res);
    } catch (err) {
      handleError(err, req, res);
    }

    if (!promise) {
      return;
    }

    promise.catch((err) => {
      handleError(err, req, res);
    });
  };

  function handleError(err: unknown, req: Request, res: Response) {
    res.status(500);
    res.contentType("text/plain");
    res.send(err instanceof Error ? err.message : "");
    res.end();
  }
}

export function createJsonRoute<
  TResult,
  TParamsSchema extends RouteParamsSchema,
  TBody extends {} | undefined,
>(
  options:
    | {
        handler: () => Promise<TResult>;
        logger: Logger;
      }
    | {
        bodySchema: z.ZodType<TBody>;
        handler: (body: TBody) => Promise<TResult>;
        logger: Logger;
      }
    | {
        handler: (params: RouteParams<TParamsSchema>) => Promise<TResult>;
        paramsSchema: TParamsSchema;
        logger: Logger;
      }
    | {
        paramsSchema: TParamsSchema;
        bodySchema: z.ZodType<TBody>;
        handler: (
          params: RouteParams<TParamsSchema>,
          body: TBody,
        ) => Promise<TResult>;
        logger: Logger;
      },
): RouteHandler {
  return createRoute({
    handler(req, res) {
      let promise: Promise<TResult>;

      if ("paramsSchema" in options) {
        const params = parseParams(options.paramsSchema, req.params);

        if (params == null) {
          promise = Promise.reject(new HttpNotFoundError());
        } else if ("bodySchema" in options) {
          const body = parseBody(options.bodySchema, req.body);
          promise = options.handler(params, body);
        } else {
          promise = options.handler(params);
        }
      } else {
        if ("bodySchema" in options) {
          const body = parseBody(options.bodySchema, req.body);
          promise = options.handler(body);
        } else {
          promise = options.handler();
        }
      }

      return promise
        .then((result) => {
          res.status(200);
          res.json(result);
          res.end();
        })
        .catch((err) => {
          if (err instanceof HttpStatusError) {
            res.status(err.statusCode);
            res.json({
              error: err.toJSON(),
            });
            res.end();
          } else {
            throw err;
          }
        });
    },
    logger: options.logger,
  });
}

function parseParams<TParamsSchema extends RouteParamsSchema>(
  schema: TParamsSchema,
  params: Record<string, unknown>,
): RouteParams<TParamsSchema> | undefined {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(schema)) {
    const parsed = schema[key].safeParse(params[key]);
    if (parsed.success) {
      result[key] = parsed.data;
    } else {
      return;
    }
  }

  return result as RouteParams<TParamsSchema>;
}

function parseBody<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (parsed.success) {
    return parsed.data;
  } else {
    throw new ZodHttpBadRequestError(parsed.error);
  }
}
