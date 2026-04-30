# ADR 0003: PWA instalável e metadados de descoberta

## Status

Aceito.

## Contexto

O painel é publicado como site estático no GitHub Pages e precisa continuar sem backend, sem SSR, sem CDN e sem build obrigatório. A Etapa 3 exige instalação como PWA, funcionamento offline após a primeira visita, revalidação assíncrona de `data/contratos.js` e melhoria de SEO com metadados estruturados.

## Decisão

Adicionar `manifest.webmanifest`, ícones locais, favicons completos, `service-worker.js`, `offline.html`, `robots.txt`, `sitemap.xml`, Open Graph, Twitter Card e JSON-LD.

O service worker usa cache versionado para o app shell, stale-while-revalidate para `data/contratos.js` e network-first para navegação, com fallback offline. A aplicação registra o SW no carregamento e mostra um aviso com botão "Atualizar agora" quando há uma versão nova aguardando ativação.

A CSP permanece restritiva. Foi necessário trocar `worker-src 'none'` por `worker-src 'self'` para permitir o service worker. O JSON-LD inline recebeu hash SHA-256 em `script-src`, evitando `unsafe-inline`.

## Consequências

- O painel passa a ser instalável em navegadores compatíveis.
- Usuários conseguem abrir o app shell offline após a primeira visita.
- Novas versões de `data/contratos.js` podem entrar por revalidação assíncrona sem limpar cache.
- A descoberta em buscadores e previews sociais passa a ter metadados explícitos.
- Toda inclusão de arquivo novo no shell exige revisar `APP_SHELL` e incrementar `CACHE_VERSION`.

## Alternativas consideradas

- Cachear `data/contratos.js` com cache-first: mais rápido, mas arriscaria dados desatualizados por tempo indeterminado.
- Usar Workbox: reduziria código manual, mas introduziria dependência ou etapa de build desnecessária para o escopo estático.
- Liberar `unsafe-inline` para JSON-LD: mais simples, mas relaxaria a CSP além do necessário.
