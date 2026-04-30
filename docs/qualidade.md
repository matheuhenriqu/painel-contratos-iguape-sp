# Qualidade automatizada

Este projeto usa uma camada de qualidade local e em CI para manter o painel estático, acessível e seguro antes de publicar no GitHub Pages.

## Comandos locais

```bash
npm install
npm run lint
npm test
npm run test:e2e
npm run validate:data
npm run axe:audit
npm run lhci
```

`npm run lint` executa ESLint flat config, Prettier, Stylelint, HTMLHint e Markdownlint. `npm test` roda Vitest com cobertura V8 e falha abaixo de 80% nos módulos críticos de dados e utilitários.

## Testes unitários

Os testes em `tests/unit/` cobrem normalização, classificação dos 10 status, agregações, qualidade cadastral, busca, datas e formatação PT-BR. A cobertura mira os módulos em `src/js/data/` e `src/js/utils/`, pois concentram regras de negócio reaproveitáveis.

## Testes E2E

Os testes em `tests/e2e/` usam Playwright e cobrem:

- carregamento do painel, KPIs e console sem erros;
- filtros, busca simples, busca com operadores e ordenação;
- exportações CSV, XLSX, PDF e JSON;
- detalhe de contrato com deep-link;
- visualização mobile em cards e atalhos de teclado;
- auditoria axe-core na tela principal.

Para rodar localmente em Windows sem browsers do Playwright instalados, defina:

```powershell
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"
npm run test:e2e
```

## GitHub Actions

O repositório possui quatro workflows:

- `ci.yml`: lint, Vitest, Playwright, validação de dados e axe-core em push/PR para `main`;
- `lighthouse.yml`: Lighthouse CI com orçamentos mínimos de Performance 95, Acessibilidade 100, Best Practices 100 e SEO 100;
- `pages.yml`: deploy oficial do GitHub Pages a partir da raiz do repositório após push em `main`;
- `quality-nightly.yml`: regressão semanal e execução manual para validar a base entre releases.

## Dependabot

`.github/dependabot.yml` monitora dependências npm de desenvolvimento e GitHub Actions semanalmente. Atualizações de bibliotecas de runtime continuam exigindo arquivo vendor local em `assets/vendor/`, sem CDN.

## Pre-commit

Husky e lint-staged não foram adicionados nesta etapa para evitar mais dependências e hooks locais obrigatórios. Antes de abrir PR, rode manualmente:

```bash
npm run lint
npm test
npm run validate:data
```

## Checklist para PR

- a URL com query params continua preservada;
- exportações não enviam dados para servidor;
- CSP continua restritiva;
- Lighthouse e axe-core sem regressão;
- dados validados antes do commit.
