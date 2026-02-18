import { useEffect, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

// VAPID public key - this should match your server's VAPID private key
// For now, we'll use browser notifications without web push
// Web Push requires a backend to send notifications

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    if (!("Notification" in window)) {
      setPermission("unsupported");
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    setPermission(Notification.permission);

    // Check if service workers are supported for true push notifications
    if ("serviceWorker" in navigator && "PushManager" in window) {
      // Service worker push is available
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const mgr = registration.pushManager;
      if (mgr) {
        const subscription = await mgr.getSubscription();
        setIsSubscribed(!!subscription);
      }
    } catch (error) {
      console.log("Push not available:", error);
    }
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      return false;
    }

    if (Notification.permission === "granted") {
      setPermission("granted");
      return true;
    }

    if (Notification.permission !== "denied") {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === "granted";
    }

    return false;
  }, []);

  // Subscribe to push notifications (requires service worker)
  const subscribe = useCallback(async () => {
    if (!user || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("Push notifications not supported");
      return false;
    }

    try {
      // First request notification permission
      const permissionGranted = await requestPermission();
      if (!permissionGranted) return false;

      // Register service worker if not already registered
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Note: For full web push, you'd need a VAPID key pair and backend
      // For now, we just track that the user wants notifications
      console.log("Service worker registered for notifications");
      setIsSubscribed(true);
      return true;
    } catch (error) {
      console.error("Failed to subscribe to push:", error);
      return false;
    }
  }, [user, requestPermission]);

  const unsubscribe = useCallback(async () => {
    if (!user) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove from database
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", subscription.endpoint);
      }
      
      setIsSubscribed(false);
    } catch (error) {
      console.error("Failed to unsubscribe:", error);
    }
  }, [user]);

  // Send a local notification (works even when in background but same origin)
  const sendLocalNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (Notification.permission !== "granted") return;

    try {
      new Notification(title, {
        icon: "/favicon.png",
        badge: "/favicon.png",
        ...options,
      });
    } catch (error) {
      // Fallback for browsers that don't support Notification constructor
      navigator.serviceWorker?.ready.then((registration) => {
        registration.showNotification(title, {
          icon: "/favicon.png",
          badge: "/favicon.png",
          ...options,
        });
      });
    }
  }, []);

  return {
    isSupported,
    permission,
    isSubscribed,
    requestPermission,
    subscribe,
    unsubscribe,
    sendLocalNotification,
  };
};
