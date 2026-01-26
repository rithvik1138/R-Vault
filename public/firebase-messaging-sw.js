/* ================================
   Firebase Cloud Messaging SW
   (FINAL – STABLE)
================================ */

// Firebase compat SDKs (MUST be first)
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

// Initialize Firebase
firebase.initializeApp({
  apiKey: "AIzaSyD0Viou5Xp1V1jC6gTMkqxZDXTE2024pSk",
  authDomain: "r-vault-2a308.firebaseapp.com",
  projectId: "r-vault-2a308",
  messagingSenderId: "485639092097",
  appId: "1:485639092097:web:00347d69cea82e23491a80",
});

const messaging = firebase.messaging();

/* ================================
   🔥 BACKGROUND FCM HANDLER
   (THIS FIXES MESSAGE NOTIFICATIONS)
================================ */

messaging.onBackgroundMessage((payload) => {
  console.log("[FCM] Background message:", payload);

  const title = payload.notification?.title || "R-Vault";
  const options = {
    body: payload.notification?.body || "New message",
    icon: "/favicon.png",
    badge: "/favicon.png",
    data: payload.data || {},
    vibrate: [200, 100, 200],
  };

  self.registration.showNotification(title, options);
});

/* ================================
   Service Worker Lifecycle
================================ */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/* ================================
   ❌ DO NOT handle `push` manually
   Firebase already does this
================================ */

// ⛔ REMOVE your old `self.addEventListener("push", ...)`

/* ================================
   Notification Click
================================ */

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/chat";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if ("focus" in client) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }
      return clients.openWindow(urlToOpen);
    })
  );
});
