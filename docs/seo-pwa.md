# SEO e PWA

## Arquivos adicionados

- `manifest.webmanifest`: manifesto instalável com nome, descrição, tema, escopo, start URL e ícones.
- `service-worker.js`: service worker offline-first com cache versionado.
- `offline.html`: fallback de navegação quando a rede não está disponível.
- `robots.txt`: permite indexação e aponta para o sitemap.
- `sitemap.xml`: lista a URL canônica com `lastmod` baseado em `generatedAt`.
- `assets/icons/`: favicons e ícones PWA gerados a partir de `assets/apple-touch-icon.png`.
- `assets/og-image.png`: imagem 1200x630 para Open Graph e Twitter Card.

## Estratégia de cache

- App shell: `index.html`, `offline.html`, `src/css/**`, `src/js/**`, `assets/vendor/**`, `assets/icons/**` e logos usam cache-first com versão.
- Dados: `data/contratos.js` usa stale-while-revalidate. A página pode abrir com dados cacheados e baixar a versão nova em segundo plano.
- Demais recursos: network-first com fallback para cache; navegação cai em `offline.html` se não houver rede.

## Como atualizar a versão do Service Worker

1. Alterar a constante `CACHE_VERSION` em `service-worker.js`.
2. Confirmar que todo novo arquivo de shell entrou em `APP_SHELL`.
3. Publicar a alteração.
4. Abrir o painel uma vez online para instalar o SW novo.
5. Confirmar que o aviso "Uma atualização do painel está disponível." aparece quando há SW novo em espera.
6. Clicar em "Atualizar agora" e verificar o recarregamento.

## Checklist de release PWA

- Rodar Lighthouse em uma URL servida por HTTP local ou GitHub Pages.
- Conferir que o manifesto está válido e contém ícones 192, 512 e 512 maskable.
- Conferir que `service-worker.js` registra sem erro no console.
- No DevTools, abrir Application > Service Workers e confirmar que o SW está ativo.
- No DevTools, usar Network > Offline e recarregar a página após primeira visita; `offline.html` deve aparecer para navegação sem cache e o painel deve abrir se o shell já foi cacheado.
- Atualizar `data/contratos.js`, recarregar online e confirmar que a nova versão entra sem limpar cache.

## Checklist de SEO

- Conferir `<title>`, description, canonical, robots, Open Graph e Twitter Card em `index.html`.
- Validar JSON-LD em <https://validator.schema.org/>.
- Validar preview no Facebook Sharing Debugger: <https://developers.facebook.com/tools/debug/>.
- Validar preview no Twitter Card Validator: <https://cards-dev.twitter.com/validator>.
- Conferir `robots.txt` e `sitemap.xml` publicados na raiz.

## CSP

A política continua restritiva. A Etapa 3 mudou apenas:

- `worker-src 'self'`: necessário para permitir o service worker local.
- Hash SHA-256 no `script-src`: permite o bloco JSON-LD inline sem liberar `unsafe-inline`.

As diretivas `object-src 'none'`, `frame-src 'none'`, `base-uri 'self'` e `form-action 'none'` permanecem preservadas.
