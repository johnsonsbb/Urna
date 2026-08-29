// Cache-first: o jogo tem que abrir em modo avião. A versão no nome do cache é
// o que faz o deploy novo substituir o antigo — mudar arquivo sem mudar isto
// deixa o jogador preso na versão velha.

const CACHE = 'heroi-de-masmorra-v1';

const ARQUIVOS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './css/style.css',
  './src/main.js',
  './src/game.js',
  './src/balance.js',
  './src/render.js',
  './src/ui.js',
  './src/save.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((achou) => {
      if (achou) return achou;
      return fetch(e.request)
        .then((res) => {
          // Guarda o que veio da própria origem, para a segunda visita abrir offline.
          if (res.ok && new URL(e.request.url).origin === location.origin) {
            const copia = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copia));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
