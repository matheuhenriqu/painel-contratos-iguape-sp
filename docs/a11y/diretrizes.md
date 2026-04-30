# Diretrizes de acessibilidade

Este painel mira WCAG 2.2 AA como requisito mínimo e aplica práticas AAA quando não prejudicam a clareza visual, a performance ou a publicação estática no GitHub Pages.

## Landmarks e estrutura

- O cabeçalho usa `header role="banner"`.
- A navegação principal fica disponível sob foco por teclado, logo após o skip-link.
- O conteúdo principal usa `main role="main"` e mantém `tabindex="-1"` para o skip-link.
- Filtros ficam em `aside aria-labelledby`.
- Seções principais usam `aria-labelledby` apontando para `h2` visível ou `sr-only`.
- O rodapé usa `footer role="contentinfo"`.

## Regiões vivas

- O painel mantém uma única região viva: `#actionFeedback`.
- Resultados de filtros são anunciados após debounce de 600 ms.
- Ações como copiar, exportar, trocar tema e atualização disponível são anunciadas uma vez.
- Conteúdos que já mudam visualmente, como resumo e contadores, não usam `aria-live` próprio para evitar repetição em leitores de tela.

## Foco e teclado

- O skip-link leva ao `main`.
- Diálogos nativos gerenciam `Esc`, prendem o foco dentro do modal e restauram o foco para o acionador.
- Ao limpar filtros pelo botão, o foco volta para a busca.
- Ao aplicar drill-down por KPI ou visualização, o foco vai para a primeira linha visível.
- Atalhos documentados no painel `?` não executam quando o foco está em `input`, `textarea`, `select` ou conteúdo editável.

## Contraste e cor

- O tema de alto contraste usa preto, branco e amarelo com bordas reforçadas.
- Badges de status combinam ícone e texto; cor nunca é a única forma de identificação.
- Links no tema de alto contraste são sublinhados.
- Estados de foco usam anel visível com `--color-focus-ring`.

## Movimento

- Skeletons, transições, animações de entrada e hover respeitam `prefers-reduced-motion: reduce`.
- Visualizações SVG não dependem de animação para transmitir informação.

## Impressão

- A impressão força paleta clara e neutra, independente do tema ativo.
- O relatório impresso inclui brasão, prefeitura, data/hora do recorte, filtros aplicados, URL e QR code da consulta atual.
- Tabelas repetem cabeçalho por página e evitam quebra no meio da linha.

## Auditoria

Rode:

```bash
npm run axe:audit
```

O comando grava `docs/a11y/audit-AAAA-MM-DD.md` e falha se houver violações ou itens incompletos acionáveis do axe-core. Itens `color-contrast` marcados como `incomplete` por SVGs e camadas decorativas continuam cobertos pela revisão de tokens e pelos pares documentados no design system.
