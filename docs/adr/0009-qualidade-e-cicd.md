# ADR 0009: Qualidade automatizada e CI/CD

## Status

Aceito.

## Contexto

O painel evoluiu para PWA, exportações, visualizações SVG e fluxo de dados local. A manutenção precisa impedir regressões sem introduzir backend, build server-side ou dependências runtime via CDN.

## Decisão

Adotamos ESLint flat config, Prettier, Stylelint, HTMLHint, Markdownlint, Vitest, Playwright, axe-core, Lighthouse CI, GitHub Actions e Dependabot. As dependências novas são de desenvolvimento e não entram no runtime publicado pelo GitHub Pages.

Os workflows ficam separados por responsabilidade:

- CI funcional com lint, unitários, E2E, dados e axe;
- Lighthouse CI com orçamentos de qualidade;
- Pages para deploy estático oficial;
- Qualidade agendada para regressões semanais.

## Consequências

Pull requests passam a ter feedback automático antes de publicação. A primeira instalação local exige `npm install`, e os testes E2E podem baixar navegador no CI. O site publicado continua estático porque o output é o próprio repositório, sem etapa de build.

## Alternativas consideradas

- Manter apenas validação manual: simples, mas insuficiente para o volume de funcionalidades.
- Usar bundler com pipeline obrigatório: facilitaria imports e otimizações, mas criaria uma etapa de build desnecessária para GitHub Pages.
- Adicionar Husky e lint-staged: útil, porém optamos por documentar o pre-commit manual para reduzir atrito local nesta etapa.
