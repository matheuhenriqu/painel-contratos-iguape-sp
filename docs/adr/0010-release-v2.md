# ADR 0010: Release v2.0.0

## Status

Aceita em 2026-04-30.

## Contexto

As etapas 0 a 9 transformaram o painel em uma aplicação estática modular, instalável, acessível, com exportações locais, pipeline de dados e qualidade automatizada. A Etapa 10 consolida a entrega para apresentação institucional e manutenção por uma equipe nova.

## Decisão

- Versionar o projeto como `2.0.0` em `package.json`, `package-lock.json` e `manifest.webmanifest`.
- Versionar o service worker com cache `v2.0.0-2026-04-30`.
- Publicar documentação de vitrine no README com screenshots reais, GIF curto, stack, quick start, governança e links para guias técnicos.
- Registrar `CHANGELOG.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md` e relatório cross-browser.
- Manter a CSP sem CDN, sem `unsafe-inline`, sem `unsafe-eval` e com `object-src 'none'`, `frame-src 'none'`, `base-uri 'self'` e `form-action 'none'`.
- Remover a diretiva `upgrade-insecure-requests` porque ela é redundante no GitHub Pages HTTPS e quebra testes locais WebKit em `http://127.0.0.1`.
- Carregar `qrcode.min.js` sob demanda na impressão para reduzir JavaScript inicial.

## Consequências

- A release fica pronta para tag `v2.0.0` e GitHub Release.
- O README passa a ser a porta de entrada para gestores, pessoas desenvolvedoras e mantenedoras.
- A validação local cobre Chrome, Edge, Firefox Playwright e WebKit Playwright nas larguras-alvo.
- Safari macOS, Safari iOS real e Chrome Android real continuam como validações manuais, pois não estão disponíveis no ambiente Windows local.

## Alternativas consideradas

- Manter `upgrade-insecure-requests`: rejeitado por prejudicar o teste local em WebKit sem aumentar a segurança prática no GitHub Pages HTTPS.
- Carregar QRCode no primeiro paint: rejeitado por custo inicial desnecessário para uma funcionalidade usada apenas em impressão.
- Publicar release sem documentação de governança: rejeitado porque dificultaria manutenção por nova equipe.
