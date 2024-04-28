const CACHE_NAME = 'nijimemo';
const urlsToCache = [
  '',
  'index.html',
  'reception.html',
  'js/crypto-js.js',
  'js/jquery-3.7.1.min.js',
  'js/jsQR.js',
  'js/main.js',
  'js/qrcode.min.js',
  'js/seedrandom.min.js',
  'js/url-comp.js',
  'img/logo/color_logo.png',
  'img/logo/dark_logo.png',
  'img/color_bar.png',
  'style/style.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        return response ? response : fetch(event.request);
      })
  );
});
