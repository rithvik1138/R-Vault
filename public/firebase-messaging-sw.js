/* =========================================
   Firebase Cloud Messaging Service Worker
   File: public/firebase-messaging-sw.js
========================================= */

// Firebase SDKs (compat is REQUIRED in SW)
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

// 🔐 Firebase config (SAFE to be public)
firebase.initializeApp({
  apiKey: "AIzaSyD0Viou5Xp1V1jC6gTMkqxZDXTE2024pSk",
  authDomain: "r-vault-2a308.firebaseapp.com",
  projectId: "r-vault-2a308",
  messagingSenderId: "485639092097",
  appId: "1:485639092097:web:00347d69cea82e23491a80",
});

// Initialize messaging
const messaging = firebase.messaging();

/* =========================================
   🔔 BACKGROUND NOTIFICATIONS (APP CLOSED)
========================================= */

messaging.onBackgroundMessage((payload) => {
  console.log("[SW] Background message received:", payload);
  
  // Extract from data field (required for background notifications)
  const { title, body, url } = payload.data || {};
  
  if (!title || !body) {
    console.error("[SW] Missing title or body in payload.data");
    return;
  }

  const notificationOptions = {
    body,
    icon: "/favicon.png",
    badge: "/favicon.png",
    data: { url: url || "/chat" },
    tag: "r-vault-message",
    requireInteraction: false,
  };

  self.registration.showNotification(title, notificationOptions);
});

/* =========================================
   🔁 INSTALL & ACTIVATE
========================================= */

self.addEventListener("install", () => {
  console.log("[SW] Installed");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activated");
  event.waitUntil(self.clients.claim());
});

/* =========================================
   👉 NOTIFICATION CLICK
========================================= */

self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification click");
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/chat";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if (client.url.includes(self.location.origin)) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }
      return clients.openWindow(urlToOpen);
    })
  );
});
