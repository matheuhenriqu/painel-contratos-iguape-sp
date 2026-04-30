# Design System

O painel usa CSS Custom Properties servidas estaticamente em `src/css/`. O arquivo
`main.css` importa tokens, partials por componente, regras de tema claro e impressao.

## Estrutura

- `src/css/tokens.css`: cores oficiais, tipografia, espacamentos, raios, sombras, duracoes e aliases semanticos.
- `src/css/themes.css`: aplicacao dos tokens no tema claro unico.
- `src/css/partials/`: estilos por componente: base, layout, topbar, filtros, KPIs, paineis, graficos, tabelas, badges, botoes, formularios, rodape, responsivo e impressao.

## Paleta Oficial

As cores foram extraidas dos CSS publicos de `https://www.iguape.sp.gov.br` em 30/04/2026.

| Uso              | Token                       | Hex       |
| ---------------- | --------------------------- | --------- |
| Primaria         | `--color-primary`           | `#0f65a2` |
| Secundaria       | `--color-secondary`         | `#1169b9` |
| Apoio azul       | `--color-official-blue-600` | `#527ed3` |
| Acento           | `--color-accent`            | `#f56600` |
| Destaque         | `--color-highlight`         | `#fbbd0a` |
| Sucesso          | `--color-success`           | `#3d6d92` |
| Perigo           | `--color-danger`            | `#c41726` |
| Fundo            | `--color-bg`                | `#f5f6f8` |
| Superficie       | `--color-surface`           | `#ffffff` |
| Texto            | `--color-text`              | `#333333` |
| Texto secundario | `--color-muted`             | `#444444` |
| Borda            | `--color-border`            | `#e1e3e5` |

## Tema

O projeto trabalha somente em modo claro. Nao ha `data-theme`, alternancia de tema,
`prefers-color-scheme` ou persistencia em `localStorage` para tema. Essa decisao reduz
complexidade visual e aproxima o painel da identidade atual do portal institucional.

## Icones

A biblioteca padrao e Lucide, vendorizada localmente como sprite em
`assets/icons/sprite.svg`. A escolha mantem o site 100% estatico, sem CDN, com icones
outline consistentes, leves e controlados por CSS.

Regras:

- Todos os icones usam `<svg class="icon" aria-hidden="true" focusable="false">`.
- O sprite define `fill="none"`, `stroke="currentColor"`, `stroke-width="2"`,
  `stroke-linecap="round"` e `stroke-linejoin="round"`.
- Botoes com icone e texto usam `gap` e `align-items: center`.
- Icones decorativos ficam com `aria-hidden="true"`; a acao acessivel fica no texto ou no `aria-label`.

## Tokens

### Tipografia

`--font-family-sans`, `--font-size-xs`, `--font-size-sm`, `--font-size-md`,
`--font-size-lg`, `--font-size-xl`, `--font-size-2xl`, `--font-size-3xl`,
`--font-weight-medium`, `--font-weight-semibold`, `--font-weight-bold`.

### Espacamento

Escala baseada em 4px: `--space-0`, `--space-1`, `--space-2`, `--space-3`,
`--space-4`, `--space-5`, `--space-6`, `--space-7`, `--space-8`,
`--space-10`, `--space-12`.

### Semanticos

`--color-bg`, `--color-bg-canvas`, `--color-surface`, `--color-surface-muted`,
`--color-surface-accent`, `--color-text`, `--color-muted`, `--color-text-muted`,
`--color-text-strong`, `--color-border`, `--color-border-strong`,
`--color-brand`, `--color-brand-strong`, `--color-brand-contrast`,
`--color-success`, `--color-warning`, `--color-danger`, `--color-info`,
`--color-focus-ring`, `--color-focus-ring-soft`, `--color-link`.

## Responsividade

Breakpoints usados:

- `1280px`: reorganizacao do shell e tabelas largas.
- `1024px`: visualizacoes analiticas passam para uma coluna.
- `768px`: topbar, filtros e controles entram em layout mobile.
- `640px`: acoes e KPIs usam coluna unica quando necessario.
- `360px`: ajustes finos para telas estreitas reais.

## Contraste

Pares principais validados por axe-core e Playwright:

- `#333333` em `#ffffff`: AA.
- `#444444` em `#ffffff`: AA.
- `#ffffff` em `#0f65a2`: AA.
- `#2f2100` em `#fbbd0a`: AA.
- `#ffffff` em `#c41726`: AA.

## Regras De Uso

- Use tokens semanticos nos componentes; tokens oficiais ficam concentrados em `tokens.css`.
- Nao use novas cores hex em partials sem antes criar ou reaproveitar token.
- Estados de foco usam `--color-focus-ring` com `outline-offset: 2px`.
- Transicoes usam `--duration-*` e respeitam `prefers-reduced-motion: reduce`.
- Impressao usa paleta neutra clara independente do estado da pagina.
