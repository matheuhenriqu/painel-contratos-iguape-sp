# ADR 0004 - Virtualização, sprite SVG e carregamento progressivo

## Contexto

A Etapa 4 exige manter o painel estático e publicável no GitHub Pages, mas reduzir o JavaScript enviado e manter a tabela fluida com bases maiores, incluindo uma simulação de 1.000 contratos.

O projeto ainda carregava o runtime completo do Lucide e renderizava todas as linhas solicitadas de uma vez quando o usuário escolhia "Mostrar todos". Os gráficos já eram carregados por módulo dinâmico, mas não tinham placeholder visual nem cache explícito para agregações.

## Decisão

- Substituir o runtime `assets/vendor/lucide.min.js` por `assets/icons/sprite.svg`, contendo somente os ícones usados pela interface.
- Usar `<svg><use href="assets/icons/sprite.svg#..."></use></svg>` em marcação estática e templates de UI.
- Manter Chart.js local, mas inicializar cada canvas somente quando estiver próximo da viewport por `IntersectionObserver` com `rootMargin: 200px` e `threshold: 0.1`.
- Exibir skeletons CSS durante a espera dos gráficos e durante a normalização inicial dos dados.
- Normalizar e classificar a base em `src/js/workers/dataset.worker.js`, com fallback automático para a thread principal quando Worker não estiver disponível.
- Virtualizar a tabela principal quando o recorte carregado ultrapassar 100 linhas, renderizando apenas a janela visível com buffer de 10 linhas.
- Memoizar filtros e agregações dos gráficos com LRU de 8 entradas.

## Consequências

- O JavaScript entregue deixa de incluir o runtime Lucide, reduzindo centenas de KB antes da interação.
- A tabela consegue lidar melhor com bases grandes sem inserir 1.000 linhas simultaneamente no DOM.
- O service worker precisa versionar o novo app shell para remover o cache antigo do Lucide e incluir o sprite, o Worker e o helper de ícones.
- A virtualização usa altura média medida das linhas renderizadas; linhas com conteúdo muito desigual podem ter pequenas variações de scroll, mas a leitura de tela recebe `aria-label` com "Linha X de N".

## Alternativas consideradas

- Manter Lucide global e apenas atrasar `createIcons()`: reduz pouca coisa, pois o runtime continuaria sendo baixado.
- Usar biblioteca externa de virtualização: recusado para preservar o projeto sem dependência runtime adicional.
- Mover todos os filtros para Worker: adiado porque filtros e URL ainda são simples e a memoização resolve o custo atual.
