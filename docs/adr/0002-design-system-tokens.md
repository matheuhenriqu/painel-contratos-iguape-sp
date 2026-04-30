# ADR 0002: Design system com tokens e temas

## Status

Aceito.

## Contexto

O CSS original concentrava identidade visual, responsividade e estados de componentes em uma folha única. A Etapa 2 exige tema claro, escuro e alto contraste, persistência local e respeito à preferência do sistema, sem build, sem CDN e sem enfraquecer a Content Security Policy.

## Decisão

Adotar CSS Custom Properties em `src/css/tokens.css` para tipografia, espaçamento, raios, sombras, durações, paleta institucional e tokens semânticos. Os temas ficam em `src/css/themes.css`, com `data-theme="light"`, `data-theme="dark"`, `data-theme="hc"` e modo automático sem `data-theme`, controlado por `prefers-color-scheme`.

O CSS foi dividido em partials por componente e importado por `src/css/main.css`. Como o GitHub Pages serve CSS estático normalmente, os `@import` mantêm compatibilidade sem pré-processador.

O bootstrap inicial do tema usa `src/js/theme-bootstrap.js` no `<head>` antes da folha CSS. Essa escolha evita script inline, mantém `script-src 'self'` e elimina o flash branco quando há tema persistido.

## Consequências

- A UI passa a ter quatro modos operacionais: automático, claro, escuro e alto contraste.
- O tema salvo usa a chave `painel.theme` em `localStorage`.
- Gráficos leem tokens computados e são repintados no evento `theme:changed`.
- A impressão força tokens claros para preservar legibilidade em papel.
- O CSS passa a ter mais arquivos, mas continua sem build e fácil de auditar por componente.

## Alternativas consideradas

- Script inline no `<head>`: reduziria uma requisição, mas exigiria relaxar `script-src` com `unsafe-inline`, o que foi evitado.
- Classe no `body`: funcionaria após o carregamento, mas chegaria tarde para evitar flash antes do primeiro paint.
- Variáveis apenas em `:root`: simplificaria o CSS, mas não atenderia alto contraste nem preferência do sistema.
