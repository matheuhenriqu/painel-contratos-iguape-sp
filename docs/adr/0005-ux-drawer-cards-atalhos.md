# ADR 0005 - UX de detalhe, cards, atalhos e filtros salvos

## Contexto

A Etapa 5 pede recursos de uso diário para gestores sem abandonar a arquitetura estática do GitHub Pages. As novas funcionalidades precisam preservar URLs com query params, acessibilidade, CSP restritiva e execução 100% client-side.

## Decisão

- Usar `<dialog>` nativo para detalhe de contrato e ajuda de atalhos.
- Usar `#contrato/<id>` para deep-link de contrato, preservando a query string atual.
- Criar cards mobile acessíveis em `article`, alternados por preferência local `painel.viewMode`.
- Persistir favoritos de filtros em `localStorage` na chave `painel.savedFilters`, com limite de 10 itens e importação/exportação JSON local.
- Implementar atalhos em módulo próprio, ignorando eventos quando o foco está em campos editáveis.
- Manter busca avançada em `src/js/utils/search.js`, separada da UI para facilitar testes na Etapa 9.
- Aplicar alerta crítico por sessão com `sessionStorage`, sem backend.

## Consequências

- O painel ganha novas superfícies interativas, mas continua sem dependência externa ou build obrigatório.
- O hash passa a ter dois usos: `#contrato/<id>` para detalhes e `#filtro/<nome>` para filtros salvos aplicados.
- A busca fuzzy é leve e adequada ao volume atual; para bases muito maiores, pode ser movida para Worker em etapa futura.

## Alternativas consideradas

- Criar rota separada para detalhe: descartado porque GitHub Pages estático e URLs atuais por query string devem permanecer simples.
- Usar biblioteca de modal/focus trap: descartado para evitar dependência runtime.
- Salvar favoritos em arquivo remoto: descartado porque violaria o requisito de não ter backend.
