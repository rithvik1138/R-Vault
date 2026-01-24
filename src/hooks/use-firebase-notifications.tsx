import { useEffect, useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";

// Firebase configuration - you'll need to replace these with your own
const FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  vapidKey: "", // For web push
};

export const useFirebaseNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Check if Firebase is configured
  const isConfigured = Boolean(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);

  useEffect(() => {
    // Check browser support
    if (!("Notification" in window)) {
      setPermission("unsupported");
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    setPermission(Notification.permission);
  }, []);

  const initializeFirebase = useCallback(async () => {
    if (!isConfigured) {
      console.log("Firebase not configured - using browser notifications instead");
      return false;
    }

    try {
      // Dynamically import Firebase to avoid loading if not configured
      const { initializeApp, getApps } = await import("firebase/app");
      const { getMessaging, getToken, onMessage } = await import("firebase/messaging");

      // Initialize Firebase if not already done
      const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApps()[0];
      const messaging = getMessaging(app);

      // Request notification permission
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission !== "granted") {
        console.log("Notification permission denied");
        return false;
      }

      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: FIREBASE_CONFIG.vapidKey,
      });

      if (token) {
        setFcmToken(token);
        await saveFcmToken(token);

        // Listen for foreground messages
        onMessage(messaging, (payload) => {
          console.log("Foreground message received:", payload);
          
          // Show toast for foreground messages
          toast({
            title: payload.notification?.title || "New notification",
            description: payload.notification?.body,
          });

          // Also show browser notification
          if (Notification.permission === "granted") {
            new Notification(payload.notification?.title || "New notification", {
              body: payload.notification?.body,
              icon: "/favicon.png",
            });
          }
        });

        setIsInitialized(true);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Firebase initialization error:", error);
      return false;
    }
  }, [isConfigured, toast]);

  const saveFcmToken = async (token: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("fcm_tokens")
      .upsert(
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

    const { error } = await supabase
      .from("fcm_tokens")
      .delete()
      .eq("user_id", user.id)
      .eq("token", fcmToken);

    if (error) {
      console.error("Failed to remove FCM token:", error);
    }

    setFcmToken(null);
  };

  // Fallback browser notification (when Firebase is not configured)
  const sendLocalNotification = useCallback((title: string, body: string, options?: NotificationOptions) => {
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
    } catch (error) {
      // Fallback to service worker notification
      navigator.serviceWorker?.ready.then((registration) => {
        registration.showNotification(title, {
          body,
          icon: "/favicon.png",
          badge: "/favicon.png",
          ...options,
        });
      });
    }
  }, []);

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

// Instructions for setting up Firebase
export const FIREBASE_SETUP_INSTRUCTIONS = `
## Firebase Cloud Messaging Setup

1. Go to https://console.firebase.google.com
2. Create a new project or select an existing one
3. Go to Project Settings > General
4. Under "Your apps", click the web icon (</>)
5. Register your app and copy the configuration
6. Go to Project Settings > Cloud Messaging
7. Generate a Web Push certificate and copy the VAPID key
8. Add these values to FIREBASE_CONFIG in use-firebase-notifications.tsx:
   - apiKey
   - authDomain
   - projectId
   - storageBucket
   - messagingSenderId
   - appId
   - vapidKey

9. For sending notifications from backend, you'll need to:
   - Download the service account key from Project Settings > Service accounts
   - Add FIREBASE_SERVICE_ACCOUNT_KEY as a Supabase secret
`;
