# Design System

O painel usa CSS Custom Properties servidas estaticamente em `src/css/`. `main.css` importa tokens, partials por componente, temas e regras de impressão.

## Estrutura

- `src/css/tokens.css`: escala base de cores, tipografia, espaçamentos, raios, sombras, durações e aliases semânticos.
- `src/css/themes.css`: temas `light`, `dark`, `hc` e preferência automática por `prefers-color-scheme`.
- `src/css/partials/`: estilos por componente: base, layout, topbar, filtros, KPIs, painéis, gráficos, tabelas, badges, botões, formulários, rodapé, responsivo e impressão.

## Temas

- `auto`: remove `data-theme` do `<html>` e respeita `prefers-color-scheme`.
- `light`: aplica `data-theme="light"`.
- `dark`: aplica `data-theme="dark"`.
- `hc`: aplica `data-theme="hc"` com preto, branco, amarelo, bordas reforçadas e links sublinhados.

O tema é persistido em `localStorage` com a chave `painel.theme`. O script `src/js/theme-bootstrap.js` roda no `<head>` antes do CSS para evitar flash de tema.

## Tokens

### Tipografia

`--font-family-sans`, `--font-size-xs`, `--font-size-sm`, `--font-size-md`, `--font-size-lg`, `--font-size-xl`, `--font-size-2xl`, `--font-size-3xl`, `--font-weight-medium`, `--font-weight-semibold`, `--font-weight-bold`.

### Espaçamento

`--space-0`, `--space-1`, `--space-2`, `--space-3`, `--space-4`, `--space-5`, `--space-6`, `--space-7`, `--space-8`, `--space-10`, `--space-12`.

### Raios, sombras e movimento

`--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-full`, `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--duration-fast`, `--duration-normal`, `--duration-slow`.

### Paleta base

`--color-iguape-green-900`, `--color-iguape-green-800`, `--color-iguape-green-700`, `--color-iguape-green-500`, `--color-iguape-teal-700`, `--color-neutral-0`, `--color-neutral-50`, `--color-neutral-100`, `--color-neutral-200`, `--color-neutral-300`, `--color-neutral-500`, `--color-neutral-800`, `--color-neutral-950`, `--color-gold-600`, `--color-red-700`, `--color-blue-700`, `--color-plum-700`.

### Semânticos

`--color-bg`, `--color-bg-canvas`, `--color-surface`, `--color-surface-muted`, `--color-surface-accent`, `--color-text`, `--color-text-muted`, `--color-text-strong`, `--color-border`, `--color-border-strong`, `--color-brand`, `--color-brand-strong`, `--color-brand-contrast`, `--color-success`, `--color-warning`, `--color-danger`, `--color-info`, `--color-plum`, `--color-focus-ring`, `--color-focus-ring-soft`, `--color-link`, `--color-on-solid`.

### Superfícies de componente

`--color-topbar-text`, `--color-topbar-muted`, `--color-topbar-border`, `--color-topbar-bg`, `--color-logo-frame-bg`, `--color-logo-frame-border`, `--color-brand-soft`, `--color-success-soft`, `--color-warning-soft`, `--color-warning-border`, `--color-danger-soft`, `--color-info-soft`, `--color-neutral-soft`, `--color-table-head-bg`, `--color-table-row-hover`, `--color-page-background`.

### Aliases legados

`--bg`, `--surface`, `--surface-2`, `--surface-3`, `--ink`, `--muted`, `--line`, `--line-strong`, `--green`, `--teal`, `--amber`, `--red`, `--plum`, `--blue`, `--navy`, `--gold`, `--header`, `--header-2`, `--shadow`, `--shadow-soft`, `--ring`.

## Contraste

Pares mínimos validados por cálculo WCAG AA:

- Claro: `--color-text` `#14231f` em `--color-surface` `#ffffff`: 16,28:1.
- Claro: `--color-text-muted` `#5d6b66` em `--color-surface` `#ffffff`: 5,58:1.
- Claro: `--color-brand-contrast` `#ffffff` em `--color-brand` `#155f49`: 7,59:1.
- Escuro: `--color-text` `#e6efe9` em `--color-surface` `#14201d`: 14,26:1.
- Escuro: `--color-text-muted` `#b4c8bf` em `--color-surface` `#14201d`: 9,53:1.
- Escuro: `--color-brand-contrast` `#07110e` em `--color-brand` `#2faa83`: 6,57:1.
- Alto contraste: `#ffffff` em `#000000`: 21,00:1.
- Alto contraste: `#000000` em `#ffff00`: 19,56:1.

## Regras de uso

- Use tokens semânticos nos componentes; tokens base ficam para ajustes do próprio design system.
- Não use cores hex novas em partials sem antes criar ou reaproveitar token.
- Estados de foco devem usar `--color-focus-ring` com `outline-offset: 2px`.
- Animações e transições devem usar `--duration-*` e respeitar `prefers-reduced-motion: reduce`.
- A impressão força tema claro e não depende da preferência salva.
- A logo institucional permanece em uma moldura clara para manter legibilidade nos temas escuro e alto contraste.

## Sketch dos temas

Ver estes sketches como referência rápida para revisão visual:

- [Tema claro](#tema-claro)
- [Tema escuro](#tema-escuro)
- [Alto contraste](#alto-contraste)

### Tema claro

| Superfície               | Texto                       | Ação                         |
| ------------------------ | --------------------------- | ---------------------------- |
| `--color-surface` branco | `--color-text` verde escuro | `--color-brand` verde Iguape |

### Tema escuro

| Superfície                          | Texto                      | Ação                           |
| ----------------------------------- | -------------------------- | ------------------------------ |
| `--color-surface` verde quase preto | `--color-text` verde claro | `--color-brand` verde luminoso |

### Alto contraste

| Superfície | Texto  | Ação                     |
| ---------- | ------ | ------------------------ |
| preto      | branco | amarelo com borda branca |
