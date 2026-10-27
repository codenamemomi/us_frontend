"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AlertCircle, ArrowRight, Heart } from "lucide-react";
import { toast } from "sonner";
import {
  browserApiClient,
  getErrorMessage,
  getFieldErrors,
} from "@/lib/browser-api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearErrors = (field?: "email" | "password") => {
    setGeneralError(null);
    if (field) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    } else {
      setFieldErrors({});
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    clearErrors();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setFieldErrors({ email: "Email is required" });
      return;
    }
    if (!password) {
      setFieldErrors({ password: "Password is required" });
      return;
    }
    if (password.length > 128) {
      setFieldErrors({ password: "Password cannot exceed 128 characters" });
      return;
    }

    setLoading(true);
    try {
      const result = await browserApiClient.post<{ access_token: string }>(
        "/auth/login",
        { email: trimmedEmail, password },
      );

      // Store auth cookie for 1 hour
      document.cookie = `access_token=${encodeURIComponent(
        result.access_token,
      )}; Path=/; Max-Age=3600; SameSite=Lax`;

      toast.success("Welcome back!");
      window.location.href = "/";
    } catch (error) {
      const message = getErrorMessage(error);
      const errors = getFieldErrors(error);
      setGeneralError(message);
      setFieldErrors(errors);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="aurora flex min-h-screen items-center justify-center px-5 py-8 text-white">
      <div className="w-full max-w-md">
        <Link href="/" className="font-display text-xl font-bold">
          us<span className="text-[var(--a)]">.</span>
        </Link>
        <section className="glass mt-12 p-7 sm:p-9">
          <Heart className="text-[var(--a)]" fill="currentColor" />
          <p className="eyebrow mt-10">welcome back</p>
          <h1 className="font-display mt-3 text-5xl font-bold leading-none tracking-[-.05em]">
            Come back to us.
          </h1>
          <p className="mt-4 text-sm text-white/50">Your little universe is waiting.</p>

          {generalError && (
            <div className="error-banner" role="alert">
              <AlertCircle size={18} className="shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          <form onSubmit={submit} className="mt-9 space-y-4" noValidate>
            <label className={`field ${fieldErrors.email ? "has-error" : ""}`}>
              Email
              <input
                required
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  clearErrors("email");
                }}
                placeholder="you@example.com"
                autoComplete="email"
              />
              {fieldErrors.email && (
                <span className="field-error">{fieldErrors.email}</span>
              )}
            </label>

            <label className={`field ${fieldErrors.password ? "has-error" : ""}`}>
              Password
              <input
                required
                type="password"
                maxLength={128}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  clearErrors("password");
                }}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              {fieldErrors.password && (
                <span className="field-error">{fieldErrors.password}</span>
              )}
            </label>

            <button
              type="submit"
              disabled={loading}
              className="button-primary mt-3 w-full justify-center"
            >
              {loading ? "Signing in..." : "Sign in"}{" "}
              <ArrowRight size={16} />
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-white/45">
            Have an invite code?{" "}
            <Link href="/invite" className="font-semibold text-[var(--a)]">
              Join your person
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
