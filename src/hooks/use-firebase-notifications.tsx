import { useEffect, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";

/* ================================
   Firebase Configuration
================================ */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD0Viou5Xp1V1jC6gTMkqxZDXTE2024pSk",
  authDomain: "r-vault-2a308.firebaseapp.com",
  projectId: "r-vault-2a308",
  storageBucket: "r-vault-2a308.firebasestorage.app",
  messagingSenderId: "485639092097",
  appId: "1:485639092097:web:00347d69cea82e23491a80",
  vapidKey:
    "BC3NoIiMetyujaenjALxYEXbwrYDX7W89yhMcrI7DGHUExKqNCEwqx-tmey4LA0IqkKlRBR3WGNf175JNdqhBaU",
};

export const useFirebaseNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission | "unsupported">("default");
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  /* ================================
     Check browser support
  ================================ */

  useEffect(() => {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    setPermission(Notification.permission);
  }, []);

  /* ================================
     Firebase init
  ================================ */

  const isConfigured = Boolean(
    FIREBASE_CONFIG.apiKey &&
      FIREBASE_CONFIG.projectId &&
      FIREBASE_CONFIG.vapidKey
  );

  const initializeFirebase = useCallback(async () => {
    if (!isConfigured) {
      console.log(
        "Firebase not configured - using browser notifications instead"
      );
      return false;
    }

    try {
      const { initializeApp, getApps } = await import("firebase/app");
      const { getMessaging, getToken, onMessage } = await import(
        "firebase/messaging"
      );

      const app =
        getApps().length === 0
          ? initializeApp(FIREBASE_CONFIG)
          : getApps()[0];

      // Register Firebase service worker
      let registration: ServiceWorkerRegistration | undefined;
      if ("serviceWorker" in navigator) {
        try {
          registration = await navigator.serviceWorker.getRegistration();

          if (
            !registration ||
            !registration.active?.scriptURL.includes(
              "firebase-messaging-sw.js"
            )
          ) {
            registration = await navigator.serviceWorker.register(
              "/firebase-messaging-sw.js",
              { scope: "/" }
            );
            console.log(
              "🔥 Firebase service worker registered:",
              registration
            );
          } else {
            console.log("🔥 Firebase service worker already registered");
          }

          await navigator.serviceWorker.ready;
          console.log("🔥 Service worker is ready");
        } catch (error) {
          console.error(
            "❌ Failed to register Firebase service worker:",
            error
          );
          return false;
        }
      } else {
        console.error("❌ Service workers not supported");
        return false;
      }

      const messaging = getMessaging(app);

      const notifPermission = await Notification.requestPermission();
      setPermission(notifPermission);

      if (notifPermission !== "granted") {
        console.log("Notification permission denied");
        return false;
      }

      const token = await getToken(messaging, {
        vapidKey: FIREBASE_CONFIG.vapidKey,
        // Explicitly bind to the Firebase SW registration if available
        serviceWorkerRegistration: registration,
      });

      if (!token) return false;

      console.log("🔥 FCM TOKEN:", token);
      setFcmToken(token);
      await saveFcmToken(token);

      onMessage(messaging, (payload) => {
        console.log("Foreground message received:", payload);

        toast({
          title: payload.notification?.title || "New notification",
          description: payload.notification?.body,
        });

        if (Notification.permission === "granted") {
          new Notification(
            payload.notification?.title || "New notification",
            {
              body: payload.notification?.body,
              icon: "/favicon.png",
            }
          );
        }
      });

      setIsInitialized(true);
      return true;
    } catch (error) {
      console.error("Firebase initialization error:", error);
      return false;
    }
  }, [isConfigured, toast, user]);

  /* ================================
     Save / Remove token
  ================================ */

  const saveFcmToken = async (token: string) => {
    if (!user) return;

    const { error } = await supabase.from("fcm_tokens").upsert(
      {
        user_id: user.id,
        token,
        device_info: navigator.userAgent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,token" }
    );

    if (error) {
      console.error("Failed to save FCM token:", error);
    }
  };

  const removeFcmToken = async () => {
    if (!user || !fcmToken) return;

    await supabase
      .from("fcm_tokens")
      .delete()
      .eq("user_id", user.id)
      .eq("token", fcmToken);

    setFcmToken(null);
  };

  /* ================================
     Fallback local notification
  ================================ */

  const sendLocalNotification = useCallback(
    (title: string, body: string, options?: NotificationOptions) => {
      if (Notification.permission !== "granted") return;

      try {
        const notification = new Notification(title, {
          body,
          icon: "/favicon.png",
          badge: "/favicon.png",
          tag: "r-vault-notification",
          ...options,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        setTimeout(() => notification.close(), 5000);
      } catch {
        navigator.serviceWorker?.ready.then((registration) => {
          registration.showNotification(title, {
            body,
            icon: "/favicon.png",
            badge: "/favicon.png",
            ...options,
          });
        });
      }
    },
    []
  );

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;

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

  return {
    isSupported,
    isConfigured,
    isInitialized,
    permission,
    fcmToken,
    initializeFirebase,
    requestPermission,
    sendLocalNotification,
    removeFcmToken,
  };
};
