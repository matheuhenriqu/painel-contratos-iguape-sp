# Relatório cross-browser — 2026-04-30

## Ambiente

- URL testada: `http://127.0.0.1:4173/`
- Servidor: `node scripts/static-server.mjs 4173`
- Sistema: Windows local do ambiente Codex
- Dataset: `data/contratos.js`, 158 registros
- Tema: claro
- Critérios automatizados: carregamento do painel, pelo menos 10 KPIs renderizados, ausência de erros/warnings no console e ausência de overflow horizontal no documento.

## Larguras validadas

320, 360, 390, 414, 430, 540, 768, 1024, 1280, 1440 e 1920 px.

## Resultado automatizado

| Navegador          | Motor               | Larguras | Console        | Overflow horizontal | Resultado |
| ------------------ | ------------------- | -------- | -------------- | ------------------- | --------- |
| Chrome             | Chromium do sistema | 11/11    | 0 avisos/erros | Não                 | OK        |
| Edge               | Chromium do sistema | 11/11    | 0 avisos/erros | Não                 | OK        |
| Firefox Playwright | Gecko               | 11/11    | 0 avisos/erros | Não                 | OK        |
| WebKit Playwright  | WebKit              | 11/11    | 0 avisos/erros | Não                 | OK        |

## Dispositivos reais

| Alvo                | Status          | Observação                                                                                             |
| ------------------- | --------------- | ------------------------------------------------------------------------------------------------------ |
| Safari macOS        | Pendente manual | Indisponível no ambiente Windows. Cobertura aproximada por WebKit Playwright.                          |
| Safari iOS real     | Pendente manual | Requer iPhone/iPad físico ou BrowserStack equivalente.                                                 |
| Chrome Android real | Pendente manual | Requer dispositivo Android físico ou laboratório remoto. Viewports móveis foram validados em Chromium. |

## Ajustes aplicados durante a validação

- Corrigido overflow de canvases pendentes em 320 px com `max-width: 100%`.
- Ajustada navegação rápida para ficar totalmente fora da tela quando não está focada.
- Removida a diretiva CSP `upgrade-insecure-requests`, redundante no GitHub Pages HTTPS e incompatível com testes WebKit locais em HTTP.

## Próxima validação recomendada

Antes de uma apresentação pública, abrir a URL de produção em Safari macOS, Safari iOS real e Chrome Android real, repetir filtros, drawer, exportações principais e instalação PWA.
