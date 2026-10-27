"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface LiveEvent {
  type:
    | "connected"
    | "game_started"
    | "game_updated"
    | "game_ended"
    | "bored_ping"
    | "status_changed"
    | "today_updated"
    | "presence_changed"
    | "anniversary_updated";
  game_id?: string;
  game_type?: string;
  started_by?: string;
  ping_id?: string;
  prompt_id?: string;
  mode?: string;
  partner_online?: boolean;
  [key: string]: unknown;
}

interface LiveContextValue {
  partnerOnline: boolean;
  setPartnerOnline: (online: boolean) => void;
  isConnected: boolean;
  subscribe: (handler: (event: LiveEvent) => void) => () => void;
}

const LiveContext = createContext<LiveContextValue | null>(null);

function getAuthToken(): string | null {
  if (typeof document === "undefined") return null;
  const tokenCookie = document.cookie
    .split("; ")
    .find((c) => c.startsWith("access_token="))
    ?.split("=")[1];
  return tokenCookie ? decodeURIComponent(tokenCookie) : null;
}

export function LiveProvider({ children }: { children: React.ReactNode }) {
  const [partnerOnline, setPartnerOnline] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const subscribersRef = useRef<Set<(event: LiveEvent) => void>>(new Set());
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;
    const token = getAuthToken();
    if (!token) {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // If already connected with an open readyState, do not reconnect
    if (esRef.current && esRef.current.readyState === EventSource.OPEN) {
      return;
    }

    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const url = `${API_URL}/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
    };

    es.onmessage = (event) => {
      try {
        const parsed: LiveEvent = JSON.parse(event.data);
        if (
          parsed.type === "presence_changed" &&
          typeof parsed.partner_online === "boolean"
        ) {
          setPartnerOnline(parsed.partner_online);
        }
        subscribersRef.current.forEach((handler) => {
          try {
            handler(parsed);
          } catch (err) {
            console.error("Error in LiveEvent subscriber:", err);
          }
        });
      } catch {
        // Ping or unparseable event
      }
    };

    es.onerror = () => {
      setIsConnected(false);
      if (!getAuthToken()) {
        es.close();
        esRef.current = null;
        return;
      }
      if (es.readyState === EventSource.CLOSED) {
        es.close();
        esRef.current = null;
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      }
    };
  }, []);

  useEffect(() => {
    connect();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // Close stream so the backend's hub.is_online becomes false after the
        // grace period. Push notifications will then fire correctly while the
        // tab is in the background.
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        if (esRef.current) {
          esRef.current.close();
          esRef.current = null;
          setIsConnected(false);
        }
      } else {
        // Page came back into view – reconnect immediately.
        connect();
      }
    };

    const interval = setInterval(() => {
      if (document.visibilityState === "hidden") return; // don't reconnect while hidden
      const token = getAuthToken();
      if (token && (!esRef.current || esRef.current.readyState === EventSource.CLOSED)) {
        connect();
      } else if (!token && esRef.current) {
        esRef.current.close();
        esRef.current = null;
        setIsConnected(false);
      }
    }, 4000);

    window.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [connect]);

  const subscribe = useCallback((handler: (event: LiveEvent) => void) => {
    subscribersRef.current.add(handler);
    return () => {
      subscribersRef.current.delete(handler);
    };
  }, []);

  return (
    <LiveContext.Provider
      value={{ partnerOnline, setPartnerOnline, isConnected, subscribe }}
    >
      {children}
    </LiveContext.Provider>
  );
}

export function useLive(onEvent?: (event: LiveEvent) => void) {
  const context = useContext(LiveContext);
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!context) return;
    const unsubscribe = context.subscribe((event) => {
      handlerRef.current?.(event);
    });
    return unsubscribe;
  }, [context]);
}

export function useLiveStatus() {
  const context = useContext(LiveContext);
  return {
    partnerOnline: context?.partnerOnline ?? false,
    setPartnerOnline: context?.setPartnerOnline ?? (() => {}),
    isConnected: context?.isConnected ?? false,
  };
}
