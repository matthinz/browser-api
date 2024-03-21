import { Request, Response } from "express";
import { z } from "zod";
import { Logger } from "../logger.js";

type CreateJsonRouteOptions<TParams, TBody, TResult> = {
  bodySchema: z.ZodType<TBody>;
  handler: (params: TParams, body: TBody) => Promise<TResult>;
  logger: Logger;
  paramsSchema: z.ZodType<TParams>;
};

export function createJsonRoute<TParams, TBody, TResult>({
  bodySchema,
  handler,
  logger,
  paramsSchema,
}: CreateJsonRouteOptions<TParams, TBody, TResult>): (
  req: Request,
  res: Response,
) => void {
  return (req, res) => {
    const paramParse = paramsSchema.safeParse(req.params);
    if (!paramParse.success) {
      console.error(JSON.stringify(req.params));
      res.status(400);
      res.json(formatError(paramParse.error));
      return;
    }

    const bodyParse = bodySchema.safeParse(req.body);
    if (!bodyParse.success) {
      console.error(JSON.stringify(req.body));
      res.status(400);
      res.json(formatError(bodyParse.error));
      return;
    }

    handler(paramParse.data, bodyParse.data)
      .then((result) => {
        if (result == null && req.method === "GET") {
          throw new HttpStatusError(404, "not_found", "Not found");
        }

        res.json(result);
      })
      .catch((err) => {
        if (err instanceof HttpStatusError) {
          res.status(err.statusCode);
          res.json({
            errors: [
              {
                code: err.code,
                message: err.message,
              },
            ],
          });
          return;
        }

        logger.debug(err);
        res.status(500);
        res.end();
      });
  };

  function formatError(err: z.ZodError<any>) {
    return {
      errors: err.issues.map((issue) => ({
        code: issue.code,
        field: issue.path,
      })),
    };
  }
}

export class HttpStatusError extends Error {
  #code: string;
  #statusCode: number;
  constructor(statusCode: number, code: string, message: string) {
    super(message);

    this.#statusCode = statusCode;
    this.#code = code;

    Object.setPrototypeOf(this, new.target.prototype);
  }

  get code(): string {
    return this.#code;
  }

  get statusCode(): number {
    return this.#statusCode;
  }
}
