import { hash, verify } from "@node-rs/argon2";
import type { PasswordService } from "../features/auth/auth.domain";

export const argon2PasswordService: PasswordService = {
  hash: (password) => hash(password),
  verify: (password, passwordHash) => verify(passwordHash, password),
};
