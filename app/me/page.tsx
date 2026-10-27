"use client";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, ArrowRight, Calendar, Flame, LogOut } from "lucide-react";
import { GlassCard, PageFrame, PageTitle } from "@/app/components/page-frame";
import { AnniversarySection, AnniversarySectionFallback } from "@/app/components/anniversary-section";
import { useCoupleProfile } from "@/lib/use-couple-profile";
import { toast } from "sonner";

export default function MePage() {
  const { profile, loading, myFirst, partnerFirst, myInitial, partnerInitial, updateAnniversary } = useCoupleProfile();

  const logout = () => {
    document.cookie = "access_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Lax";
    toast.success("Signed out");
    setTimeout(() => { window.location.href = "/login"; }, 700);
  };

  return (
    <PageFrame active="me">
        <div className="sticky top-[calc(4.25rem+env(safe-area-inset-top,0px))] z-10 mb-4 py-1.5 w-fit">
          <Link
            href="/us"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#090514]/85 px-3.5 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/15 hover:text-white transition-all backdrop-blur-xl shadow-lg ring-1 ring-white/10"
          >
            <ArrowLeft size={14} /> Back to Us
          </Link>
        </div>

        <PageTitle
          eyebrow="your profile"
          title={loading ? "Loading…" : `Hey, ${myFirst}.`}
          copy="Your account and your little universe."
        />

        <div className="grid gap-4 md:grid-cols-2">
          {/* couple card */}
          <GlassCard>
            <p className="eyebrow">your universe</p>
            <div className="mt-5 flex items-center gap-4">
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
                    <p className="font-display text-xl font-bold">{myFirst} + {partnerFirst}</p>
                    <p className="text-sm text-white/45">
                      {profile?.days_together
                        ? `Together for ${profile.days_together} day${profile.days_together === 1 ? "" : "s"}`
                        : "Just getting started"}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/[.06] p-4">
                <div className="flex items-center gap-2 text-[var(--a)]">
                  <Flame size={16} />
                  <span className="eyebrow">streak</span>
                </div>
                <p className="font-display mt-2 text-3xl font-bold">
                  {loading ? "—" : profile?.streak ?? 1}
                  <span className="ml-1 text-base text-white/40">days</span>
                </p>
              </div>
              <div className="rounded-2xl bg-white/[.06] p-4">
                <div className="flex items-center gap-2 text-[var(--b)]">
                  <Calendar size={16} />
                  <span className="eyebrow">together</span>
                </div>
                <p className="font-display mt-2 text-3xl font-bold">
                  {loading ? "—" : profile?.days_together ?? 1}
                  <span className="ml-1 text-base text-white/40">days</span>
                </p>
              </div>
            </div>

            {/* anniversary / when we started dating */}
            <Suspense fallback={<AnniversarySectionFallback />}>
              <AnniversarySection profile={profile} updateAnniversary={updateAnniversary} />
            </Suspense>
          </GlassCard>

          {/* account card */}
          <GlassCard>
            <p className="eyebrow">account</p>

            {!loading && profile && (
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-white/[.06] px-4 py-3">
                  <p className="text-xs text-white/40">Name</p>
                  <p className="mt-1 font-semibold">{profile.me.name}</p>
                </div>
                <div className="rounded-2xl bg-white/[.06] px-4 py-3">
                  <p className="text-xs text-white/40">Email</p>
                  <p className="mt-1 font-semibold">{profile.me.email}</p>
                </div>
                {!profile.partner && (
                  <div className="info-banner">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/50">Invite code</p>
                    <p className="font-display mt-1 text-2xl font-bold tracking-widest">{profile.invite_code}</p>
                    <p className="mt-1 text-xs text-white/50">Share this with your person so they can join.</p>
                  </div>
                )}
              </div>
            )}

            {!loading && !profile && (
              <div className="mt-8">
                <p className="text-sm text-white/50">You&apos;re not signed in.</p>
                <a href="/login" className="button-primary mt-4">
                  Sign in <ArrowRight size={15} />
                </a>
              </div>
            )}

            {profile && (
              <button
                onClick={logout}
                className="mt-6 flex items-center gap-2 text-sm font-semibold text-white/40 hover:text-white/70"
              >
                <LogOut size={14} /> Sign out
              </button>
            )}
          </GlassCard>
        </div>
      </PageFrame>
  );
}
