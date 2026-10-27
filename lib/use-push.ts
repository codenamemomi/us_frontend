"use client";

import { useEffect, useState, useCallback } from "react";
import { browserApiClient } from "@/lib/browser-api";
import { toast } from "sonner";

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export function isIosDevice(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function usePushNotification() {
  const [isSupported, setIsSupported] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    if (typeof window === "undefined") return;

    const supported =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;

    setIsSupported(supported);
    setStandalone(isStandalone());
    setIsIos(isIosDevice());

    if (!supported) {
      setLoading(false);
      return;
    }

    setPermission(Notification.permission);

    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(Boolean(sub));
      } else {
        setIsSubscribed(false);
      }
    } catch (e) {
      console.warn("Error checking push subscription:", e);
      setIsSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const enablePush = async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error("Push notifications are not supported on this browser.");
      return false;
    }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      toast.error("VAPID public key not configured.");
      return false;
    }

    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Must be called from user gesture
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") {
        toast.info("Notification permission was not granted.");
        return false;
      }

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as BufferSource,
        });
      }

      await browserApiClient.post("/push/subscribe", sub.toJSON());
      setIsSubscribed(true);
      toast.success("Push notifications enabled!");
      return true;
    } catch (err) {
      console.error("Failed to enable push:", err);
      toast.error("Could not enable push notifications.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const disablePush = async (): Promise<boolean> => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      if (reg) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await browserApiClient
            .post("/push/unsubscribe", { endpoint: sub.endpoint })
            .catch(() => {});
          await sub.unsubscribe();
        }
      }
      setIsSubscribed(false);
      toast.success("Push notifications disabled.");
      return true;
    } catch (err) {
      console.error("Failed to disable push:", err);
      toast.error("Could not disable push notifications.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    isSupported,
    isStandalone: standalone,
    isIos,
    permission,
    isSubscribed,
    loading,
    enablePush,
    disablePush,
    checkStatus,
  };
}
