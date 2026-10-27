"use client";
import { useEffect, useState } from "react";
import { CalendarHeart } from "lucide-react";
import { CoupleProfile, useCoupleProfile } from "@/lib/use-couple-profile";
import { calculateAnniversary } from "@/lib/anniversary";
import { getErrorMessage } from "@/lib/browser-api";
import { toast } from "sonner";

export interface AnniversarySectionProps {
  profile?: CoupleProfile | null;
  updateAnniversary?: (date: string | null) => Promise<unknown>;
}

export function AnniversarySectionFallback() {
  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-white/[.04] p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarHeart size={16} className="text-[var(--a)]" />
          <span className="eyebrow text-xs font-bold tracking-wider uppercase text-white/70">
            When We Started Dating
          </span>
        </div>
      </div>
      <div className="mt-3 h-9 w-48 animate-pulse rounded-xl bg-white/[.07]" />
      <div className="mt-2.5 h-4 w-72 animate-pulse rounded bg-white/[.04]" />
    </div>
  );
}

export function AnniversarySection({
  profile: propProfile,
  updateAnniversary: propUpdateAnniversary,
}: AnniversarySectionProps = {}) {
  const hook = useCoupleProfile();
  const profile = propProfile !== undefined ? propProfile : hook.profile;
  const updateAnniversary = propUpdateAnniversary !== undefined ? propUpdateAnniversary : hook.updateAnniversary;
  const [dateInput, setDateInput] = useState("");
  const [savingAnniversary, setSavingAnniversary] = useState(false);

  useEffect(() => {
    if (profile?.anniversary_date) {
      setDateInput(profile.anniversary_date.split("T")[0]);
    }
  }, [profile?.anniversary_date]);

  const handleSaveAnniversary = async () => {
    if (!dateInput) return;
    setSavingAnniversary(true);
    try {
      await updateAnniversary(dateInput);
      toast.success("Anniversary date saved!");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingAnniversary(false);
    }
  };

  const handleClearAnniversary = async () => {
    setSavingAnniversary(true);
    try {
      await updateAnniversary(null);
      setDateInput("");
      toast.success("Anniversary date cleared");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingAnniversary(false);
    }
  };

  const anniversaryInfo = calculateAnniversary(profile?.anniversary_date, profile?.created_at);
  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-white/[.04] p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarHeart size={16} className="text-[var(--a)]" />
          <span className="eyebrow text-xs font-bold tracking-wider uppercase text-white/70">
            When We Started Dating
          </span>
        </div>
        {anniversaryInfo && (
          <span className="rounded-full bg-[var(--a)]/20 px-2.5 py-0.5 text-[11px] font-bold text-[var(--a)]">
            {anniversaryInfo.daysTogether} days
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={dateInput}
          max={todayStr}
          onChange={(e) => setDateInput(e.target.value)}
          className="rounded-xl border border-white/15 bg-white/[.07] px-3 py-2 text-sm text-white outline-none focus:border-[var(--a)]"
        />
        <button
          onClick={handleSaveAnniversary}
          disabled={savingAnniversary || !dateInput || dateInput === (profile?.anniversary_date?.split("T")[0] ?? "")}
          className="button-primary text-xs py-2 px-4 disabled:opacity-40"
        >
          {savingAnniversary ? "Saving…" : "Save date"}
        </button>
        {profile?.anniversary_date && (
          <button
            onClick={handleClearAnniversary}
            disabled={savingAnniversary}
            className="rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/50 hover:bg-white/10 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      <p className="mt-2.5 text-xs text-white/50 leading-relaxed">
        {profile?.anniversary_date && anniversaryInfo
          ? `Next monthly anniversary: ${anniversaryInfo.nextDateFormatted} (${anniversaryInfo.isToday ? "Today! 🎉" : `in ${anniversaryInfo.daysUntil} day${anniversaryInfo.daysUntil === 1 ? "" : "s"}`}) · ${anniversaryInfo.milestoneLabel}`
          : "Set the day you started dating to track your monthly anniversaries and exact days together on the Home screen."}
      </p>
    </div>
  );
}
