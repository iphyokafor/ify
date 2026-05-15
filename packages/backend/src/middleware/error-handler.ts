import type { ErrorHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { isAppError } from "../errors/app-error";
import type { RequestContext } from "./request-id";

const INTERNAL_ERROR_CODE = "INTERNAL_ERROR";
const INTERNAL_ERROR_MESSAGE = "Internal server error";

export const errorHandler: ErrorHandler<{ Variables: RequestContext }> = (err, c) => {
  const requestId = c.get("requestId");

  if (isAppError(err)) {
    console.error(JSON.stringify({
      level: "warn",
      requestId,
      code: err.code,
      status: err.status,
      message: err.message,
    }));

    return c.json(
      { error: err.message, code: err.code, requestId },
      err.status as ContentfulStatusCode,
    );
  }

  console.error(JSON.stringify({
    level: "error",
    requestId,
    message: err.message,
    stack: err.stack,
  }));

  return c.json(
    { error: INTERNAL_ERROR_MESSAGE, code: INTERNAL_ERROR_CODE, requestId },
    500,
  );
};
