"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, ChevronDown, Gamepad2, Home, Users } from "lucide-react";
import { useCoupleProfile, Mode } from "@/lib/use-couple-profile";
import { useLive } from "@/lib/use-live";
import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { ModeSheet, MODES } from "@/app/components/mode-sheet";

export function PageFrame({ children, active }: { children: React.ReactNode; active: string }) {
  const { myFirst, partnerFirst, myInitial, partnerInitial, loading, mode, setMode, partnerOnline } = useCoupleProfile();
  const [sheet, setSheet] = useState(false);
  const router = useRouter();

  useLive((e) => {
    if (e.type === "bored_ping") {
      navigator.vibrate?.([40, 60, 40]);
      toast.info(`👀 ${partnerFirst} is bored!`, {
        description: `${partnerFirst} just sent you a signal.`,
      });
    } else if (e.type === "game_started" && active !== "play" && e.game_id) {
      toast.success(`🎮 ${partnerFirst} started Would You Rather!`, {
        description: "Tap to join the game session together.",
        action: {
          label: "Join Game",
          onClick: () => router.push(`/play/${e.game_id}`),
        },
        duration: 8000,
      });
    } else if (e.type === "status_changed" && typeof e.mode === "string") {
      const newMode = e.mode as Mode;
      if ((newMode === "together" || newMode === "on_call" || newMode === "bored") && newMode !== mode) {
        setMode(newMode, false);
        const modeLabel = MODES.find((m) => m.id === newMode)?.label ?? newMode;
        toast.info(`${partnerFirst} switched mode to ${modeLabel}`, { id: "partner-mode" });
      }
    }
  });

  const handleSelectMode = useCallback((next: Mode) => {
    setMode(next);
    setSheet(false);
    toast.success(`${MODES.find((m) => m.id === next)?.label} mode on`, { id: "mode-select" });
  }, [setMode]);

  return (
    <main className="aurora min-h-screen px-5 page-safe-bottom text-white sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">

        {/* ── unified header across all tabs ── */}
        <header className="header-safe-top fixed inset-x-0 top-0 z-20 flex items-center justify-between px-5 sm:px-8 lg:px-12 pb-4 backdrop-blur-xl bg-[#090514]/85 border-b border-white/[0.06]">
          {/* left: logo + mode pill */}
          <div className="flex items-center gap-3">
            <Link href="/" className="font-display text-xl font-bold tracking-tight">
              us<span className="text-[var(--a)]">.</span>
            </Link>
            <button
              type="button"
              className="mode-pill"
              onClick={(e) => {
                e.stopPropagation();
                setSheet(true);
              }}
              aria-expanded={sheet}
            >
              <span className="mode-dot" />
              <span>{MODES.find((m) => m.id === mode)?.label ?? "Together"}</span>
              <ChevronDown size={14} className="opacity-70" />
            </button>
          </div>

          {/* right: names + avatar pair */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="eyebrow flex items-center justify-end gap-1.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    partnerOnline
                      ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                      : "bg-white/30"
                  }`}
                />
                {partnerFirst} {partnerOnline ? "online" : "away"}
              </p>
              {loading ? (
                <div className="mt-1 h-4 w-20 animate-pulse rounded bg-white/15" />
              ) : (
                <p className="font-display text-sm font-semibold">
                  {myFirst} <span className="text-white/30">+</span> {partnerFirst}
                </p>
              )}
            </div>
            <div className="avatar-pair">
              <span className="avatar-me">{myInitial}</span>
              <span className="avatar-partner relative">
                {partnerInitial || "+"}
                <span
                  className={`presence-dot absolute -bottom-0.5 -right-0.5 z-10 h-3 w-3 rounded-full border-2 border-[#090514] ${
                    partnerOnline
                      ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                      : "bg-white/30"
                  }`}
                  title={partnerOnline ? `${partnerFirst} is online` : `${partnerFirst} is away`}
                />
              </span>
            </div>
          </div>
        </header>
        {/* spacer so fixed header doesn't overlap content */}
        <div className="h-[calc(4rem+env(safe-area-inset-top,0px))]" />

        {children}

        {/* ── bottom nav ── */}
        <nav className="nav-bar fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-md rounded-full p-2">
          <Nav href="/"         label="Home"     icon={Home}     active={active === "home"} />
          <Nav href="/play"     label="Play"     icon={Gamepad2} active={active === "play"} />
          <Nav href="/memories" label="Memories" icon={BookOpen} active={active === "memories"} />
          <Nav href="/us"       label="Us"       icon={Users}    active={active === "us"} />
        </nav>
      </div>

        {/* ── mode selector sheet ── */}
        <ModeSheet
          open={sheet}
          onClose={() => setSheet(false)}
          currentMode={mode}
          onSelectMode={handleSelectMode}
        />
      </main>
  );
}

function Nav({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link href={href} className={`nav-item ${active ? "active" : ""}`}>
      {active && (
        <motion.div
          layoutId="nav-pill"
          className="nav-active-pill"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  );
}

export function PageTitle({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <div className="mb-8 mt-12 max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="font-display mt-3 text-4xl font-bold leading-none tracking-[-.04em] sm:text-5xl lg:text-6xl">
        {title}
      </h1>
      <p className="mt-4 text-white/60">{copy}</p>
    </div>
  );
}

export function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <section className={`glass p-6 ${className}`}>{children}</section>;
}
