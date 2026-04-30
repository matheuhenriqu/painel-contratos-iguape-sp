# Como contribuir

Obrigado por ajudar a manter o Painel de Contratos de Iguape/SP. O projeto é estático, publicado no GitHub Pages e prioriza acessibilidade, segurança, performance e rastreabilidade dos dados.

## Ambiente

```bash
npm install
npm run serve
```

Abra `http://127.0.0.1:4173/`.

## Padrão de commits

Use Conventional Commits em PT-BR:

- `feat:` para funcionalidade.
- `fix:` para correção.
- `docs:` para documentação.
- `test:` para testes.
- `refactor:` para reorganização sem mudança de comportamento.
- `perf:` para performance.
- `a11y:` para acessibilidade.
- `ci:` para pipelines.
- `chore:` para manutenção.

Inclua escopo quando ajudar: `docs(readme): atualiza guia de dados`.

## Processo de PR

1. Abra uma branch curta a partir de `main`.
2. Mantenha mudanças pequenas e relacionadas.
3. Preserve a compatibilidade das URLs com query params.
4. Não adicione CDN nem backend.
5. Atualize documentação quando mudar comportamento, dados, arquitetura ou fluxo de uso.
6. Preencha o template de PR com objetivo, mudanças, riscos e como testar.

## Testes obrigatórios

```bash
npm run lint
npm test
npm run test:e2e
npm run validate:data
npm run axe:audit
```

Antes de mudanças visuais relevantes, gere ou atualize evidências em `docs/screenshots/` e rode Lighthouse local ou no CI.

## Dados

Atualize `data/contratos.js` apenas pelo pipeline:

```bash
python -m pip install -r scripts/requirements.txt
python scripts/xlsx_to_js.py contratos.xlsx --sheet CONTRATOS --output data/contratos.js
npm run validate:data
```

O formato `window.CONTRATOS_DATA = { source, sheet, generatedAt, recordCount, records: [...] }` deve continuar retrocompatível.
