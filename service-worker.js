const CACHE_VERSION = 'v2.0.0-2026-04-30';
const APP_CACHE = `contratos-iguape-app-${CACHE_VERSION}`;
const DATA_CACHE = `contratos-iguape-data-${CACHE_VERSION}`;
const RUNTIME_CACHE = `contratos-iguape-runtime-${CACHE_VERSION}`;
const OFFLINE_URL = 'offline.html';

const APP_SHELL = [
  './',
  'index.html',
  OFFLINE_URL,
  'manifest.webmanifest',
  'src/css/main.css',
  'src/css/tokens.css',
  'src/css/themes.css',
  'src/css/partials/base.css',
  'src/css/partials/layout.css',
  'src/css/partials/topbar.css',
  'src/css/partials/buttons.css',
  'src/css/partials/forms.css',
  'src/css/partials/filters.css',
  'src/css/partials/kpis.css',
  'src/css/partials/panels.css',
  'src/css/partials/charts.css',
  'src/css/partials/badges.css',
  'src/css/partials/tables.css',
  'src/css/partials/footer.css',
  'src/css/partials/responsive.css',
  'src/css/partials/print.css',
  'src/js/theme-bootstrap.js',
  'src/js/offline.js',
  'src/js/main.js',
  'src/js/constants.js',
  'src/js/data/aggregate.js',
  'src/js/data/classify.js',
  'src/js/data/normalize.js',
  'src/js/data/source.js',
  'src/js/data/validation.js',
  'src/js/state/store.js',
  'src/js/state/url-sync.js',
  'src/js/ui/back-to-top.js',
  'src/js/ui/advanced-visualizations.js',
  'src/js/ui/charts.js',
  'src/js/ui/contract-details.js',
  'src/js/ui/data-warnings.js',
  'src/js/ui/export-csv.js',
  'src/js/ui/export-data.js',
  'src/js/ui/export-json.js',
  'src/js/ui/export-pdf.js',
  'src/js/ui/export-xlsx.js',
  'src/js/ui/feedback.js',
  'src/js/ui/filters.js',
  'src/js/ui/keyboard.js',
  'src/js/ui/kpis.js',
  'src/js/ui/mobile-cards.js',
  'src/js/ui/print.js',
  'src/js/ui/quality.js',
  'src/js/ui/saved-filters.js',
  'src/js/ui/section-toggles.js',
  'src/js/ui/share.js',
  'src/js/ui/summary.js',
  'src/js/ui/table.js',
  'src/js/ui/theme.js',
  'src/js/ui/urgency.js',
  'src/js/workers/dataset.worker.js',
  'src/js/utils/clipboard.js',
  'src/js/pwa/service-worker-registration.js',
  'src/js/utils/dates.js',
  'src/js/utils/dom.js',
  'src/js/utils/format.js',
  'src/js/utils/icons.js',
  'src/js/utils/load-script.js',
  'src/js/utils/search.js',
  'src/js/utils/svg.js',
  'src/js/utils/strings.js',
  'assets/apple-touch-icon.png',
  'assets/favicon.png',
  'assets/logo-prefeitura-iguape.png',
  'assets/og-image.png',
  'assets/icons/favicon.ico',
  'assets/icons/favicon-16.png',
  'assets/icons/favicon-32.png',
  'assets/icons/favicon-96.png',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/icon-maskable-512.png',
  'assets/icons/sprite.svg',
  'assets/vendor/chart.module.js',
  'assets/vendor/chart.umd.min.js',
  'assets/vendor/qrcode.min.js',
  'assets/vendor/xlsx.full.min.js',
  'assets/vendor/jspdf.umd.min.js',
  'assets/vendor/jspdf.plugin.autotable.min.js',
];

const APP_SHELL_PREFIXES = ['/src/css/', '/src/js/', '/assets/vendor/', '/assets/icons/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL)),
      caches.open(DATA_CACHE).then((cache) => cache.add('data/contratos.js')),
    ]),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => ![APP_CACHE, DATA_CACHE, RUNTIME_CACHE].includes(cacheName))
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('/data/contratos.js')) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, true));
    return;
  }

  if (isAppShellRequest(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request, false));
});

function isAppShellRequest(url) {
  return (
    APP_SHELL_PREFIXES.some((prefix) => url.pathname.includes(prefix)) ||
    url.pathname.includes('/assets/logo')
  );
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(APP_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(DATA_CACHE);
  const cached = await cache.match(request);
  const networkRequest = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || (await networkRequest) || (await caches.match(request));
}

async function networkFirst(request, useOfflineFallback) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (useOfflineFallback) return caches.match(OFFLINE_URL);
    throw new Error('Recurso indisponível offline.');
  }
}
