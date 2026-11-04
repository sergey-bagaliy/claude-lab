// Сервис-воркер: сохраняет файлы сайта в телефоне, чтобы калькулятор открывался без интернета.
// Стратегия: сразу отдаём сохранённую копию, а в фоне скачиваем свежую — она будет при следующем открытии.
// При изменении файлов сайта увеличьте номер версии, чтобы старый кэш удалился.
var CACHE = 'remont-calc-v2';
var FILES = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './formulas.js',
  './manifest.webmanifest',
  './icon.svg',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) { return cache.addAll(FILES); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  var update = caches.open(CACHE).then(function (cache) {
    return fetch(request).then(function (response) {
      if (response.ok) cache.put(request, response.clone());
      return response;
    });
  });

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(function (cached) {
      return cached || update;
    })
  );
  event.waitUntil(update.catch(function () {}));
});
