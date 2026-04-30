# ADR 0008: Exportações locais e pipeline de dados

## Status

Aceito.

## Contexto

O painel é publicado como site estático no GitHub Pages e precisa atender tanto consulta pública quanto rotinas de backoffice. As etapas anteriores já permitiam filtros, CSV, impressão e compartilhamento por URL. A gestão também precisa de XLSX, PDF, JSON e um fluxo confiável para transformar a planilha oficial em `data/contratos.js`.

## Decisão

- Adicionar SheetJS, jsPDF e jspdf-autotable como arquivos locais em `assets/vendor/`.
- Carregar XLSX e PDF sob demanda por `src/js/utils/load-script.js`, preservando performance inicial.
- Gerar XLSX com abas por situação, filtros aplicados e metadados de geração.
- Gerar PDF no cliente com cabeçalho institucional, sumário, tabelas paginadas, URL e QR code local.
- Gerar JSON do recorte filtrado no mesmo schema de `window.CONTRATOS_DATA`.
- Usar Web Share API quando disponível e fallback para área de transferência.
- Criar `scripts/xlsx_to_js.py` para converter `contratos.xlsx` em `data/contratos.js`.
- Criar `scripts/schema/contratos.schema.json` e `scripts/validate_data.mjs` com Ajv local para validação em CI.
- Mostrar banner discreto quando a base carregada tiver avisos interpretáveis, sem quebrar o painel.

## Consequências

- As exportações continuam 100% client-side e não enviam dados para servidor.
- O bundle inicial cresce pouco, porque as bibliotecas pesadas são carregadas apenas quando o usuário exporta.
- O pipeline Python cria uma fonte repetível para atualizar a base.
- A validação passa a bloquear valores negativos, datas fora de padrão e status fora da lista esperada.

## Alternativas Consideradas

- Exportar XLSX/PDF por serviço externo: rejeitado por violar a regra de site estático e expor dados fora do navegador.
- Pré-carregar todas as bibliotecas no carregamento inicial: rejeitado por impacto de performance.
- Validar dados só no frontend: rejeitado porque CI e atualização de dados precisam falhar antes da publicação.
- Escrever PDF a partir do print do navegador: mantido como opção de impressão, mas PDF nativo recebeu layout próprio para backoffice.
