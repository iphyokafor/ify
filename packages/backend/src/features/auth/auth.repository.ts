import { sql } from "../../db/connection";
import type { AuthRepository, UserAuthRecord } from "./auth.domain";

export const authRepository: AuthRepository = {
  async findByUsername(username) {
    const [row] = await sql`
      SELECT id, username, password_hash, email, first_name, last_name, age, created_at
      FROM users
      WHERE username = ${username}
    `;

    return (row as UserAuthRecord | undefined) ?? null;
  },

  async createUser(input) {
    const [row] = await sql`
      INSERT INTO users (username, email, password_hash, first_name, last_name, age)
      VALUES (${input.username}, ${input.email}, ${input.passwordHash},
              ${input.firstName}, ${input.lastName}, ${input.age})
      RETURNING id, username, password_hash, email, first_name, last_name, age, created_at
    `;

    return row as UserAuthRecord;
  },
};
