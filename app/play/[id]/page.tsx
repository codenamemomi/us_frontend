"use client";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { ArrowLeft, ArrowRight, Check, Flame, Heart, Loader2, RotateCcw, Sparkles, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PageFrame } from "@/app/components/page-frame";
import { browserApiClient, getErrorMessage } from "@/lib/browser-api";
import { useCoupleProfile } from "@/lib/use-couple-profile";
import { useLive } from "@/lib/use-live";
import Link from "next/link";

interface QuestionData {
  id: string;
  text: string;
  option_a: string;
  option_b: string;
}

interface RoundView {
  q: QuestionData;
  my_pick: string | null;
  partner_picked: boolean;
  partner_pick: string | null;
  both_picked: boolean;
  matched: boolean;
}

interface GameState {
  type: string;
  rounds: RoundView[];
  current: number;
  matches: number;
  total_rounds: number;
  is_done: boolean;
}

interface GameResponse {
  id: string;
  game_type: string;
  state: GameState;
  status: string;
}

function GameRoomSkeleton() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/play"
          className="flex items-center gap-1.5 text-xs font-bold text-white/60 hover:text-white"
        >
          <ArrowLeft size={14} /> Back to games
        </Link>
        <div className="flex items-center gap-2">
          <span className="eyebrow">Round</span>
          <span className="h-6 w-14 animate-pulse rounded-full bg-white/10" />
        </div>
      </div>
      <div className="glass flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
        <Loader2 className="animate-spin text-[var(--a)]" size={32} />
        <p className="mt-4 font-display text-base font-semibold text-white/70">
          Loading lobby…
        </p>
      </div>
    </div>
  );
}

