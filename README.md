# Painel de Contratos - Iguape/SP

Dashboard estática para acompanhamento dos contratos importados de `contratos.xlsx`.

## Recursos

- Indicadores de quantidade, valor total, contratos vigentes, vencidos e próximos de vencer.
- Filtros por busca inteligente, recortes rápidos, status, prazo, modalidade, gestor, fiscal e ano de vencimento, com remoção individual dos filtros ativos.
- Query params para preservar e compartilhar busca, filtros, ordenação e modo compacto.
- Leituras rápidas para próximo vencimento, maior contrato, cadastros sem responsável e valor vencido.
- Critério claro entre vencidos por prazo aberto, contratos encerrados, concluídos, sem data e sem informação suficiente.
- Gráficos de status e valor por modalidade.
- Tabela principal para contratos vigentes e em acompanhamento, com prazos e pendências destacados por cor.
- Áreas separadas e recolhíveis para vencidos, encerrados e concluídos.
- Tabelas ordenáveis por vencimento, valor, contrato, processo, objeto, empresa, modalidade, status, gestor e fiscal.
- Busca com limpeza rápida, contador de filtros ativos e botão de retorno ao topo em páginas longas.
- Logo e favicon baseados nos arquivos públicos do portal oficial da Prefeitura de Iguape.
- Identidade visual institucional com cabeçalho, seções e rodapé voltados para transparência pública.
- Layout responsivo para desktop, tablet e iPhone, validado em 320px, 375px, 390px, 430px, 768px, 1024px e 1440px.
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
