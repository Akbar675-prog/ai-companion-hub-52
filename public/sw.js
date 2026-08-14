// Service Worker for Galileo Mod APK — enables reliable Chrome notifications.
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Receive messages from the page to display notifications.
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type !== "SHOW_NOTIFICATION") return;
  const { title, body, icon, image, url } = data.payload || {};
  event.waitUntil(
    self.registration.showNotification(title || "Notifikasi", {
      body: body || "",
      icon: icon || "/favicon.png",
      badge: "/favicon.png",
      image: image || undefined,
      data: { url: url || "/" },
      requireInteraction: false,
      vibrate: [200, 100, 200],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((all) => {
      for (const client of all) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) client.navigate(target);
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    }),
  );
});
