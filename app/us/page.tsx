"use client";
import Link from "next/link";
import { Bell, ChevronRight, Copy, LogIn, Moon, Smartphone, Volume2, Settings2 } from "lucide-react";
import { GlassCard, PageFrame, PageTitle } from "@/app/components/page-frame";
import { useCoupleProfile } from "@/lib/use-couple-profile";
import { browserApiClient, getErrorMessage } from "@/lib/browser-api";
import { usePushNotification } from "@/lib/use-push";
import { toast } from "sonner";
import { useEffect, useState, useTransition } from "react";

// ── prefs types ───────────────────────────────────────────────────────────────
interface Prefs {
  email_on_bored: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  muted: boolean;
  muted_until: string | null;
}

// ── tiny toggle ───────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-40 ${checked ? "bg-[var(--a)]" : "bg-white/20"}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function UsPage() {
  const { profile, loading, myFirst, partnerFirst, myInitial, partnerInitial } = useCoupleProfile();
  const { isSupported, isStandalone, isIos, isSubscribed, loading: pushLoading, enablePush, disablePush } = usePushNotification();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // load prefs
  useEffect(() => {
    browserApiClient.get<Prefs>("/me/prefs")
      .then(setPrefs)
      .catch(() => { /* 401 → redirect */ })
      .finally(() => setPrefsLoading(false));
  }, []);

  const updatePrefs = async (patch: Record<string, unknown>) => {
    startTransition(async () => {
      try {
        const updated = await browserApiClient.patch<Prefs>("/me/prefs", patch);
        setPrefs(updated);
        toast.success("Preferences updated");
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    });
  };

  const copyInviteCode = () => {
    if (!profile?.invite_code) return;
    navigator.clipboard.writeText(profile.invite_code).then(() => toast.success("Invite code copied!"));
  };

  const daysLabel = loading ? "Loading…"
    : profile ? `Together for ${profile.days_together} day${profile.days_together === 1 ? "" : "s"}`
    : "Together for — days";

  const nameLabel = loading ? "Loading…" : `${myFirst} + ${partnerFirst}`;

  return (
    <PageFrame active="us">
      <PageTitle
        eyebrow="the two of you"
        title="Make it feel like us."
        copy="Your shared space, your signals, your tiny rituals."
      />

      <div className="grid gap-4 md:grid-cols-2">

        {/* ── couple card ── */}
        <GlassCard>
          <div className="flex items-center gap-4">
            <div className="avatar-pair">
              <span className="avatar-me">{myInitial}</span>
              <span className="avatar-partner">{partnerInitial || "+"}</span>
            </div>
            <div>
              {loading ? (
                <>
                  <div className="h-5 w-32 animate-pulse rounded-lg bg-white/15" />
                  <div className="mt-2 h-4 w-24 animate-pulse rounded-lg bg-white/10" />
                </>
              ) : (
                <>
                  <p className="font-display text-xl font-bold">{nameLabel}</p>
                  <p className="text-sm text-white/45">{daysLabel}</p>
                </>
              )}
            </div>
          </div>

          {/* invite code when partner hasn't joined */}
          {!loading && profile && !profile.partner && (
            <div className="info-banner mt-5 flex items-center justify-between">
              <div>
                <p className="eyebrow">Invite code</p>
                <p className="font-display mt-1 text-2xl font-bold tracking-widest">{profile.invite_code}</p>
              </div>
              <button
                onClick={copyInviteCode}
                className="flex items-center gap-2 rounded-xl border border-white/20 px-3 py-2 text-xs font-semibold hover:bg-white/10"
              >
                <Copy size={13} /> Copy
              </button>
            </div>
          )}

          {/* ── preferences ── */}
          <div className="mt-7">
            <p className="eyebrow mb-2">preferences</p>
            <div className="divide-y divide-white/10">

              {/* lock screen push notifications */}
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <Smartphone size={18} className="text-[var(--a)]" />
                  <div>
                    <strong className="block text-sm">Lock screen push alerts</strong>
                    <small className="text-white/40 block">
                      {isIos && !isStandalone ? (
                        <span className="text-[var(--b)] font-medium">
                          Add to Home Screen first (Share ⎋ → Add to Home Screen)
                        </span>
                      ) : isSubscribed ? (
                        "Active · Signals arrive even when app is closed"
                      ) : (
                        "Receive instant buzzes on your phone"
                      )}
                    </small>
                  </div>
                </div>
                {isIos && !isStandalone ? (
                  <button
                    onClick={() =>
                      toast.info("To enable push on iOS:", {
                        description:
                          "Tap the Share button in Safari, then tap 'Add to Home Screen'. Open US from your Home Screen to turn on push.",
                        duration: 7000,
                      })
                    }
                    className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white/80 hover:bg-white/10"
                  >
                    Install
                  </button>
                ) : (
                  <Toggle
                    checked={isSubscribed}
                    disabled={pushLoading || !isSupported}
                    onChange={(checked) => {
                      if (checked) {
                        enablePush();
                      } else {
                        disablePush();
                      }
                    }}
                  />
                )}
              </div>

              {/* email notifications */}
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <Bell size={18} className="text-[var(--a)]" />
                  <span>
                    <strong className="block text-sm">Bored notifications</strong>
                    <small className="text-white/40">Email when {partnerFirst} pings you</small>
                  </span>
                </div>
                <Toggle
                  checked={prefs?.email_on_bored ?? true}
                  disabled={prefsLoading || isPending}
                  onChange={(v) => updatePrefs({ email_on_bored: v })}
                />
              </div>

              {/* mute */}
              <div className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <Volume2 size={18} className="text-[var(--a)]" />
                  <span>
                    <strong className="block text-sm">Sounds & vibration</strong>
                    <small className="text-white/40">{prefs?.muted ? `Muted until ${new Date(prefs.muted_until!).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "On"}</small>
                  </span>
                </div>
                <Toggle
                  checked={!(prefs?.muted ?? false)}
                  disabled={prefsLoading || isPending}
                  onChange={(v) => updatePrefs(v ? { unmute: true } : { mute_minutes: 480 })}
                />
              </div>

              {/* quiet hours */}
              <div className="py-4">
                <div className="flex items-center gap-3">
                  <Moon size={18} className="text-[var(--a)]" />
                  <span>
                    <strong className="block text-sm">Quiet hours</strong>
                    <small className="text-white/40">
                      {prefs?.quiet_hours_start && prefs?.quiet_hours_end
                        ? `${prefs.quiet_hours_start} – ${prefs.quiet_hours_end}`
                        : "Not set"}
                    </small>
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3 pl-9">
                  <div>
                    <label className="eyebrow">From</label>
                    <input
                      type="time"
                      defaultValue={prefs?.quiet_hours_start ?? ""}
                      disabled={prefsLoading || isPending}
                      onBlur={(e) => { if (e.target.value) updatePrefs({ quiet_hours_start: e.target.value }); }}
                      className="mt-1 block rounded-xl border border-white/15 bg-white/[.07] px-3 py-2 text-sm text-white outline-none focus:border-[var(--a)]"
                    />
                  </div>
                  <div>
                    <label className="eyebrow">Until</label>
                    <input
                      type="time"
                      defaultValue={prefs?.quiet_hours_end ?? ""}
                      disabled={prefsLoading || isPending}
                      onBlur={(e) => { if (e.target.value) updatePrefs({ quiet_hours_end: e.target.value }); }}
                      className="mt-1 block rounded-xl border border-white/15 bg-white/[.07] px-3 py-2 text-sm text-white outline-none focus:border-[var(--a)]"
                    />
                  </div>
                  {(prefs?.quiet_hours_start || prefs?.quiet_hours_end) && (
                    <button
                      className="mt-5 text-xs text-white/35 hover:text-white/60"
                      onClick={() => updatePrefs({ quiet_hours_start: null, quiet_hours_end: null })}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* account link */}
              <Link href="/me" className="flex w-full items-center gap-3 py-4">
                <Settings2 size={18} className="text-[var(--a)]" />
                <span className="flex-1">
                  <strong className="block text-sm">Account & profile</strong>
                  <small className="text-white/40">Name, email, sign out</small>
                </span>
                <ChevronRight size={16} className="text-white/30" />
              </Link>
            </div>
          </div>
        </GlassCard>

        {/* ── partner / invite card ── */}
        <GlassCard>
          <p className="eyebrow">account</p>
          {!loading && profile?.partner ? (
            <>
              <h2 className="font-display mt-10 text-3xl font-bold">{partnerFirst} is with you.</h2>
              <p className="mt-3 text-sm text-white/50">
                Your little universe is complete. {profile.days_together} day{profile.days_together === 1 ? "" : "s"} in.
              </p>
            </>
          ) : (
            <>
              <h2 className="font-display mt-10 text-3xl font-bold">Invite your person.</h2>
              <p className="mt-3 text-sm text-white/50">
                Share your invite code so they can join your shared universe.
              </p>
              {profile?.invite_code && (
                <button onClick={copyInviteCode} className="button-primary mt-6">
                  <Copy size={15} /> Copy invite code
                </button>
              )}
              <p className="mt-4 text-xs text-white/30">
                Or{" "}
                <Link href="/login" className="underline hover:text-white/60">sign in</Link>
                {" "}on their device and enter the code above.
              </p>
            </>
          )}

          {!loading && !profile && (
            <>
              <h2 className="font-display mt-10 text-3xl font-bold">Invite your person.</h2>
              <p className="mt-3 text-sm text-white/50">Sign in to access your shared universe.</p>
              <Link href="/login" className="button-primary mt-6">
                <LogIn size={15} /> Sign in <ChevronRight size={15} />
              </Link>
            </>
          )}
        </GlassCard>
      </div>
    </PageFrame>
  );
}

