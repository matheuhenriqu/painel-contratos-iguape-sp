# Changelog

Todas as mudanças relevantes deste projeto são documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o versionamento segue SemVer quando aplicável.

## [Unreleased]

- Nenhuma mudança pendente registrada.

## [2.0.0] - 2026-04-30

### Adicionado

- Fundação de DX com `package.json`, linters, formatação, estrutura `src/`, `tests/`, `scripts/`, `.github/` e documentação técnica.
- Modularização completa do JavaScript em ES Modules nativos, com estado central, sincronização de URL, dados, UI e utilitários separados.
- Design system com tokens CSS, temas claro, escuro, alto contraste e modo automático persistido.
- PWA instalável com manifesto, service worker, página offline, aviso de atualização e metadados de SEO.
- Sprite SVG local para ícones, lazy-load de Chart.js, virtualização de tabela, memoização e worker de dados.
- Drawer de contrato, cards mobile, atalhos de teclado, filtros salvos, busca avançada, alerta de urgência e drill-down em KPIs.
- Visualizações analíticas em SVG: linha do tempo, heatmap, treemap, sparklines e comparativo gestor/fiscal.
- Acessibilidade reforçada com live region única, landmarks revisados, foco gerenciado, auditoria axe-core e impressão institucional com QR code.
- Exportações CSV, XLSX, PDF e JSON, compartilhamento via Web Share API com fallback e validação visual de dados.
- Pipeline Python para converter planilha XLSX em `data/contratos.js` validado por JSON Schema.
- Testes unitários com Vitest, testes E2E com Playwright, lint multidisciplinar, Lighthouse CI, deploy Pages e templates GitHub.
- README v2, screenshots reais, GIF curto, changelog, contribuição, segurança, código de conduta e ADR de release.

### Alterado

- CSS monolítico quebrado em partials estáticos importados por `src/css/main.css`.
- `index.html` passou a carregar `src/js/main.js` como módulo e manteve `data/contratos.js` como fonte compatível.
- CSP consolidada sem CDN, com scripts próprios, worker próprio, manifesto local e diretivas rígidas para objetos, frames, base URI e formulários.
- QR code de impressão passou a ser carregado sob demanda para reduzir JavaScript inicial.
- Ajustes responsivos removem overflow horizontal em 320 px e mantêm canvases dentro dos painéis.

### Corrigido

- Navegação rápida fora de foco deixou de aparecer parcialmente no topo da página.
- Alerta de urgência inicial evita deslocamento cumulativo de layout na base atual.
- Ambiente local WebKit deixou de forçar recursos `http://127.0.0.1` para HTTPS por diretiva redundante de CSP.

### Segurança

- Dependências de runtime continuam locais em `assets/vendor/`.
- Nenhuma exportação envia dados para servidor.
- Service worker versionado e cache segregado por app shell, dados e runtime.

[Unreleased]: https://github.com/matheuhenriqu/painel-contratos-iguape-sp/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/matheuhenriqu/painel-contratos-iguape-sp/releases/tag/v2.0.0
