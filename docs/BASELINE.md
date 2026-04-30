# Baseline técnico

Etapa 0/10: snapshot antes de qualquer mudança funcional.

## Tamanhos atuais

| Arquivo                          |   Tamanho | Linhas |
| -------------------------------- | --------: | -----: |
| `index.html`                     |  20,86 KB |    441 |
| `styles.css`                     |  35,77 KB |  2.121 |
| `app.js`                         |  72,88 KB |  2.022 |
| `data/contratos.js`              |  86,05 KB |  2.852 |
| `assets/vendor/chart.umd.min.js` | 201,73 KB |     20 |
| `assets/vendor/lucide.min.js`    | 388,63 KB |     12 |

## Contagens estáticas

| Item                                                                                                         | Contagem |
| ------------------------------------------------------------------------------------------------------------ | -------: |
| Funções declaradas em `app.js`                                                                               |      139 |
| Classes CSS em `styles.css`                                                                                  |      121 |
| IDs no `index.html`                                                                                          |       73 |
| Listeners (`addEventListener`/`addListener`)                                                                 |       21 |
| Seletores resolvidos via `queryRequired`, `queryAll`, `querySelector`, `querySelectorAll` e `getElementById` |       54 |
| Elementos `<canvas>`                                                                                         |        8 |
| Elementos `<select>`                                                                                         |        7 |

## Snapshot dos dados

| Campo               | Valor                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------- |
| Fonte               | `data/contratos.js`                                                                   |
| Formato publico     | `window.CONTRATOS_DATA = { source, sheet, generatedAt, recordCount, records: [...] }` |
| `recordCount` atual | 158                                                                                   |
| `generatedAt` atual | `2026-04-23T21:17:18`                                                                 |

## Lighthouse manual

rodar pageSpeed Insights ou DevTools Lighthouse e colar aqui antes de começar a Etapa 1

### Mobile

| Categoria      | Pontuação | Data | Observações |
| -------------- | --------: | ---- | ----------- |
| Performance    |           |      |             |
| Acessibilidade |           |      |             |
| Best Practices |           |      |             |
| SEO            |           |      |             |

### Desktop

| Categoria      | Pontuação | Data | Observações |
| -------------- | --------: | ---- | ----------- |
| Performance    |           |      |             |
| Acessibilidade |           |      |             |
| Best Practices |           |      |             |
| SEO            |           |      |             |

## Como preencher

1. Abrir a versão publicada ou servir localmente com `npm run serve`.
2. Rodar Lighthouse em mobile e desktop.
3. Registrar pontuações, data da medição, URL avaliada e observações relevantes.
4. Guardar prints ou links dos relatórios quando possível.

## Etapa 4 - baseline de performance local

Data: 2026-04-28.

Ambiente: servidor estático local em `http://127.0.0.1:4173/`, Chrome headless instalado no Windows, Playwright usando o Chrome do sistema.

### Tamanhos após a Etapa 4

| Arquivo                            |   Tamanho | Linhas |
| ---------------------------------- | --------: | -----: |
| `index.html`                       |  29,97 KB |    554 |
| `src/css/main.css`                 |   0,58 KB |     16 |
| `src/css/partials/base.css`        |   2,91 KB |    154 |
| `src/css/partials/charts.css`      |   1,35 KB |     67 |
| `src/css/partials/tables.css`      |   3,39 KB |    165 |
| `src/js/main.js`                   |   7,23 KB |    220 |
| `src/js/ui/charts.js`              |  13,78 KB |    366 |
| `src/js/ui/filters.js`             |  11,57 KB |    287 |
| `src/js/ui/table.js`               |  15,35 KB |    393 |
| `src/js/workers/dataset.worker.js` |   0,55 KB |     15 |
| `src/js/utils/icons.js`            |   0,33 KB |      6 |
| `data/contratos.js`                |  86,05 KB |  2.852 |
| `assets/icons/sprite.svg`          |  10,54 KB |    259 |
| `assets/vendor/chart.module.js`    |   0,09 KB |      4 |
| `assets/vendor/chart.umd.min.js`   | 201,73 KB |     20 |

### Comparativo Etapa 0 -> Etapa 4

| Item                           |        Antes |       Depois | Observação                                                                |
| ------------------------------ | -----------: | -----------: | ------------------------------------------------------------------------- |
| Runtime Lucide                 | 388,63 KB JS |      0 KB JS | Removido de `assets/vendor/` e substituído por sprite local.              |
| Sprite de ícones               |         0 KB | 10,54 KB SVG | Contém somente os ícones usados pela UI.                                  |
| Delta aproximado de JS enviado |            - |   -379,49 KB | Considera remoção do Lucide e acréscimos nos módulos tocados nesta etapa. |
| Worker de dados                |          Não |          Sim | `src/js/workers/dataset.worker.js`, com fallback para thread principal.   |
| Tabela virtualizada            |          Não |          Sim | Ativa quando o recorte renderizado ultrapassa 100 linhas.                 |

