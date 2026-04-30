# Atalhos do painel

Os atalhos ajudam na operação diária do painel sem interferir quando o foco está em `input`, `textarea`, `select` ou campo editável.

| Atalho | Ação                                                             |
| ------ | ---------------------------------------------------------------- |
| `/`    | Foca o campo de busca.                                           |
| `Esc`  | Limpa a busca; se não houver busca, limpa filtros ativos.        |
| `g a`  | Aplica o recorte rápido de contratos ativos.                     |
| `g v`  | Aplica o recorte rápido de contratos vencidos.                   |
| `g 3`  | Aplica o recorte rápido de contratos em até 30 dias.             |
| `j`    | Foca o próximo contrato visível.                                 |
| `k`    | Foca o contrato visível anterior.                                |
| `?`    | Abre o painel de ajuda com atalhos e exemplos de busca avançada. |

## Busca avançada

Operadores aceitos:

- `empresa:"texto"`
- `status:vencido`
- `modalidade:pregão`
- `valor:>50000`
- `valor:<=1000`
- `vencimento:2026-03..2026-06`
- `gestor:"nome"`
- `fiscal:"nome"`

Quando a busca não usa operadores, o painel usa busca textual com tolerância leve para pequenos erros de digitação.
