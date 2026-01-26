/* ================================
   Firebase Cloud Messaging Setup
================================ */

// Import Firebase (MUST be first)
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

// Firebase messaging instance
const messaging = firebase.messaging();

/* ================================
   Firebase Background Notifications
================================ */

messaging.onBackgroundMessage((payload) => {
  console.log("FCM background message:", payload);

  const notification = payload.notification || {};

  const title = notification.title || "R-Vault";
  const options = {
    body: notification.body || "You have a new notification",
    icon: "/favicon.png",
    badge: "/favicon.png",
    data: payload.data || {},
    vibrate: [200, 100, 200],
  };

  self.registration.showNotification(title, options);
});

/* ================================
   Generic Service Worker Logic
================================ */

const CACHE_NAME = "r-vault-v1";

// Install event
self.addEventListener("install", (event) => {
  console.log("Service Worker installing.");
  self.skipWaiting();
});

// Activate event
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating.");
  event.waitUntil(self.clients.claim());
});

/* ================================
   Push API (Non-Firebase Push)
   (Kept for compatibility)
================================ */

self.addEventListener("push", (event) => {
  console.log("Push received:", event);

  let data = {
    title: "R-Vault",
    body: "You have a new notification",
    icon: "/favicon.png",
    badge: "/favicon.png",
    tag: "default",
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    requireInteraction: data.requireInteraction || false,
    data: data.data || {},
    actions: data.actions || [],
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/* ================================
   Notification Click
================================ */

self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/chat";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          if (event.notification.data?.url) {
            client.navigate(urlToOpen);
          }
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

/* ================================
   Notification Close
================================ */

self.addEventListener("notificationclose", (event) => {
  console.log("Notification closed:", event);
});

/* ================================
   Background Sync (optional)
================================ */

self.addEventListener("sync", (event) => {
  console.log("Background sync:", event.tag);
});

/* ================================
   Messages from Main Thread
================================ */

self.addEventListener("message", (event) => {
  console.log("SW received message:", event.data);

  if (event.data?.type === "SHOW_NOTIFICATION") {
    const { title, options } = event.data;
    self.registration.showNotification(title, options);
  }
});
