const CACHE_NAME = "samai-cache-v1";
const APP_SHELL = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/logo.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // فقط GET قابل کش است؛ درخواست‌های چت (POST به /api/chat) همیشه مستقیم
  // به شبکه می‌روند و هرگز کش نمی‌شوند.
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.pathname.startsWith("/api/")) return;

  // برای صفحات HTML: ابتدا شبکه (تا همیشه آخرین نسخه سایت لود شود)، در صورت
  // آفلاین‌بودن از کش برمی‌گردد.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((res) => res || caches.match("/")))
    );
    return;
  }

  // برای فایل‌های استاتیک (آیکون، لوگو، chunk های Next): اول کش، بعد شبکه.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return res;
        })
    )
  );
});
