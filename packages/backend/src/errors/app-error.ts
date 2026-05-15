type AppErrorOptions = {
  status: number;
  code: string;
  message: string;
  cause?: unknown;
};

export class AppError extends Error {
  readonly status: number;
  readonly code: string;

  constructor({ status, code, message, cause }: AppErrorOptions) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    if (cause !== undefined) this.cause = cause;
  }
}

export const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError;
};
