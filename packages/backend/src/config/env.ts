import { z } from "zod";

const DEFAULT_JWT_ISSUER = "ify-api";
const DEFAULT_JWT_AUDIENCE = "ify-web";
const DEFAULT_JWT_EXPIRATION = "7d";
const DEV_JWT_SECRET = "dev-only-secret-change-in-production";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3001),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    JWT_SECRET: z.string().optional(),
    JWT_ISSUER: z.string().default(DEFAULT_JWT_ISSUER),
    JWT_AUDIENCE: z.string().default(DEFAULT_JWT_AUDIENCE),
    JWT_EXPIRATION: z.string().default(DEFAULT_JWT_EXPIRATION),
  })
  .transform((raw) => {
    const jwtSecret = raw.JWT_SECRET || DEV_JWT_SECRET;

    return {
      ...raw,
      JWT_SECRET: jwtSecret,
    };
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === "production" && value.JWT_SECRET === DEV_JWT_SECRET) {
      ctx.addIssue({
        code: "custom",
        path: ["JWT_SECRET"],
        message: "JWT_SECRET is required in production",
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("; ");

  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = parsed.data;