### Verificações locais da Etapa 4

| Verificação                                                                               | Resultado                                               |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `node --check` em `src/js/**/*.js`, `service-worker.js` e `assets/vendor/chart.module.js` | OK com Node empacotado do workspace.                    |
| `git diff --check`                                                                        | OK; apenas avisos esperados de normalização CRLF -> LF. |
| Console no Chrome headless com a base real de 158 contratos                               | 0 erros/warnings.                                       |
| Chart.js antes da rolagem                                                                 | `window.Chart === false`.                               |
| Chart.js após rolar até o primeiro canvas                                                 | `window.Chart === true`.                                |
| Ícones Lucide via runtime                                                                 | 0 referências `data-lucide` no DOM.                     |
| Fixture `tests/fixtures/large-dataset.js`                                                 | 1.000 registros, 763 em acompanhamento.                 |
| Virtualização com fixture e "Mostrar todos"                                               | Ativa; 22 a 28 linhas reais renderizadas por janela.    |
| Console no Chrome headless com fixture de 1.000 registros                                 | 0 erros/warnings.                                       |
| Pronto para uso em 3G sintético, cache frio local                                         | 4,205 s no `python http.server` sem HTTP/2/gzip.        |
| Pronto para uso em 3G sintético, cache aquecido                                           | 1,026 s após primeira visita e cache do app shell.      |

### Lighthouse pós-Etapa 4

O Lighthouse não foi aferido automaticamente nesta sessão porque não há Lighthouse CLI instalado no ambiente. Antes da Etapa 5, rodar PageSpeed Insights ou DevTools Lighthouse e preencher:

| Categoria              | Antes Etapa 0 | Depois Etapa 4 | Data | Observações |
| ---------------------- | ------------: | -------------: | ---- | ----------- |
| Performance mobile     |               |                |      |             |
| Acessibilidade mobile  |               |                |      |             |
| Best Practices mobile  |               |                |      |             |
| SEO mobile             |               |                |      |             |
| Performance desktop    |               |                |      |             |
| Acessibilidade desktop |               |                |      |             |
| Best Practices desktop |               |                |      |             |
| SEO desktop            |               |                |      |             |

## Etapa 10 - Lighthouse final local

Data: 2026-04-30.

Ambiente: `http://127.0.0.1:4173/`, Chrome do sistema em modo headless, Lighthouse CLI local. A execução direta gravou o relatório JSON, mas o Chrome no Windows retornou `EPERM` ao remover a pasta temporária depois da coleta; as pontuações abaixo foram lidas do relatório gerado. O Lighthouse CI também foi executado e falhou apenas no orçamento de Performance, com 70/100.

### Comparativo Antes (Etapa 0) -> Depois (Etapa 10)

| Categoria             | Antes Etapa 0 | Depois Etapa 10 local |  Meta | Observações                                                                                                                                                                                                                                  |
| --------------------- | ------------: | --------------------: | ----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Performance mobile    |   Não aferido |                 70-72 |    95 | `FCP 4,5 s`, `LCP 4,7 s`, `TBT 30 ms`, `CLS 0`. A pontuação local ainda sofre com muitos módulos/partials servidos em HTTP/1.1 sem compressão. Confirmar em GitHub Pages/CI e priorizar bundle estático opcional se a meta continuar abaixo. |
| Acessibilidade mobile |   Não aferido |                   100 |   100 | Zero regressão local.                                                                                                                                                                                                                        |
| Best Practices mobile |   Não aferido |                   100 |   100 | CSP consolidada, sem CDN e sem `unsafe-inline`/`unsafe-eval`.                                                                                                                                                                                |
| SEO mobile            |   Não aferido |                   100 |   100 | Metadados, canonical, manifest, robots, sitemap e JSON-LD presentes.                                                                                                                                                                         |
| PWA                   |   Não aferido |    Verificação manual | Verde | Manifesto, service worker, offline page e cache versionado existem; a versão atual do Lighthouse CLI não expôs categoria PWA no JSON.                                                                                                        |

### Ajustes de performance e estabilidade feitos na Etapa 10

- QR code de impressão passou a carregar `assets/vendor/qrcode.min.js` sob demanda.
- Canvases pendentes respeitam `max-width: 100%`, removendo overflow em 320 px.
- Alerta de urgência atual é renderizado no HTML inicial para evitar deslocamento cumulativo de layout na base atual.
- Navegação rápida fica totalmente fora da tela quando não está focada.
- CSP removeu `upgrade-insecure-requests`, redundante no GitHub Pages HTTPS e incompatível com validação WebKit local em HTTP.

Relatório temporário do LHCI: <https://storage.googleapis.com/lighthouse-infrastructure.appspot.com/reports/1777556959812-19359.report.html>.
