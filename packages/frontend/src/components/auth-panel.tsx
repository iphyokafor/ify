"use client";

import { useState } from "react";
import { Logotype } from "./logo";
import { apiUrl } from "@/lib/api";

type AuthMode = "login" | "register";

type AuthenticatedUser = {
  username: string;
  firstName: string;
  token: string;
};

type AuthPanelProps = {
  onAuthenticated: (user: AuthenticatedUser) => void;
};

type AuthResponse = {
  username: string;
  firstName: string;
  token: string;
  error?: string;
};

const AUTH_FAILED_ERROR = "Authentication failed";
const NETWORK_ERROR = "Cannot reach the server. Please try again.";
const MISSING_CREDENTIALS_ERROR = "Username and password are required";

const submitButtonLabel = (mode: AuthMode) =>
  mode === "login" ? "Log in" : "Create account";

const switchModeLabel = (mode: AuthMode) =>
  mode === "login"
    ? "Need an account? Register"
    : "Already have an account? Log in";

const postAuth = async (path: string, body: object): Promise<AuthenticatedUser> => {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await res.json().catch(() => null)) as AuthResponse | null;

  if (!res.ok || !payload) {
    throw new Error(payload?.error || AUTH_FAILED_ERROR);
  }

  return {
    username: payload.username,
    firstName: payload.firstName,
    token: payload.token,
  };
};

export const AuthPanel = ({ onAuthenticated }: Readonly<AuthPanelProps>) => {
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("bob");
  const [password, setPassword] = useState("password123");
  const [email, setEmail] = useState("bob@example.com");
  const [firstName, setFirstName] = useState("Bob");
  const [lastName, setLastName] = useState("Smith");
  const [age, setAge] = useState("28");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitLabel = submitButtonLabel(mode);
  const switchLabel = switchModeLabel(mode);

  const handleSubmit = async (): Promise<void> => {
    if (!username.trim() || !password) {
      setError(MISSING_CREDENTIALS_ERROR);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const user = mode === "login"
        ? await postAuth("/api/auth/login", { username, password })
        : await postAuth("/api/auth/register", {
            username,
            password,
            email,
            firstName,
            lastName,
            age: Number(age),
          });

      onAuthenticated(user);
    } catch (e) {
      const message = e instanceof Error ? e.message : AUTH_FAILED_ERROR;
      setError(message.toLowerCase().includes("failed to fetch") ? NETWORK_ERROR : message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="surface-card rounded-2xl p-6 sm:p-8">
      <Logotype className="text-3xl" />
      <h1 className="mt-2 text-base text-slate-400">
        {mode === "login" ? "Welcome back." : "Create your account."}
      </h1>

      <div className="mt-6 inline-flex rounded-full border border-white/10 bg-white/5 p-1 text-sm">
        <button
          onClick={() => {
            setMode("login");
            setError(null);
          }}
          className={`mode-pill ${mode === "login" ? "mode-pill--active" : "mode-pill--idle"}`}
        >
          Log in
        </button>
        <button
          onClick={() => {
            setMode("register");
            setError(null);
          }}
          className={`mode-pill ${mode === "register" ? "mode-pill--active" : "mode-pill--idle"}`}
        >
          Register
        </button>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="username" className="field-label">
            Username
          </label>
          <input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
            className="field-input"
          />
        </div>

        <div>
          <label htmlFor="password" className="field-label">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="field-input"
          />
        </div>

        {mode === "register" ? (
          <>
            <div>
              <label htmlFor="email" className="field-label">
                Email
              </label>
              <input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="field-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="firstName" className="field-label">
                  First name
                </label>
                <input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  className="field-input"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="field-label">
                  Last name
                </label>
                <input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  className="field-input"
                />
              </div>
            </div>

            <div>
              <label htmlFor="age" className="field-label">
                Age
              </label>
              <input
                id="age"
                type="number"
                min={18}
                max={80}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="18-80"
                className="field-input"
              />
            </div>
          </>
        ) : null}
      </div>

      {error ? <p className="mt-3 text-sm text-rose-400">{error}</p> : null}

      <button
        onClick={() => void handleSubmit()}
        disabled={isSubmitting}
        className="primary-btn mt-5 w-full px-4 py-2.5 font-semibold"
      >
        {isSubmitting ? "Please wait..." : submitLabel}
      </button>

      <button
        onClick={() => {
          setMode(mode === "login" ? "register" : "login");
          setError(null);
        }}
        className="subtle-link mt-3 w-full"
      >
        {switchLabel}
      </button>

      {mode === "login" ? (
        <p className="mt-5 rounded-xl bg-violet-500/10 px-3 py-2 text-xs text-violet-200">
          Demo account: bob / password123
        </p>
      ) : null}
    </section>
  );
};
