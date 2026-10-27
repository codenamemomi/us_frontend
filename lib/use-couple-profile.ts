"use client";
import { useCallback, useEffect, useState } from "react";
import { browserApiClient } from "@/lib/browser-api";
import { useLive, useLiveStatus } from "@/lib/use-live";

export interface CoupleProfile {
  couple_id: string;
  invite_code: string;
  created_at: string;
  anniversary_date?: string | null;
  me: { id: string; name: string; email: string };
  partner: { id: string; name: string; email: string } | null;
  streak: number;
  days_together: number;
}

export type Mode = "together" | "on_call" | "bored";

export interface ActiveGameInfo {
  id: string;
  game_type: string;
  created_by: string;
}

export function useCoupleProfile() {
  const [profile, setProfile] = useState<CoupleProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setModeState] = useState<Mode>("together");
  const { partnerOnline, setPartnerOnline } = useLiveStatus();
  const [activeGame, setActiveGame] = useState<ActiveGameInfo | null>(null);

  const refetchProfile = useCallback(async () => {
    try {
      const p = await browserApiClient.get<CoupleProfile>("/couples/me");
      setProfile(p);
      localStorage.setItem("us_profile", JSON.stringify(p));
      return p;
    } catch {
      return null;
    }
  }, []);

  const updateAnniversary = useCallback(async (dateStr: string | null) => {
    const updated = await browserApiClient.patch<CoupleProfile>("/couples/anniversary", {
      anniversary_date: dateStr,
    });
    setProfile(updated);
    localStorage.setItem("us_profile", JSON.stringify(updated));
    return updated;
  }, []);

  useLive((e) => {
    if (e.type === "anniversary_updated") {
      refetchProfile();
    }
  });

  useEffect(() => {
    const saved = (typeof window !== "undefined" && (localStorage.getItem("us_mode") as Mode)) || "together";
    setModeState(saved);
    if (typeof document !== "undefined") {
      document.documentElement.dataset.mode = saved;
    }

    // ── Restore cached profile instantly (eliminates tab-switch reload flash) ──
    const cachedRaw = typeof window !== "undefined" && localStorage.getItem("us_profile");
    if (cachedRaw) {
      try {
        const cached: CoupleProfile = JSON.parse(cachedRaw);
        setProfile(cached);
        setLoading(false); // already have data — no skeleton needed
      } catch {
        // corrupted cache entry, will be overwritten by fresh fetch below
      }
    }

    refetchProfile().finally(() => setLoading(false));

    browserApiClient
      .get<{
        mode: string;
        partner_online?: boolean;
        active_game?: ActiveGameInfo | null;
      }>("/status")
      .then((s) => {
        const m = (s.mode === "idle" ? "together" : s.mode) as Mode;
        if (m === "together" || m === "on_call" || m === "bored") {
          setModeState(m);
          localStorage.setItem("us_mode", m);
          document.documentElement.dataset.mode = m;
        }
        if (typeof s.partner_online === "boolean") {
          setPartnerOnline(s.partner_online);
        }
        if (s.active_game) {
          setActiveGame(s.active_game);
        }
      })
      .catch(() => { /* silent */ });
  }, [refetchProfile, setPartnerOnline]);

  const setMode = (next: Mode, sync: boolean = true) => {
    setModeState(next);
    localStorage.setItem("us_mode", next);
    if (typeof document !== "undefined") {
      document.documentElement.dataset.mode = next;
    }
    if (sync) {
      browserApiClient.post("/status", { mode: next === "bored" ? "idle" : next }).catch(() => { /* silent */ });
    }
  };

  const myName = profile?.me?.name ?? "";
  const partnerName = profile?.partner?.name ?? "";
  const myFirst = myName.split(" ")[0] || "You";
  const partnerFirst = partnerName ? partnerName.split(" ")[0] : "Partner";
  const myInitial = myFirst[0]?.toUpperCase() ?? "Y";
  const partnerInitial = (partnerName ? partnerFirst[0] : (profile?.partner ? "P" : "+"))?.toUpperCase() || "+";

  return {
    profile,
    setProfile,
    refetchProfile,
    updateAnniversary,
    loading,
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
  };
}
