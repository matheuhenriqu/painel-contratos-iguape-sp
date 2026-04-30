# ADR 0006 - Visualizações analíticas avançadas

## Status

Aceito em 2026-04-29.

## Contexto

O painel já apresentava KPIs, gráficos Chart.js e tabelas filtráveis. Para apoiar o uso gestor no dia a dia, a Etapa 6 pediu leituras mais profundas: linha do tempo, heatmap de vencimentos, treemap de empresas, sparklines, drill-down e comparativo por responsável.

As restrições do projeto permanecem:

- site 100% estático em GitHub Pages;
- sem CDN e sem novas dependências de runtime;
- CSP restritiva;
- acessibilidade preservada;
- filtros e query params atuais sem quebra.

## Decisão

Implementar as novas visualizações em SVG puro dentro de `src/js/ui/advanced-visualizations.js`, com utilitários compartilhados em `src/js/utils/svg.js`.

As visualizações usam os mesmos registros normalizados e filtrados já calculados por `main.js`. Interações de drill-down chamam `applyFilterPatch()`, preservando sincronização com URL, selects, chips e tabelas.

Chart.js continua limitado aos gráficos existentes e recebe apenas handlers de clique para drill-down. Timeline, heatmap, treemap, sparklines e comparativo não dependem de bibliotecas externas.

## Consequências

Positivas:

- Mantém o painel estático, sem build e sem CDN.
- Reduz custo de runtime por usar SVG simples para visualizações novas.
- Garante exportação PNG local sem servidor.
- Facilita testes futuros de dados porque as visualizações consomem o mesmo estado filtrado.

Negativas:

- O algoritmo squarify é uma implementação local simples e pode ser menos sofisticado que bibliotecas dedicadas.
- Drill-down dentro de canvas Chart.js não expõe cada barra/fatia como elemento DOM individual; por isso as visualizações SVG novas recebem a cobertura acessível mais completa.
- Exportar PNG depende de suporte moderno a `canvas.toBlob()`, hoje disponível nos navegadores alvo.

## Alternativas consideradas

1. Usar D3.js local em `assets/vendor/`.
   - Rejeitado nesta etapa para evitar aumentar o JavaScript enviado e a superfície de manutenção.

2. Migrar todos os gráficos Chart.js para SVG.
   - Rejeitado por ampliar demais o escopo e arriscar regressão visual.

3. Renderizar visualizações em `<canvas>`.
   - Rejeitado para timeline, heatmap e treemap porque SVG oferece melhor semântica, foco e exportação textual equivalente.
