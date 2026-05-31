/// <reference lib="webworker" />
import { precacheAndRoute } from "workbox-precaching";
import { clientsClaim } from "workbox-core";

declare let self: ServiceWorkerGlobalScope;

// ビルド時にプリキャッシュ対象が注入される
precacheAndRoute(self.__WB_MANIFEST);

self.skipWaiting();
clientsClaim();

interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
}

// プッシュ通知を受信したら表示
self.addEventListener("push", (event: PushEvent) => {
  let data: PushPayload = {};
  try {
    data = event.data ? (event.data.json() as PushPayload) : {};
  } catch {
    data = { body: event.data?.text() };
  }

  const title = data.title ?? "チームつながる";
  const options: NotificationOptions = {
    body: data.body ?? "",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    tag: data.tag,
    data: { url: data.url ?? "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 通知タップでアプリを開く / 既存タブにフォーカス
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const targetUrl = (event.notification.data?.url as string) ?? "/";

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of all) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(targetUrl);
            } catch {
              /* 無視 */
            }
          }
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })()
  );
});
