import { describe, expect, it, mock } from "bun:test";
import { createAuthService } from "./auth.service";

const makeRepository = () => {
  return {
    findByUsername: mock(async () => null),
    createUser: mock(async () => ({
      id: "user-1",
      username: "bob",
      password_hash: "hashed-password",
      email: "bob@example.com",
      first_name: "Bob",
      last_name: "Smith",
      age: 28,
      created_at: "2026-05-12T00:00:00.000Z",
    })),
  };
};

const makePasswordService = () => {
  return {
    hash: mock(async () => "hashed-password"),
    verify: mock(async () => true),
  };
};

const makeTokenService = () => {
  return {
    issue: mock(async () => "mock-jwt-token"),
  };
};

describe("createAuthService", () => {
  it("registers a user after validation", async () => {
    const repository = makeRepository();
    const password = makePasswordService();
    const token = makeTokenService();
    const service = createAuthService({ repository, password, token });

    const result = await service.register({
      username: " Bob ",
      password: "password123",
      email: " Bob@Example.com ",
      firstName: "Bob",
      lastName: "Smith",
      age: 28,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.username).toBe("bob");
      expect(result.user.email).toBe("bob@example.com");
      expect(result.token).toBe("mock-jwt-token");
    }

    expect(password.hash).toHaveBeenCalledWith("password123");
    expect(repository.createUser).toHaveBeenCalledWith({
      username: "bob",
      email: "bob@example.com",
      passwordHash: "hashed-password",
      firstName: "Bob",
      lastName: "Smith",
      age: 28,
    });
    expect(token.issue).toHaveBeenCalledWith({
      sub: "user-1",
      username: "bob",
      firstName: "Bob",
    });
  });

  it("rejects invalid login credentials", async () => {
    const repository = makeRepository();
    const password = makePasswordService();
    const token = makeTokenService();
    const service = createAuthService({ repository, password, token });

    const result = await service.login({ username: "", password: "" });

    expect(result).toEqual({
      ok: false,
      status: 401,
      error: "Invalid username or password",
    });
    expect(repository.findByUsername).not.toHaveBeenCalled();
    expect(password.verify).not.toHaveBeenCalled();
    expect(token.issue).not.toHaveBeenCalled();
  });
});