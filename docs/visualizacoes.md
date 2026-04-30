# Visualizações analíticas

Este documento descreve as visualizações avançadas do painel e como interpretar cada leitura. Todas rodam no navegador, sem envio de dados para servidor.

## Linha do tempo

A seção **Linha do tempo** mostra até 50 contratos por página como barras horizontais entre `dataInicio` e `dataVencimento`.

- A cor da barra segue o status calculado pelo painel.
- O recorte respeita filtros, busca e ordenação atuais.
- Contratos sem data de início ou vencimento ficam fora dessa visualização, mas continuam nas tabelas.
- Cada barra possui descrição acessível com contrato, empresa, datas e status.

## Heatmap de vencimentos

O **Heatmap de vencimentos** mostra a quantidade de vencimentos por mês nos três anos anteriores, ano atual e três anos seguintes.

- Células mais fortes indicam mais contratos vencendo naquele mês.
- Clique ou pressione `Enter` em uma célula para aplicar a busca `vencimento:AAAA-MM..AAAA-MM`.
- A URL é atualizada automaticamente, permitindo compartilhar o recorte.
- Existe uma tabela equivalente para leitores de tela.

## Treemap de empresas

O **Treemap de empresas por valor** mostra as empresas com maior valor contratado no recorte atual.

- A área de cada retângulo é proporcional ao valor total da empresa.
- O desenho usa algoritmo squarify simples em SVG puro.
- Clique ou pressione `Enter` em uma empresa para aplicar `empresa:"nome"` na busca.
- A tabela equivalente lista empresa e valor total.

## Sparklines nos KPIs

Cada KPI numérico exibe uma mini linha dos últimos 12 meses, calculada pela `dataInicio` dos contratos.

- KPIs de valor somam `valor`.
- KPIs de quantidade contam contratos.
- A linha é decorativa e marcada com `aria-hidden`, pois o valor principal do KPI continua textual.

## Drill-down dos gráficos

Os gráficos Chart.js existentes aceitam clique nos itens principais.

- Status aplica o filtro de status.
- Modalidade aplica o filtro de modalidade.
- Empresa aplica busca `empresa:"nome"`.
- Vencimento por mês aplica busca `vencimento:AAAA-MM..AAAA-MM`.
- Prazo aplica o filtro de prazo.
- Qualidade cadastral aplica operadores de busca equivalentes quando possível.

## Comparativo gestor/fiscal

O painel **Comparativo gestor/fiscal** resume os principais responsáveis por:

- quantidade de contratos;
- valor total contratado;
- percentual de contratos vencidos;
- prazo médio dos contratos abertos.

Os botões de ordenação alteram gestores e fiscais ao mesmo tempo. As tabelas usam `<progress>` para indicar participação relativa por valor sem depender apenas de cor.

## Exportação PNG

Cada visualização SVG possui botão **Exportar PNG**. O arquivo é gerado localmente com `canvas.toBlob()` a partir da serialização do SVG.

## Acessibilidade

- Visualizações clicáveis usam `role="button"`, `tabindex="0"` e respondem a `Enter` ou espaço.
- Linha do tempo, heatmap e treemap têm tabela equivalente `sr-only`.
- As cores usam tokens do tema ativo e são recalculadas quando o tema muda.
- O conteúdo principal permanece textual em KPIs, tabelas e resumos.
