# ADR 0002: Design system com tokens e modo claro institucional

## Status

Aceito. Revisado em 30/04/2026 para manter somente modo claro.

## Contexto

O painel deve refletir a identidade visual do portal oficial da Prefeitura de Iguape
e continuar publicável diretamente pelo GitHub Pages, sem CDN, backend ou etapa de
build obrigatória. A prioridade atual é consistência institucional, contraste AA e
manutenção simples.

## Decisão

Adotar CSS Custom Properties em `src/css/tokens.css` para tipografia, espaçamento,
raios, sombras, durações, paleta oficial e tokens semânticos. As cores base foram
extraídas dos CSS públicos de `https://www.iguape.sp.gov.br` em 30/04/2026.

O projeto passa a operar somente em modo claro. Foram removidos alternância de tema,
`data-theme`, `prefers-color-scheme`, persistência em `localStorage` e bootstrap de
tema no `<head>`.

O CSS continua dividido em partials por componente e importado por `src/css/main.css`.
Como o GitHub Pages serve CSS estático normalmente, os `@import` mantêm compatibilidade
sem pré-processador.

## Consequências

- A UI fica alinhada ao azul institucional `#0f65a2` e ao acento laranja `#f56600`.
- A CSP permanece restritiva, sem script inline novo.
- A superfície visual fica mais previsível para manutenção e impressão.
- Gráficos continuam lendo tokens computados, agora sem necessidade de repintura por troca de tema.
- A remoção do modo escuro reduz JavaScript, CSS e estados visuais a testar.

## Alternativas Consideradas

- Manter temas múltiplos: rejeitado para atender ao requisito atual de modo claro único.
- Script inline no `<head>`: rejeitado por exigir relaxamento desnecessário da CSP.
- Paleta inventada para o painel: rejeitada porque o objetivo é aderência ao portal oficial.
