import { describe, expect, it } from "bun:test";
import {
  atLeastTwice,
  exactlyTwice,
  constrainedExactlyTwice,
} from "./age-checks";
import type { User } from "@ify/shared";

const makeUser = (id: number, age: number): User => {
  return {
    id: String(id),
    username: `user${id}`,
    email: `user${id}@example.com`,
    firstName: `User${id}`,
    lastName: "Test",
    age,
    createdAt: new Date().toISOString(),
  };
};

describe("age checks", () => {
  it("returns true for atLeastTwice when max age is at least double min age", () => {
    const users = [makeUser(1, 18), makeUser(2, 37)];

    expect(atLeastTwice(users)).toBe(true);
  });

  it("returns true for exactlyTwice when a double pair exists", () => {
    const users = [makeUser(1, 20), makeUser(2, 40), makeUser(3, 33)];

    expect(exactlyTwice(users)).toBe(true);
  });

  it("returns false for constrainedExactlyTwice when no double pair exists", () => {
    const users = [makeUser(1, 19), makeUser(2, 27), makeUser(3, 31)];

    expect(constrainedExactlyTwice(users)).toBe(false);
  });
});
