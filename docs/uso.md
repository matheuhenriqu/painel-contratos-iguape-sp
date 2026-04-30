# Uso diário do painel

## Ver detalhes de um contrato

Clique em uma linha da tabela, no botão de ID da linha ou em "Ver detalhes" no card mobile. O painel abre um `dialog` nativo com campos do contrato, observações, status original da planilha e classificação aplicada pelo painel.

O link do detalhe usa o hash `#contrato/<id>`, então pode ser compartilhado sem perder os filtros atuais.

## Cards no mobile

Em telas de até 720 px, o botão "Cards" alterna entre a tabela e a visualização em cards. A preferência fica salva neste navegador pela chave `painel.viewMode`.

## Filtros salvos

Use "Salvar filtro atual" para guardar até 10 filtros no navegador. A lista permite aplicar, renomear, excluir, exportar e importar JSON. Os filtros salvos usam a chave `painel.savedFilters`.

## Alertas críticos

Quando houver contratos vencidos ou vencendo em até 7 dias, uma faixa aparece abaixo do cabeçalho. O botão "Ver agora" aplica o recorte crítico; o botão de fechar dispensa o aviso somente na sessão atual.

## KPIs clicáveis

Os indicadores funcionam como botões. Ao clicar em "Vencidos", "Até 30 dias", "Sem gestor" e similares, o painel aplica o recorte correspondente e mantém a URL sincronizada.
