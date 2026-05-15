export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export const apiUrl = (path: string): URL => new URL(path, API_BASE_URL);

export const authHeader = (token: string): { Authorization: string } => ({
  Authorization: `Bearer ${token}`,
});
