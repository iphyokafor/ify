import type { User } from "@ify/shared";

/**
 * True if any user is at least twice as old as any other.
 *
 * Only the max and min ages matter — if max >= 2 * min, the condition holds.
 * O(n) time, O(1) space.
 */
export const atLeastTwice = (users: User[]): boolean => {
  if (users.length < 2) return false;

  let min = Infinity;
  let max = -Infinity;

  for (const { age } of users) {
    if (age < min) min = age;
    if (age > max) max = age;
  }

  return max >= 2 * min;
};

/**
 * True if any user is exactly twice as old as another.
 *
 * Collect unique ages into a Set, then check if any age's double exists.
 * Set lookups are O(1), so the whole function is O(n).
 */
export const exactlyTwice = (users: User[]): boolean => {
  if (users.length < 2) return false;

  const ages = new Set(users.map((u) => u.age));

  for (const age of ages) {
    if (ages.has(age * 2)) return true;
  }

  return false;
};

/**
 * Same as exactlyTwice, optimized for ages guaranteed to be 18–80.
 *
 * Uses a fixed-size Uint8Array (81 bytes) instead of a hash-based Set.
 * The array fits in L1 cache and lookups are a single indexed read — no hashing.
 * Only checks ages 18–40 since anything above 40 doubled exceeds 80.
 * O(n) to populate + O(23) to scan = O(n) with very low constants.
 */
export const constrainedExactlyTwice = (users: User[]): boolean => {
  if (users.length < 2) return false;

  const present = new Uint8Array(81);

  for (const { age } of users) {
    present[age] = 1;
  }

  for (let age = 18; age <= 40; age++) {
    if (present[age] && present[age * 2]) return true;
  }

  return false;
};
