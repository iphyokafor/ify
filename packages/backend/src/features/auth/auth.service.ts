import type {
  AuthResult,
  AuthService,
  AuthServiceDependencies,
  PublicUser,
  UserAuthRecord,
} from "./auth.domain";
import {
  invalidCredentials,
  isUniqueConstraintError,
  parseLoginInput,
  parseRegisterInput,
} from "./auth.input";

const toPublicUser = (row: UserAuthRecord): PublicUser => ({
  id: row.id,
  username: row.username,
  email: row.email,
  firstName: row.first_name,
  lastName: row.last_name,
  age: row.age,
  createdAt: new Date(row.created_at).toISOString(),
});

export const createAuthService = ({ repository, password, token }: AuthServiceDependencies): AuthService => ({
  async register(input) {
    const parsed = parseRegisterInput(input);
    if ("failure" in parsed) return parsed.failure;

    const { username, email, password: rawPassword, firstName, lastName, age } = parsed.data;
    const passwordHash = await password.hash(rawPassword);

    try {
      const user = await repository.createUser({
        username,
        email,
        passwordHash,
        firstName,
        lastName,
        age,
      });

      return await issueResult(user, token);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return { ok: false, status: 409, error: "Username or email already exists" };
      }
      throw error;
    }
  },

  async login(input) {
    const parsed = parseLoginInput(input);
    if ("failure" in parsed) return parsed.failure;

    const { username, password: rawPassword } = parsed.data;
    const user = await repository.findByUsername(username);

    if (!user) return invalidCredentials();

    const valid = await password.verify(rawPassword, user.password_hash);
    if (!valid) return invalidCredentials();

    return await issueResult(user, token);
  },
});

const issueResult = async (
  user: UserAuthRecord,
  token: AuthServiceDependencies["token"],
): Promise<AuthResult> => {
  const publicUser = toPublicUser(user);
  const issued = await token.issue({
    sub: publicUser.id,
    username: publicUser.username,
    firstName: publicUser.firstName,
  });

  return { ok: true, user: publicUser, token: issued };
};
