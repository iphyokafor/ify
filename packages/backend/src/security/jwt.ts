import { SignJWT, jwtVerify } from "jose";
import { env } from "../config/env";

const ALGORITHM = "HS256";

const secret = (): Uint8Array => new TextEncoder().encode(env.JWT_SECRET);

export type AccessTokenClaims = {
  sub: string;
  username: string;
  firstName: string;
};

export const issueAccessToken = async (claims: AccessTokenClaims): Promise<string> => {
  return await new SignJWT({
    username: claims.username,
    firstName: claims.firstName,
  })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(claims.sub)
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRATION)
    .sign(secret());
};

export const verifyAccessToken = async (token: string): Promise<AccessTokenClaims | null> => {
  try {
    const { payload } = await jwtVerify(token, secret(), {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      algorithms: [ALGORITHM],
    });

    if (
      typeof payload.sub !== "string" ||
      typeof payload.username !== "string" ||
      typeof payload.firstName !== "string"
    ) {
      return null;
    }

    return {
      sub: payload.sub,
      username: payload.username,
      firstName: payload.firstName,
    };
  } catch {
    return null;
  }
};

export const extractBearerToken = (header: string | undefined): string | null => {
  if (!header) return null;

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;

  return token;
};
