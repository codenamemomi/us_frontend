"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Brain, Gamepad2, HelpCircle, Smile } from "lucide-react";
import { toast } from "sonner";
import { browserApiClient, getErrorMessage } from "@/lib/browser-api";
import { GlassCard, PageFrame, PageTitle } from "@/app/components/page-frame";
import { useCoupleProfile } from "@/lib/use-couple-profile";
import { useLive } from "@/lib/use-live";
import Link from "next/link";

const GAMES = [
  {
    id: "would_you_rather",
    icon: HelpCircle,
    iconClass: "text-[var(--a)]",
    title: "Would you rather",
    blurb: "Secret picks. Dramatic reveal.",
    hint: "Best of 5 rounds",
    comingSoon: false,
  },
  {
    id: "guess_my_answer",
    icon: Brain,
    iconClass: "text-[var(--b)]",
    title: "Guess my answer",
    blurb: "How well do you know their brain?",
    hint: "Takes ~3 min",
    comingSoon: true,
  },
  {
    id: "two_truths",
    icon: Smile,
    iconClass: "text-[#aaff00]",
    title: "Two truths & a lie",
    blurb: "A little mischief, no scoreboard.",
    hint: "No time limit",
    comingSoon: true,
  },
];

export default function PlayPage() {
  const router = useRouter();
  const { partnerFirst } = useCoupleProfile();
  const [activeGame, setActiveGame] = useState<{ id: string; game_type: string } | null>(null);
  const [starting, setStarting] = useState(false);

  const gameId = activeGame?.id ?? null;

  // ── check for existing active game session on mount ─────────────────────────
  useEffect(() => {
    browserApiClient
      .get<{ active_game: { id: string; game_type: string } | null }>("/games/active")
      .then((res) => {
        if (res?.active_game?.id) {
          setActiveGame({ id: res.active_game.id, game_type: res.active_game.game_type });
        } else {
          setActiveGame(null);
        }
      })
      .catch(() => {
        setActiveGame(null);
      });
  }, []);

  // ── listen for real-time game lobby from partner ─────────────────────────────
  useLive((e) => {
    if (e.type === "game_ended") {
      // Session was explicitly ended — clear the banner
      setActiveGame(null);
    } else if (e.type === "game_started") {
      if (e.game_id) {
        setActiveGame({ id: String(e.game_id), game_type: e.game_type || "would_you_rather" });
        toast.success(`🎮 ${partnerFirst} started a game!`, {
          description: "Tap to join the round together in sync.",
          action: {
            label: "Join Game",
            onClick: () => router.push(`/play/${e.game_id}`),
          },
          duration: 8000,
        });
      }
    } else if (e.type === "game_updated") {
      // Only keep the active-game banner alive if the session is still active
      if (e.game_id && e.status && e.status !== "done" && e.status !== "cancelled") {
        setActiveGame((prev) =>
          prev && prev.id === String(e.game_id)
            ? prev
            : { id: String(e.game_id), game_type: e.game_type || "would_you_rather" }
        );
      } else if (e.status === "done" || e.status === "cancelled") {
        setActiveGame(null);
      }
    }
  });

  const startGame = async (gameType: string) => {
    setStarting(true);
    try {
      const game = await browserApiClient.post<{ id: string; game_type: string }>("/games", { game_type: gameType });
      setActiveGame({ id: game.id, game_type: gameType });
      toast.success("Game lobby connected!");
      router.push(`/play/${game.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setStarting(false);
    }
  };

  return (
    <PageFrame active="play">
      <PageTitle
        eyebrow="play together"
        title="Tiny games, big opinions."
        copy="Pick something low-stakes and find out how synced you really are."
      />

      {gameId && (
        <GlassCard className="mb-6 border border-[var(--a)]/40 bg-[color-mix(in_srgb,var(--a),transparent_88%)] shadow-[0_0_30px_-5px_rgba(255,0,128,0.25)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--a)]/20">
                <Gamepad2 className="text-[var(--a)]" size={22} />
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--a)] opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--a)]" />
                </span>
              </div>
              <div>
                <p className="eyebrow text-[var(--a)] font-bold">active game session</p>
                <p className="font-display text-sm font-bold">
                  {GAMES.find((g) => g.id === activeGame?.game_type)?.title ?? "Game"} is currently open with {partnerFirst}.
                </p>
              </div>
            </div>
            <Link href={`/play/${gameId}`} className="button-primary text-xs py-2 px-5">
              Join game together <ArrowRight size={14} />
            </Link>
          </div>
        </GlassCard>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {GAMES.map(({ id, icon: Icon, iconClass, title, blurb, hint, comingSoon }) => {
          const isThisGameActive = Boolean(activeGame && activeGame.game_type === id);
          return (
            <GlassCard
              key={id}
              className={`flex flex-col justify-between transition-all ${comingSoon
                  ? "opacity-60 saturate-75 select-none"
                  : isThisGameActive
                    ? "border-[var(--a)]/50 shadow-[0_0_20px_-5px_rgba(255,0,128,0.2)]"
                    : ""
                }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`${iconClass} flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white/[.07]`}>
                      <Icon size={18} />
                    </span>
                    <div>
                      <h2 className="font-display text-lg font-bold leading-tight">{title}</h2>
                      <p className="text-xs text-white/40">{hint}</p>
                    </div>
                  </div>
                  {comingSoon ? (
                    <span className="rounded-full bg-white/10 border border-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/50">
                      Coming soon
                    </span>
                  ) : isThisGameActive ? (
                    <span className="rounded-full bg-[var(--a)]/20 border border-[var(--a)]/40 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--a)]">
                      Active
                    </span>
                  ) : null}
                </div>
                <p className="mt-4 text-sm text-white/55">{blurb}</p>
              </div>

              {comingSoon ? (
                <button
                  type="button"
                  disabled
                  className="mt-6 self-start text-xs py-2 px-3.5 rounded-xl border border-white/10 bg-white/[.04] font-bold text-white/40 cursor-not-allowed"
                >
                  Coming soon
                </button>
              ) : isThisGameActive ? (
                <Link
                  href={`/play/${gameId}`}
                  className="button-primary mt-6 self-start text-xs py-2.5 px-4"
                >
                  Join {partnerFirst} <ArrowRight size={14} />
                </Link>
              ) : (
                <button
                  disabled={starting}
                  onClick={() => startGame(id)}
                  className="button-primary mt-6 self-start text-xs py-2.5 px-4"
                >
                  Start game <ArrowRight size={14} />
                </button>
              )}
            </GlassCard>
          );
        })}
      </div>
    </PageFrame>
  );
}
