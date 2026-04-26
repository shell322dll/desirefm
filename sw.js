// DesireFM Service Worker
// Версия кэша — меняй при обновлении файлов
const CACHE_NAME = 'desirefm-v1';

// Файлы app shell для кэширования
const SHELL_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── Install: кэшируем app shell ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(SHELL_FILES).catch(err => {
        console.warn('[SW] Не удалось закэшировать некоторые файлы:', err);
      });
    })
  );
  self.skipWaiting();
});

// ── Activate: удаляем старые кэши ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: сначала сеть, fallback — кэш ──
// Аудио-потоки радиостанций НЕ кэшируем — они идут напрямую
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Аудио/медиа потоки — всегда напрямую, без SW
  if (
    event.request.destination === 'audio' ||
    url.pathname.includes('stream') ||
    url.pathname.includes('.mp3') ||
    url.pathname.includes('.aac') ||
    url.pathname.includes('.m3u8') ||
    url.hostname !== self.location.hostname
  ) {
    return; // браузер обработает сам
  }

  // App shell: Network First → Cache Fallback
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Сохраняем свежую версию в кэш
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Офлайн — отдаём из кэша
        return caches.match(event.request).then(cached => {
          return cached || caches.match('/index.html');
        });
      })
  );
});
