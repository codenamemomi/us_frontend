"use client";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bell,
  BookOpen,
  ChevronDown,
  Flame,
  Gamepad2,
  Heart,
  Home as HomeIcon,
  MessageCircle,
  RotateCw,
  Sparkles,
  Users,
} from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { browserApiClient, BrowserApiError, getErrorMessage } from "@/lib/browser-api";
import { useCoupleProfile, Mode } from "@/lib/use-couple-profile";
import { useLive } from "@/lib/use-live";
import { calculateAnniversary } from "@/lib/anniversary";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ModeSheet, MODES } from "@/app/components/mode-sheet";

interface DailyPrompt {
  prompt_id: string;
  date: string;
  question: { id: string; category: string; text: string };
  my_answer: string | null;
  partner_answered: boolean;
  both_answered: boolean;
  partner_answer: string | null;
}



export default function Home() {
  const router = useRouter();
  const {
    profile,
    loading: profileLoading,
    myFirst,
    partnerFirst,
    myInitial,
    partnerInitial,
    mode,
    setMode,
    partnerOnline,
    setPartnerOnline,
    activeGame,
    setActiveGame,
  } = useCoupleProfile();

  const [prompt, setPrompt] = useState<DailyPrompt | null>(null);
  const [topic, setTopic] = useState("Tell me one tiny thing you want to remember from today.");
  const [gameId, setGameId] = useState<string | null>(null);
  const [promptLoading, setPromptLoading] = useState(true);

  const [sheet, setSheet] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [answering, setAnswering] = useState(false);
  const [answerText, setAnswerText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [shufflingTopic, setShufflingTopic] = useState(false);

  // ── fetch active game session on mount ───────────────────────────────────────
  useEffect(() => {
    browserApiClient
      .get<{ active_game: { id: string; game_type: string } | null }>("/games/active")
      .then((res) => {
        if (res?.active_game?.id) {
          setGameId(res.active_game.id);
          setActiveGame(res.active_game as any);
        }
      })
      .catch(() => {});
  }, [setActiveGame]);

  // ── fetch daily prompt ────────────────────────────────────────────────────────
  const loadPrompt = useCallback(async () => {
    setPromptLoading(true);
    try {
      const data = await browserApiClient.get<DailyPrompt>("/daily-prompt");
      setPrompt(data);
    } catch {
      // unauthenticated or offline
    } finally {
      setPromptLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrompt();
  }, [loadPrompt]);

  // ── real-time SSE listener ──────────────────────────────────────────────────
  useLive((event) => {
    if (event.type === "today_updated") {
      loadPrompt();
      toast.info(`${partnerFirst} just answered today's question!`);
    } else if (event.type === "game_ended") {
      setGameId(null);
      setActiveGame(null);
    } else if (event.type === "bored_ping") {
      navigator.vibrate?.([40, 60, 40]);
      toast.info(`👀 ${partnerFirst} is bored!`, {
        description: `${partnerFirst} just sent you a signal.`,
      });
    } else if (event.type === "status_changed" && typeof event.mode === "string") {
      const newMode = event.mode as Mode;
      if ((newMode === "together" || newMode === "on_call" || newMode === "bored") && newMode !== mode) {
        setMode(newMode, false);
        const modeLabel = MODES.find((m) => m.id === newMode)?.label ?? newMode;
        toast.info(`${partnerFirst} switched mode to ${modeLabel}`, { id: "partner-mode" });
      }
    } else if (event.type === "game_started") {
      if (event.game_id) {
        setGameId(String(event.game_id));
        setActiveGame({
          id: String(event.game_id),
          game_type: (event.game_type as string) || "would_you_rather",
          created_by: (event.started_by as string) || "",
        });
      }
      toast.success(`🎮 ${partnerFirst} started Would You Rather!`, {
        description: "Tap to join the game session together.",
        action: {
          label: "Join Game",
          onClick: () => router.push(`/play/${event.game_id}`),
        },
        duration: 8000,
      });
    } else if (event.type === "game_updated") {
      if (event.game_id) setGameId(String(event.game_id));
      toast.info(`${partnerFirst} updated the game!`);
    } else if (event.type === "presence_changed") {
      if (typeof event.partner_online === "boolean") {
        setPartnerOnline(event.partner_online);
      }
    }
  });

  // ── cooldown timer ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!cooldown) return;
    const t = setInterval(() => setCooldown((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  // ── actions ──────────────────────────────────────────────────────────────────
  const ping = async () => {
    if (cooldown) return;
    try {
      await browserApiClient.post<{ ping_id: string }>("/bored");
      setCooldown(900);
      setMode("bored");
      navigator.vibrate?.([30, 50, 30]);
      toast.success("Signal sent", { description: `${partnerFirst} has been buzzed.` });
    } catch (err) {
      if (err instanceof BrowserApiError && err.status === 401) {
        toast.error("Log in to send a signal");
      } else {
        toast.error("Could not send signal right now");
      }
    }
  };

  const handleSelectMode = useCallback((next: Mode) => {
    setSheet(false);
    if (next === mode) return; // no-op: same mode re-selected
    setMode(next);
    toast.success(`${MODES.find((m) => m.id === next)?.label} mode active`, {
      id: "mode-select", // deduplication key — only one toast at a time
    });
  }, [mode, setMode]);

  const loadTopic = async () => {
    setShufflingTopic(true);
    try {
      const qMode = mode === "bored" ? "on_call" : mode;
      const res = await browserApiClient.get<{ text: string }>(`/topics/next?mode=${qMode}`);
      setTopic(res.text);
      toast.success("Fresh topic loaded");
    } catch {
      toast.error("No more unseen topics right now");
    } finally {
      setShufflingTopic(false);
    }
  };

  const startGame = async () => {
    try {
      const res = await browserApiClient.post<{ id: string }>("/games", { game_type: "would_you_rather" });
      setGameId(res.id);
      toast.success("Game lobby created");
    } catch {
      toast.error("Log in to start a game");
    }
  };

  const submitAnswer = async () => {
    if (!answerText.trim()) return;
    setSubmitting(true);
    try {
      const updated = await browserApiClient.post<DailyPrompt>("/daily-prompt/answer", {
        answer: answerText.trim(),
      });
      setPrompt(updated);
      setAnswering(false);
      setAnswerText("");
      navigator.vibrate?.(35);
      toast.success("Your answer is locked in");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  // ── derived values ───────────────────────────────────────────────────────────
  const streak = profile?.streak ?? 1;
  const daysTogether = profile?.days_together ?? 1;
  const anniversaryInfo = calculateAnniversary(profile?.anniversary_date, profile?.created_at);
  const promptText = prompt?.question?.text ?? "What's a moment this year you felt closest to me?";
  const alreadyAnswered = Boolean(prompt?.my_answer);
  const partnerAnswered = Boolean(prompt?.partner_answered);
  const bothAnswered = Boolean(prompt?.both_answered);

  // Single waiting / status label to display next to the button
  const statusLabel = bothAnswered
    ? "✓ Both answered"
    : partnerAnswered
    ? `● ${partnerFirst} answered`
    : alreadyAnswered
    ? `● Waiting for ${partnerFirst}`
    : `Waiting for ${partnerFirst}`;

  return (
    <main className="aurora min-h-screen overflow-x-hidden px-5 page-safe-bottom text-white sm:px-8 lg:px-12">
      <div className="mx-auto max-w-xl">

        {/* ══ HEADER: (o) Together v                   you+her ═══════════════ */}
        <header className="header-safe-top sticky z-20 -mx-5 sm:-mx-8 lg:-mx-12 mb-4 flex items-center justify-between px-5 sm:px-8 lg:px-12 pb-4 backdrop-blur-xl bg-[#090514]/85 border-b border-white/[0.06]">
          {/* left: us. logo + mode pill */}
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

          {/* right: names + glowing avatar pair */}
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
              {profileLoading ? (
                <div className="mt-1 h-4 w-24 animate-pulse rounded bg-white/15" />
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

        {/* ══ ROW 1 — TODAY'S QUESTION (full width card) ═══════════════════════ */}
        <motion.article
          className="glass glow relative mt-7 overflow-hidden p-6 sm:p-8"
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2 }}
        >
          <div className="relative z-10">
            {/* card eyebrow */}
            <div className="flex items-center justify-between">
              <p className="eyebrow">today&apos;s question</p>
              <Sparkles className="shrink-0 text-[var(--a)]" size={18} />
            </div>

            {/* question heading */}
            {promptLoading ? (
              <div className="mt-6 space-y-3 animate-pulse">
                <div className="h-8 w-full rounded-2xl bg-white/10" />
                <div className="h-8 w-3/4 rounded-2xl bg-white/10" />
              </div>
            ) : (
              <h1 className="font-display mt-5 text-2xl font-bold leading-snug tracking-[-0.03em] sm:text-3xl">
                {promptText}
              </h1>
            )}

            {/* answer input form */}
            {answering && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 space-y-3"
              >
                <textarea
                  autoFocus
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder={`Write something honest for ${partnerFirst}…`}
                  maxLength={2000}
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-white/20 bg-white/[.08] p-4 text-sm text-white placeholder-white/30 outline-none focus:border-[var(--a)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--a),transparent_80%)]"
                />
                <div className="flex items-center gap-3">
                  <motion.button
                    className="button-primary"
                    whileTap={{ scale: 0.94 }}
                    onClick={submitAnswer}
                    disabled={submitting || !answerText.trim()}
                  >
                    {submitting ? "Saving…" : "Save answer"} <ArrowRight size={15} />
                  </motion.button>
                  <button
                    className="text-sm font-medium text-white/50 hover:text-white"
                    onClick={() => { setAnswering(false); setAnswerText(""); }}
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}

            {/* action row: [ Answer ]               * waiting */}
            {!answering && !promptLoading && (
              <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
                <motion.button
                  className="button-primary"
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    setAnswering(true);
                    setAnswerText(prompt?.my_answer ?? "");
                  }}
                >
                  {alreadyAnswered ? "Edit answer" : "Answer"} <ArrowRight size={15} />
                </motion.button>

                <div className="flex items-center gap-2 text-xs font-semibold text-white/70">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      bothAnswered
                        ? "bg-emerald-400 shadow-[0_0_8px_#34d399]"
                        : "bg-[var(--a)] shadow-[0_0_8px_var(--a)]"
                    }`}
                  />
                  <span>{statusLabel}</span>
                </div>
              </div>
            )}

            {/* your answer preview (high-contrast, styled card snippet) */}
            {alreadyAnswered && prompt?.my_answer && !answering && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-5 rounded-2xl border border-white/15 bg-white/[.08] p-4 backdrop-blur-md"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-5 items-center rounded-full bg-gradient-to-r from-[var(--a)] to-[var(--b)] px-2.5 text-[10px] font-black uppercase tracking-wider text-white">
                    You
                  </span>
                  <span className="text-xs text-white/50">Your answer</span>
                </div>
                <p className="mt-2 text-sm font-medium leading-relaxed text-white">
                  &ldquo;{prompt.my_answer}&rdquo;
                </p>
              </motion.div>
            )}

            {/* partner answer reveal when both answered */}
            {bothAnswered && prompt?.partner_answer && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 rounded-2xl border border-[var(--a)]/30 bg-[color-mix(in_srgb,var(--a),transparent_90%)] p-4 backdrop-blur-md"
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-5 items-center rounded-full bg-gradient-to-r from-[var(--b)] to-[#9333ea] px-2.5 text-[10px] font-black uppercase tracking-wider text-white">
                    {partnerFirst}
                  </span>
                  <Heart className="shrink-0 fill-[var(--a)] text-[var(--a)]" size={14} />
                  <span className="text-xs text-white/50">{partnerFirst}&apos;s answer</span>
                </div>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-white">
                  &ldquo;{prompt.partner_answer}&rdquo;
                </p>
              </motion.div>
            )}
          </div>

          <div className="question-orbit" />
        </motion.article>

        {/* ══ ROW 2: 2-COLUMN GRID (I'M BORED | PLAY) ══════════════════════════ */}
        <div className="mt-4 grid grid-cols-2 gap-4">

          {/* I'M BORED (with PING button) */}
          <motion.div
            className={`glass bored-card flex flex-col justify-between p-5 ${cooldown ? "bored-pulse" : ""}`}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-start justify-between">
              <p className="eyebrow">i&apos;m bored</p>
              <Bell size={16} className="text-[var(--a)]" />
            </div>

            <div className="my-4 text-center">
              <motion.button
                onClick={ping}
                disabled={!!cooldown}
                whileTap={{ scale: 0.92 }}
                className={`w-full rounded-2xl py-3.5 text-center font-display text-sm font-black tracking-wider shadow-lg transition-all ${
                  cooldown
                    ? "border border-white/20 bg-white/10 text-white/60"
                    : "bg-gradient-to-r from-[var(--a)] to-[var(--b)] text-white shadow-[0_8px_20px_-6px_var(--a)] hover:opacity-90"
                }`}
              >
                {cooldown ? `SENT · ${Math.floor(cooldown / 60)}:${String(cooldown % 60).padStart(2, "0")}` : "PING"}
              </motion.button>
            </div>

            <p className="text-center text-xs text-white/50">
              {cooldown
                ? `Buzz sent to ${partnerFirst}`
                : partnerOnline
                ? `Buzz ${partnerFirst} instantly`
                : `${partnerFirst} is away · Email alert will be sent`}
            </p>
          </motion.div>

          {/* PLAY / ACTIVE GAME CARD */}
          {gameId || activeGame?.id ? (
            <Link href={`/play/${gameId || activeGame?.id}`} className="block">
              <motion.article
                className="glass relative flex h-full flex-col justify-between overflow-hidden p-5 border-[var(--a)]/50 shadow-[0_0_25px_-5px_rgba(255,0,128,0.25)]"
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--a)] opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--a)]" />
                    </span>
                    <p className="eyebrow text-[var(--a)] font-bold">in session</p>
                  </div>
                  <Gamepad2 size={16} className="text-[var(--a)]" />
                </div>

                <div className="my-3">
                  <p className="font-display text-xl font-bold leading-tight">
                    Would You Rather
                  </p>
                  <p className="mt-1 text-xs text-white/70">
                    Session open with {partnerFirst}
                  </p>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-[var(--a)]">
                  <span>Join game</span>
                  <ArrowRight size={13} />
                </div>
              </motion.article>
            </Link>
          ) : (
            <Link href="/play" className="block">
              <motion.article
                className="glass flex h-full flex-col justify-between p-5"
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-start justify-between">
                  <p className="eyebrow">play</p>
                  <Gamepad2 size={16} className="text-[var(--b)]" />
                </div>

                <div className="my-4">
                  <p className="font-display text-2xl font-bold leading-tight">
                    6 games
                  </p>
                  <p className="mt-1 text-xs text-white/50">
                    Quick 2-player rounds
                  </p>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-[var(--a)]">
                  <span>Start playing</span>
                  <ArrowRight size={13} />
                </div>
              </motion.article>
            </Link>
          )}
        </div>

        {/* ══ ROW 3: 2-COLUMN GRID (TOPIC CARD | STREAK) ═══════════════════════ */}
        <div className="mt-4 grid grid-cols-2 gap-4">

          {/* TOPIC CARD (with shuffle) */}
          <motion.article
            className="glass flex flex-col justify-between p-5"
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <div>
              <p className="eyebrow">topic card</p>
              <p className="mt-3 font-display text-sm font-semibold leading-snug sm:text-base">
                {topic}
              </p>
            </div>

            <button
              onClick={loadTopic}
              disabled={shufflingTopic}
              className="mt-4 flex items-center gap-1.5 text-xs font-bold text-[var(--a)] hover:opacity-80"
            >
              <RotateCw size={13} className={shufflingTopic ? "animate-spin" : ""} />
              <span>Shuffle</span>
            </button>
          </motion.article>

          {/* ANNIVERSARY & STREAK */}
          <Link href="/us" className="block">
            <motion.article
              className="glass flex h-full flex-col justify-between p-5"
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-start justify-between">
                <p className="eyebrow">anniversary</p>
                <div
                  className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[.06] px-2 py-0.5"
                  title={`${streak} day streak`}
                >
                  <Flame size={15} className="fill-[var(--a)] text-[var(--a)] drop-shadow-[0_0_8px_var(--a)]" />
                  <span className="font-display text-xs font-bold tracking-tight text-white">{streak}</span>
                </div>
              </div>

              {profileLoading ? (
                <div className="my-2 h-10 w-20 animate-pulse rounded-xl bg-white/10" />
              ) : anniversaryInfo ? (
                <div className="my-2">
                  {anniversaryInfo.isToday ? (
                    <>
                      <p className="font-display text-2xl font-black tracking-tight text-[var(--a)]">
                        Today! 🎉
                      </p>
                      <p className="mt-1 text-xs font-semibold text-white/80">
                        Happy {anniversaryInfo.milestoneLabel}!
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-display text-4xl font-black tracking-tight text-white">
                        {anniversaryInfo.daysUntil}
                        <span className="ml-1.5 text-sm font-bold text-white/40">days</span>
                      </p>
                      <p className="mt-1 text-xs font-medium text-white/70">
                        to {anniversaryInfo.milestoneLabel} · {anniversaryInfo.nextDateFormatted}
                      </p>
                    </>
                  )}
                  <p className="mt-1 text-xs text-white/50">
                    {anniversaryInfo.daysTogether}d together
                  </p>
                </div>
              ) : (
                <div className="my-2">
                  <p className="font-display text-4xl font-black tracking-tight text-white">
                    {daysTogether}
                    <span className="ml-1.5 text-sm font-bold text-white/40">days</span>
                  </p>
                  <p className="mt-1 text-xs text-white/50">
                    {daysTogether}d together
                  </p>
                </div>
              )}

              <p className="text-[11px] font-semibold text-white/40">
                {anniversaryInfo?.hasCustomDate ? "Monthly countdown" : "Set date in Us tab"}
              </p>
            </motion.article>
          </Link>
        </div>

        {/* ══ BOTTOM NAV ══════════════════════════════════════════════════════ */}
        <nav className="nav-bar fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-md rounded-full p-2">
          {[
            { href: "/", label: "Home", icon: HomeIcon, active: true },
            { href: "/play", label: "Play", icon: Gamepad2, active: false },
            { href: "/memories", label: "Memories", icon: BookOpen, active: false },
            { href: "/us", label: "Us", icon: Users, active: false },
          ].map(({ href, label, icon: Icon, active }) => (
            <Link key={href} href={href} className={`nav-item ${active ? "active" : ""}`}>
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
          ))}
        </nav>
      </div>

      {/* ══ MODE SELECTOR SHEET ══════════════════════════════════════════════ */}
      <ModeSheet
        open={sheet}
        onClose={() => setSheet(false)}
        currentMode={mode}
        onSelectMode={handleSelectMode}
      />
    </main>
  );
}
