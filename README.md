# Painel de Contratos - Iguape/SP

Dashboard estática para acompanhamento dos contratos importados de `contratos.xlsx`.

## Recursos

- Indicadores de quantidade, valor total, contratos ativos, vencidos e próximos de vencer.
- Filtros por busca, recortes rápidos, status, prazo, modalidade, gestor, fiscal e ano de vencimento, com remoção individual dos filtros ativos.
- Leituras rápidas para próximo vencimento, maior contrato, cadastros sem responsável e valor vencido.
- Critério claro entre vencidos por prazo aberto e contratos encerrados por status cadastral.
- Gráficos de status e valor por modalidade.
- Tabela principal apenas com contratos vigentes, com prazos destacados por cor e modo compacto opcional.
- Áreas separadas e recolhíveis para vencidos e concluídos.
- Tabelas ordenáveis também no mobile, com carregamento progressivo mais leve no iPhone.
- Busca com limpeza rápida, contador de filtros ativos e botão de retorno ao topo em páginas longas.
- Logo e favicon baseados nos arquivos públicos do portal oficial da Prefeitura de Iguape.
- Identidade visual institucional com cabeçalho, seções e rodapé voltados para transparência pública.
- Layout responsivo para desktop, tablet e iPhone, com filtros recolhíveis e cartões de contratos no mobile.
- Bibliotecas JavaScript servidas localmente e política CSP restritiva para uso no GitHub Pages.

## Publicação

O projeto foi criado para rodar diretamente no GitHub Pages, sem backend ou etapa de build.

## Estrutura técnica

- `index.html`: estrutura semântica da página, CSP e referências para assets locais.
- `styles.css`: tokens visuais, layout responsivo e estados de interface.
- `app.js`: preparação dos dados, filtros, ordenação, cards, gráficos e tabelas.
- `data/contratos.js`: base local gerada a partir da planilha de contratos.

## Validação local

Antes de publicar alterações, valide pelo menos:

```bash
node --check app.js
git diff --check
python3 -m http.server 4173
```