function GameRoomContent() {
  const params = useParams();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { partnerFirst } = useCoupleProfile();

  const [game, setGame] = useState<GameResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [startingNew, setStartingNew] = useState(false);
  const [hasCelebratedMatch, setHasCelebratedMatch] = useState<number | null>(null);

  const handlePlayAgain = async () => {
    setStartingNew(true);
    try {
      const newGame = await browserApiClient.post<{ id: string }>("/games", {
        game_type: game?.game_type || "would_you_rather",
      });
      router.push(`/play/${newGame.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
      router.push("/play");
    } finally {
      setStartingNew(false);
    }
  };

  // ── fetch game state ─────────────────────────────────────────────────────────
  const fetchGame = useCallback(async () => {
    if (!id) return;
    try {
      const data = await browserApiClient.get<GameResponse>(`/games/${id}`);
      setGame(data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchGame();
  }, [fetchGame]);

  // ── 8-second safety fallback poll ───────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(fetchGame, 8000);
    return () => clearInterval(t);
  }, [fetchGame]);

  // ── end session ─────────────────────────────────────────────────────────────
  const endSession = async () => {
    if (!id || ending) return;
    const confirmed = window.confirm("End this game session for both of you?");
    if (!confirmed) return;
    setEnding(true);
    try {
      await browserApiClient.delete(`/games/${id}`);
      toast.success("Session ended.");
      router.push("/play");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setEnding(false);
    }
  };

  // ── real-time SSE listener ──────────────────────────────────────────────────
  useLive((e) => {
    if (e.type === "game_updated" && String(e.game_id) === String(id)) {
      fetchGame();
    } else if (e.type === "game_ended" && String(e.game_id) === String(id)) {
      toast.info(`Session ended.`);
      router.push("/play");
    }
  });

  // ── trigger confetti on match ───────────────────────────────────────────────
  useEffect(() => {
    if (!game) return;
    const currentRound = game.state.rounds?.[game.state.current];
    if (
      currentRound?.matched &&
      hasCelebratedMatch !== game.state.current
    ) {
      setHasCelebratedMatch(game.state.current);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#ff007f", "#ff5500", "#00ff66", "#8b5cf6"],
      });
    }
  }, [game, hasCelebratedMatch]);

  // ── submit move ─────────────────────────────────────────────────────────────
  const handlePick = async (choice: "a" | "b") => {
    if (!id || submitting) return;
    setSubmitting(true);
    try {
      navigator.vibrate?.(25);
      const updated = await browserApiClient.post<GameResponse>(`/games/${id}/move`, {
        choice,
      });
      setGame(updated);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (!id || submitting) return;
    setSubmitting(true);
    try {
      const updated = await browserApiClient.post<GameResponse>(`/games/${id}/move`, {
        action: "next",
      });
      setGame(updated);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const currentIdx = game?.state?.current ?? 0;
  const currentRound = game?.state?.rounds?.[currentIdx];
  const totalRounds = game?.state?.total_rounds ?? 5;
  const isDone = game?.state?.is_done ?? false;
  const matches = game?.state?.matches ?? 0;
  const syncPercent = totalRounds > 0 ? Math.round((matches / totalRounds) * 100) : 0;

  if (loading) {
    return <GameRoomSkeleton />;
  }

  if (isDone) {
    return (
      <div>
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/play"
            className="flex items-center gap-1.5 text-xs font-bold text-white/60 hover:text-white"
          >
            <ArrowLeft size={14} /> Back to games
          </Link>
          <div className="flex items-center gap-2">
            <span className="eyebrow">Round</span>
            <span className="rounded-full bg-white/10 px-3 py-1 font-display text-xs font-black">
              {totalRounds} / {totalRounds}
            </span>
          </div>
        </div>

        <motion.article
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass glow p-8 text-center"
        >
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-tr from-[var(--a)] to-[var(--b)] text-white shadow-[0_0_30px_var(--a)]">
            <Flame size={32} />
          </span>
          <p className="eyebrow mt-6">game complete</p>
          <h2 className="font-display mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            {syncPercent}% in sync
          </h2>
          <p className="mt-2 text-sm text-white/60">
            You matched <strong className="text-white">{matches}</strong> of {totalRounds} questions with {partnerFirst}!
          </p>

          <div className="my-6 flex justify-center gap-2">
            {game?.state?.rounds.map((rnd, i) => (
              <div
                key={i}
                className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold ${
                  rnd.matched
                    ? "border border-emerald-400/40 bg-emerald-500/20 text-emerald-300"
                    : "border border-white/15 bg-white/5 text-white/50"
                }`}
              >
                {rnd.matched ? "✓" : "×"}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={handlePlayAgain}
              disabled={startingNew}
              className="button-primary"
            >
              <RotateCcw size={15} /> {startingNew ? "Starting new round…" : "Play again"}
            </button>
            <Link
              href="/play"
              className="flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[.06] px-5 py-2.5 text-sm font-bold text-white/70 hover:bg-white/10 hover:text-white transition-all"
            >
              <ArrowLeft size={15} /> All games
            </Link>
          </div>
        </motion.article>
      </div>
    );
  }

  if (!currentRound) return null;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/play"
          className="flex items-center gap-1.5 text-xs font-bold text-white/60 hover:text-white"
        >
          <ArrowLeft size={14} /> Back to games
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="eyebrow">Round</span>
            <span className="rounded-full bg-white/10 px-3 py-1 font-display text-xs font-black">
              {Math.min(currentIdx + 1, totalRounds)} / {totalRounds}
            </span>
          </div>
          <button
            onClick={endSession}
            disabled={ending}
            title="End session"
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[.05] px-3 py-1.5 text-[11px] font-bold text-white/50 hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-300 transition-all disabled:opacity-40"
          >
            <XCircle size={13} />
            {ending ? "Ending…" : "End session"}
          </button>
        </div>
      </div>

      <div className="space-y-5">
        {/* Question card */}
        <motion.article
          key={currentIdx}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-6 sm:p-8"
        >
          <div className="flex items-center justify-between">
            <p className="eyebrow">would you rather</p>
            <Sparkles size={16} className="text-[var(--a)]" />
          </div>

          <h1 className="font-display mt-4 text-2xl font-bold leading-snug tracking-tight sm:text-3xl">
            {currentRound.q.text}
          </h1>

          {currentRound.both_picked && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`mt-5 flex items-center justify-center gap-2 rounded-2xl p-3 text-xs font-bold ${
                currentRound.matched
                  ? "border border-emerald-400/40 bg-emerald-500/15 text-emerald-300 shadow-[0_0_20px_-5px_#10b981]"
                  : "border border-amber-400/30 bg-amber-500/15 text-amber-200"
              }`}
            >
              {currentRound.matched ? (
                <>
                  <Sparkles size={14} /> You both picked the same thing!
                </>
              ) : (
                <>
                  ⚡ Split decision! Agree to disagree.
                </>
              )}
            </motion.div>
          )}
        </motion.article>

        {/* ── A / B TILES ── */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Option A Tile */}
          <motion.button
            whileHover={!currentRound.my_pick ? { scale: 1.02 } : {}}
            whileTap={!currentRound.my_pick ? { scale: 0.97 } : {}}
            disabled={Boolean(currentRound.my_pick) || submitting}
            onClick={() => handlePick("a")}
          className={`glass relative flex min-h-[80px] flex-col justify-between p-3 text-left transition-all ${
              currentRound.my_pick === "a"
                ? "border-2 border-[var(--a)] bg-[color-mix(in_srgb,var(--a),transparent_80%)] shadow-[0_0_30px_color-mix(in_srgb,var(--a),transparent_65%)]"
                : currentRound.my_pick
                ? "opacity-50"
                : "hover:border-white/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/10 font-display text-[10px] font-black text-white">
                A
              </span>
              {currentRound.my_pick === "a" && (
                <span className="flex items-center gap-1 rounded-full bg-[var(--a)] px-2.5 py-0.5 text-[10px] font-black uppercase text-white shadow-sm">
                  <Check size={10} /> You
                </span>
              )}
            </div>

            <p className="mt-2 font-display text-sm font-bold leading-snug">
              {currentRound.q.option_a}
            </p>

            {currentRound.both_picked && currentRound.partner_pick === "a" && (
              <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-[var(--b)]">
                <Heart size={12} className="fill-[var(--b)]" /> {partnerFirst} picked this
              </div>
            )}
          </motion.button>

          {/* Option B Tile */}
          <motion.button
            whileHover={!currentRound.my_pick ? { scale: 1.02 } : {}}
            whileTap={!currentRound.my_pick ? { scale: 0.97 } : {}}
            disabled={Boolean(currentRound.my_pick) || submitting}
            onClick={() => handlePick("b")}
          className={`glass relative flex min-h-[80px] flex-col justify-between p-3 text-left transition-all ${
              currentRound.my_pick === "b"
                ? "border-2 border-[var(--b)] bg-[color-mix(in_srgb,var(--b),transparent_80%)] shadow-[0_0_30px_color-mix(in_srgb,var(--b),transparent_65%)]"
                : currentRound.my_pick
                ? "opacity-50"
                : "hover:border-white/30"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/10 font-display text-[10px] font-black text-white">
                B
              </span>
              {currentRound.my_pick === "b" && (
                <span className="flex items-center gap-1 rounded-full bg-[var(--b)] px-2.5 py-0.5 text-[10px] font-black uppercase text-white shadow-sm">
                  <Check size={10} /> You
                </span>
              )}
            </div>

            <p className="mt-2 font-display text-sm font-bold leading-snug">
              {currentRound.q.option_b}
            </p>

            {currentRound.both_picked && currentRound.partner_pick === "b" && (
              <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-[var(--b)]">
                <Heart size={12} className="fill-[var(--b)]" /> {partnerFirst} picked this
              </div>
            )}
          </motion.button>
        </div>

        {/* ── WAITING / NEXT ACTION BAR ── */}
        {currentRound.my_pick && !currentRound.both_picked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass flex items-center justify-between p-5"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex h-8 w-8 items-center justify-center">
                <span className="absolute h-8 w-8 animate-ping rounded-full bg-[var(--a)]/30" />
                <span className="h-3 w-3 rounded-full bg-[var(--a)] shadow-[0_0_12px_var(--a)]" />
              </div>
              <div>
                <p className="text-sm font-bold">Pick locked in!</p>
                <p className="text-xs text-white/50">
                  Waiting for {partnerFirst} to decide…
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-white/40">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/60" />
              <span>live</span>
            </div>
          </motion.div>
        )}

        {currentRound.both_picked && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-end pt-2"
          >
            <button
              onClick={handleNext}
              disabled={submitting}
              className="button-primary"
            >
              {currentIdx < totalRounds - 1 ? "Next round" : "See summary"} <ArrowRight size={15} />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default function GameRoomPage() {
  return (
    <PageFrame active="play">
      <div className="mx-auto max-w-xl pb-12 pt-4">
        <Suspense fallback={<GameRoomSkeleton />}>
          <GameRoomContent />
        </Suspense>
      </div>
    </PageFrame>
  );
}
