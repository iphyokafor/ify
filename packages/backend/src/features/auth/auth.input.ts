import { z } from "zod";
import type { AuthFailure, LoginInput, RegisterInput } from "./auth.domain";

const MAX_USERNAME_LENGTH = 30;
const MIN_PASSWORD_LENGTH = 8;

const USERNAME_ERROR = "Username must be 3-30 characters";
const PASSWORD_ERROR = "Password must be at least 8 characters";
const EMAIL_ERROR = "Email is required";
const NAME_ERROR = "First and last name are required";
const AGE_ERROR = "Age must be between 18 and 80";
const CREDENTIALS_ERROR = "Invalid username or password";

const registerSchema = z.object({
  username: z
    .string({ error: USERNAME_ERROR })
    .trim()
    .toLowerCase()
    .min(3, USERNAME_ERROR)
    .max(MAX_USERNAME_LENGTH, USERNAME_ERROR),
  password: z.string({ error: PASSWORD_ERROR }).min(MIN_PASSWORD_LENGTH, PASSWORD_ERROR),
  email: z
    .string({ error: EMAIL_ERROR })
    .trim()
    .toLowerCase()
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, EMAIL_ERROR),
  firstName: z.string({ error: NAME_ERROR }).trim().min(1, NAME_ERROR),
  lastName: z.string({ error: NAME_ERROR }).trim().min(1, NAME_ERROR),
  age: z
    .number({ error: AGE_ERROR })
    .int(AGE_ERROR)
    .min(18, AGE_ERROR)
    .max(80, AGE_ERROR),
});

const loginSchema = z.object({
  username: z.string({ error: CREDENTIALS_ERROR }).trim().toLowerCase().min(1, CREDENTIALS_ERROR),
  password: z.string({ error: CREDENTIALS_ERROR }).min(1, CREDENTIALS_ERROR),
});

type NormalizedRegisterInput = z.infer<typeof registerSchema>;
type NormalizedLoginInput = z.infer<typeof loginSchema>;

type ParseResult<T> = { data: T } | { failure: AuthFailure };

export const parseRegisterInput = (input: RegisterInput): ParseResult<NormalizedRegisterInput> => {
  const parsed = registerSchema.safeParse(input);
  if (parsed.success) return { data: parsed.data };

  return {
    failure: {
      ok: false,
      status: 400,
      error: parsed.error.issues[0]?.message ?? USERNAME_ERROR,
    },
  };
};

export const parseLoginInput = (input: LoginInput): ParseResult<NormalizedLoginInput> => {
  const parsed = loginSchema.safeParse(input);
  if (parsed.success) return { data: parsed.data };

  return { failure: invalidCredentials() };
};

export const invalidCredentials = (): AuthFailure => ({
  ok: false,
  status: 401,
  error: CREDENTIALS_ERROR,
});

export const isUniqueConstraintError = (error: unknown): boolean => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "23505"
  );
};
