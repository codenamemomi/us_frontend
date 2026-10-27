"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, CheckCircle2, Heart, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  browserApiClient,
  getErrorMessage,
  getFieldErrors,
} from "@/lib/browser-api";

export default function InvitePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    invite_code: "",
  });
  const [loading, setLoading] = useState(false);
  const [creatingCouple, setCreatingCouple] = useState(false);
  const [createdInviteCode, setCreatedInviteCode] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setGeneralError(null);
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleCreateCouple = async () => {
    setCreatingCouple(true);
    setGeneralError(null);
    try {
      const res = await browserApiClient.post<{ invite_code: string }>("/couples");
      setCreatedInviteCode(res.invite_code);
      update("invite_code", res.invite_code);
      toast.success("New couple space created!", {
        description: `Invite code ${res.invite_code} generated. Share it with your partner.`,
      });
    } catch (error) {
      const message = getErrorMessage(error);
      setGeneralError(message);
      toast.error("Could not create couple space: " + message);
    } finally {
      setCreatingCouple(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim();
    const trimmedInviteCode = form.invite_code.trim().toUpperCase();

    const errors: Record<string, string> = {};
    if (!trimmedName) {
      errors.name = "Name is required";
    } else if (trimmedName.length > 255) {
      errors.name = "Name cannot exceed 255 characters";
    }

    if (!trimmedEmail) {
      errors.email = "Email is required";
    }

    if (!form.password) {
      errors.password = "Password is required";
    } else if (form.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    } else if (form.password.length > 128) {
      errors.password = "Password cannot exceed 128 characters";
    }

    if (!trimmedInviteCode) {
      errors.invite_code = "Invite code is required";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: trimmedName,
        email: trimmedEmail,
        password: form.password,
        invite_code: trimmedInviteCode,
      };

      const result = await browserApiClient.post<{
        user: { name: string };
        couple_id: string;
      }>("/auth/register", payload);

      toast.success(`Welcome, ${result.user.name}! Your account is ready.`);
      router.push("/login");
    } catch (error) {
      const message = getErrorMessage(error);
      const errorsFromApi = getFieldErrors(error);
      setGeneralError(message);
      setFieldErrors(errorsFromApi);
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
          <p className="eyebrow mt-10">you were invited</p>
          <h1 className="font-display mt-3 text-5xl font-bold leading-none tracking-[-.05em]">
            Join your person.
          </h1>
          <p className="mt-4 text-sm text-white/50">
            One code, then you&apos;re both in.
          </p>

          {createdInviteCode && (
            <div className="info-banner" role="status">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 size={16} className="text-[var(--a)]" />
                <span>Couple Space Created</span>
              </div>
              <p className="mt-1 text-xs text-white/70">
                Your invite code is{" "}
                <strong className="font-mono text-white text-sm tracking-wider">
                  {createdInviteCode}
                </strong>
                . Share this code with your partner so they can join!
              </p>
            </div>
          )}

          {generalError && (
            <div className="error-banner" role="alert">
              <AlertCircle size={18} className="shrink-0" />
              <span>{generalError}</span>
            </div>
          )}

          <form onSubmit={submit} className="mt-9 space-y-4" noValidate>
            <label className={`field ${fieldErrors.name ? "has-error" : ""}`}>
              Your name
              <input
                required
                maxLength={255}
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="What should they call you?"
                autoComplete="name"
              />
              {fieldErrors.name && (
                <span className="field-error">{fieldErrors.name}</span>
              )}
            </label>

            <label className={`field ${fieldErrors.email ? "has-error" : ""}`}>
              Email
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
              {fieldErrors.email && (
                <span className="field-error">{fieldErrors.email}</span>
              )}
            </label>

            <label className={`field ${fieldErrors.password ? "has-error" : ""}`}>
              Password (8 to 128 characters)
              <input
                required
                minLength={8}
                maxLength={128}
                type="password"
                value={form.password}
                onChange={(event) => update("password", event.target.value)}
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
              {fieldErrors.password && (
                <span className="field-error">{fieldErrors.password}</span>
              )}
            </label>

            <label
              className={`field ${fieldErrors.invite_code ? "has-error" : ""}`}
            >
              Invite code
              <input
                required
                maxLength={32}
                value={form.invite_code}
                onChange={(event) =>
                  update("invite_code", event.target.value.toUpperCase())
                }
                placeholder="e.g. ABC12345"
                autoComplete="off"
              />
              {fieldErrors.invite_code && (
                <span className="field-error">{fieldErrors.invite_code}</span>
              )}
            </label>

            <div className="pt-1">
              <button
                type="button"
                onClick={handleCreateCouple}
                disabled={creatingCouple}
                className="flex items-center gap-1.5 text-xs text-[var(--a)] hover:underline opacity-90 transition-opacity"
              >
                <Sparkles size={14} />
                {creatingCouple
                  ? "Generating new code..."
                  : "First one here? Generate a new couple code"}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="button-primary mt-4 w-full justify-center"
            >
              {loading ? "Joining..." : "Join us"}{" "}
              <ArrowRight size={16} />
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-white/45">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-[var(--a)]">
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
