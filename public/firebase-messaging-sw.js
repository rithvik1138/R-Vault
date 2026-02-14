/* eslint-disable no-undef */
// Firebase Cloud Messaging Service Worker
// This runs in the background even when the app is closed

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyD0Viou5Xp1V1jC6gTMkqxZDXTE2024pSk",
  authDomain: "r-vault-2a308.firebaseapp.com",
  projectId: "r-vault-2a308",
  storageBucket: "r-vault-2a308.firebasestorage.app",
  messagingSenderId: "485639092097",
  appId: "1:485639092097:web:00347d69cea82e23491a80",
});

const messaging = firebase.messaging();

// Handle background messages (when app is closed or in background)
messaging.onBackgroundMessage((payload) => {
  console.log("[firebase-messaging-sw.js] Background message:", payload);

  const title = payload.notification?.title || "R-Vault";
  const options = {
    body: payload.notification?.body || "You have a new message",
    icon: "/favicon.png",
    badge: "/favicon.png",
    tag: "r-vault-notification",
    data: payload.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: true,
  };

  self.registration.showNotification(title, options);
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/chat";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(urlToOpen);
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
