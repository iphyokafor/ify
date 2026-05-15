export type UserAuthRecord = {
  id: string;
  username: string;
  password_hash: string;
  email: string;
  first_name: string;
  last_name: string;
  age: number;
  created_at: string | Date;
};

export type CreateUserInput = {
  username: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  age: number;
};

export type PublicUser = {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  age: number;
  createdAt: string;
};

export type RegisterInput = {
  username?: unknown;
  password?: unknown;
  email?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  age?: unknown;
};

export type LoginInput = {
  username?: unknown;
  password?: unknown;
};

export type AuthSuccess = {
  ok: true;
  user: PublicUser;
  token: string;
};

export type AuthFailure = {
  ok: false;
  status: 400 | 401 | 409;
  error: string;
};

export type AuthResult = AuthSuccess | AuthFailure;

export type PasswordService = {
  hash: (password: string) => Promise<string>;
  verify: (password: string, passwordHash: string) => Promise<boolean>;
};

export type AuthRepository = {
  findByUsername: (username: string) => Promise<UserAuthRecord | null>;
  createUser: (input: CreateUserInput) => Promise<UserAuthRecord>;
};

export type AuthServiceDependencies = {
  repository: AuthRepository;
  password: PasswordService;
  token: {
    issue: (claims: { sub: string; username: string; firstName: string }) => Promise<string>;
  };
};

export type AuthService = {
  register: (input: RegisterInput) => Promise<AuthResult>;
  login: (input: LoginInput) => Promise<AuthResult>;
};