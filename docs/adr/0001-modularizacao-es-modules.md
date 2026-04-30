# ADR 0001: Modularização com ES Modules nativos

## Status

Aceito.

## Contexto

O painel era carregado por um `app.js` monolítico com responsabilidades de dados, filtros, URL, tabelas, KPIs, gráficos, exportação, impressão e utilitários no mesmo arquivo. Isso dificultava testes futuros e aumentava o risco de regressões em etapas de manutenção.

O projeto precisa continuar 100% estático, publicável pelo GitHub Pages a partir da raiz, sem etapa obrigatória de build, sem CDN e com Content Security Policy restritiva.

## Decisão

Dividir o código da interface em ES Modules nativos dentro de `src/js/`, mantendo `src/js/main.js` como ponto de entrada carregado por `index.html` com `type="module"`.

As responsabilidades foram separadas em módulos de estado, sincronização de URL, dados, agregações, UI e utilitários. O arquivo `app.js` foi removido para evitar dois pontos de entrada concorrentes.

O Chart.js continua em `assets/vendor/chart.umd.min.js` e ganhou o wrapper local `assets/vendor/chart.module.js`. Esse wrapper exporta o `window.Chart` já existente ou importa dinamicamente o UMD local quando necessário. Os gráficos são inicializados por `IntersectionObserver` apenas quando cada `canvas` entra no viewport e permanecem em cache depois de criados.

A CSP não precisou ser alterada: `script-src 'self'` cobre os módulos próprios e o `import()` de arquivos locais. As diretivas obrigatórias `object-src 'none'`, `frame-src 'none'`, `base-uri 'self'` e `form-action 'none'` foram preservadas.

## Consequências

- O comportamento público e os query params existentes continuam preservados.
- As regras puras de classificação, normalização e agregação ficam isoladas para testes unitários futuros.
- O custo inicial de JavaScript reduz para usuários que não chegam aos gráficos, pois Chart.js passa a ser carregado sob demanda.
- A execução continua sem bundler e sem dependência de servidor.
- Navegadores sem suporte a ES Modules nativos deixam de ser alvo do projeto.

## Alternativas consideradas

- Manter o `app.js` monolítico: menor diff imediato, mas preservaria o acoplamento que bloqueia as próximas etapas.
- Usar bundler com saída pré-compilada: aceitável pelas regras se o output fosse commitado, mas desnecessário para o tamanho atual e adicionaria configuração antes de haver testes.
- Converter Chart.js para pacote ESM real: exigiria nova cadeia de build ou vendor diferente; o wrapper local entrega lazy-load mantendo o artefato já auditado.
