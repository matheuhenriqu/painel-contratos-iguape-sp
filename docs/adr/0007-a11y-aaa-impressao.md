# ADR 0007: Acessibilidade reforçada e impressão institucional

## Status

Aceito.

## Contexto

O painel é uma aplicação estática para consulta pública e apoio à gestão municipal. As etapas anteriores adicionaram filtros, diálogos, atalhos, cards móveis e visualizações analíticas. A evolução aumentou a quantidade de regiões dinâmicas e a necessidade de uma saída impressa adequada para uso institucional.

## Decisão

- Manter uma única região viva em `#actionFeedback`, usada por um orquestrador em `src/js/ui/feedback.js`.
- Anunciar resultados de filtros com debounce de 600 ms para reduzir ruído em NVDA, VoiceOver e TalkBack.
- Nomear landmarks e seções com `aria-labelledby`, preservando o skip-link e adicionando navegação principal acessível sob foco.
- Reforçar diálogos com trap de foco e restauração do foco para o elemento acionador.
- Exibir badges de status com ícone e texto, garantindo que cor não seja a única pista.
- Manter o modo claro institucional com contraste mínimo AA e foco visível.
- Gerar QR code no cliente com biblioteca local em `assets/vendor/qrcode.min.js`, desenhando SVG por DOM para continuar compatível com CSP estrita.
- Forçar a impressão em paleta clara, com cabeçalho institucional, filtros aplicados, URL canônica, QR code e regras de quebra de página.
- Adicionar `scripts/axe-audit.mjs` para auditoria local com axe-core servido junto do repositório.

## Consequências

- A experiência com leitor de tela fica menos ruidosa, porque contadores e resumos não disputam múltiplas regiões vivas.
- A impressão passa a ter um bloco próprio de metadados, escondido na tela e visível apenas em mídia impressa.
- O QR code depende de um vendor local adicional, sem CDN e sem alteração na CSP.
- O script de auditoria usa Playwright em devDependency; a aplicação publicada continua 100% estática.

## Alternativas Consideradas

- Manter múltiplos `aria-live`: rejeitado por gerar anúncios repetidos ao filtrar.
- Usar QR code por serviço externo: rejeitado por quebrar a regra de não enviar dados para servidor e por exigir domínio externo na CSP.
- Gerar QR code como canvas por biblioteca pronta: rejeitado porque algumas implementações aplicam estilos inline e aumentam o risco de violar CSP.
- Fazer print por PDF server-side: rejeitado por incompatibilidade com GitHub Pages estático.
