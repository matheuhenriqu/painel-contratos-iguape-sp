# Segurança

## Versões suportadas

| Versão | Suporte |
| ------ | ------- |
| 2.x    | Sim     |
| 1.x    | Não     |

## Como reportar vulnerabilidades

Abra um aviso privado para a pessoa mantenedora `@matheuhenriqu` pelo GitHub ou use o canal institucional disponível antes de publicar detalhes técnicos. Inclua:

- descrição do problema;
- impacto esperado;
- passos de reprodução;
- navegador e sistema operacional;
- evidências, quando houver.

## Escopo

Estão no escopo:

- Content Security Policy;
- service worker e cache;
- integridade de dados em `data/contratos.js`;
- exportações locais;
- dependências em `assets/vendor/`;
- pipelines de validação e GitHub Actions.

Fora do escopo:

- sistemas externos da Prefeitura;
- planilhas não publicadas no repositório;
- indisponibilidade temporária do GitHub Pages;
- ataques que dependam de acesso físico ao dispositivo da pessoa usuária.

## Política de dados

O painel é 100% estático. Filtros, exportações e compartilhamento rodam no navegador e não enviam dados para servidor próprio ou de terceiros.
