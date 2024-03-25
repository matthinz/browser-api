import { ZodError } from "zod";

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

  toJSON() {
    return {
      code: this.code,
      message: this.message,
    };
  }
}

export class HttpNotFoundError extends HttpStatusError {
  constructor(message = "Not found") {
    super(404, "not_found", message);
  }
}

export class HttpBadRequestError extends HttpStatusError {
  constructor(code = "bad_request", message = "Bad request.") {
    super(400, code, message);
  }
}

export class ZodHttpBadRequestError<T> extends HttpBadRequestError {
  #zodError: ZodError<T>;

  constructor(zodError: ZodError<T>) {
    super();
    this.#zodError = zodError;
  }

  override toJSON() {
    return Object.assign(super.toJSON(), {
      errors: this.#zodError.issues.map((issue) => ({
        code: issue.code,
        path: issue.path,
      })),
    });
  }
}
