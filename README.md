# Painel de Gestão de Contratos - Iguape/SP

Painel público e estático para consulta, acompanhamento e análise dos contratos da Prefeitura Municipal de Iguape/SP.

Página publicada:

https://matheuhenriqu.github.io/painel-contratos-iguape-sp/

Repositório:

https://github.com/matheuhenriqu/painel-contratos-iguape-sp

## Objetivo

O projeto organiza os dados de contratos em uma interface de transparência pública, com foco em:

- consultar contratos por texto, status, prazo, modalidade, gestor, fiscal e ano;
- acompanhar vencimentos e contratos vencidos;
- diferenciar contratos vigentes, vencidos, encerrados e concluídos;
- identificar pendências cadastrais, como ausência de gestor, fiscal, valor, empresa ou vencimento;
- visualizar indicadores e gráficos de apoio à gestão;
- exportar, imprimir ou copiar um resumo do recorte filtrado.

O painel não possui backend, login, banco de dados ou etapa obrigatória de build. Tudo roda com HTML, CSS e JavaScript puro no GitHub Pages.

## Estrutura dos arquivos

- `index.html`: estrutura da página, metadados, CSP, cabeçalho, filtros, indicadores, gráficos, tabelas e rodapé.
- `styles.css`: identidade visual, responsividade, estados de foco, layout mobile, tabelas, cards, gráficos e impressão.
- `app.js`: normalização dos dados, regras de status, filtros, busca, ordenação, KPIs, gráficos, tabelas, CSV, impressão e URL com query params.
- `data/contratos.js`: base local de contratos carregada pela página via `window.CONTRATOS_DATA`.
- `assets/logo-prefeitura-iguape.png`: logo institucional usada no projeto.
- `assets/favicon.png`: ícone da aba do navegador.
- `assets/apple-touch-icon.png`: ícone usado em dispositivos Apple e no cabeçalho.
- `assets/vendor/chart.umd.min.js`: Chart.js servido localmente.
- `assets/vendor/lucide.min.js`: ícones Lucide servidos localmente.

## Como atualizar os dados

Os dados consumidos pela página ficam em `data/contratos.js`. O arquivo deve manter este formato:

```js
window.CONTRATOS_DATA = {
  source: "contratos.xlsx",
  sheet: "CONTRATOS",
  generatedAt: "2026-04-23T21:17:18",
  recordCount: 158,
  records: [
    {
      id: 1,
      modalidade: "Pregão Eletrônico",
      numeroModalidade: "030/2025",
      objeto: "Objeto do contrato",
      processo: "836/2025",
      contrato: "CT 222/2025",
      empresa: "Empresa contratada",
      valor: 41800,
      dataInicio: "2025-12-30",
      dataVencimento: "2026-02-27",
      status: "Vencido",
      gestor: "Nome do gestor",
      fiscal: "Nome do fiscal",
      observacoes: null
    }
  ]
};
```

Checklist para atualização:

- gerar novamente `data/contratos.js` a partir da planilha oficial;
- atualizar `generatedAt` com a data e hora da geração;
- conferir se `recordCount` bate com o total de itens em `records`;
- usar datas no formato `AAAA-MM-DD`;
- usar valores numéricos em `valor`, sem texto monetário;
- manter campos ausentes como `null`, string vazia ou campo omitido;
- validar que a página não exibe `undefined`, `null` ou `NaN`;
- testar filtros, gráficos e exportação CSV antes de publicar.

## Como rodar localmente

Na pasta do projeto:

```bash
python3 -m http.server 4173
```

Depois acesse:

```text
http://127.0.0.1:4173/
```

Também é recomendado validar sintaxe e espaços finais antes de publicar:

```bash
node --check app.js
git diff --check
```

## Como publicar no GitHub Pages

O projeto foi preparado para GitHub Pages a partir da branch `main`, sem build.

Fluxo recomendado:

```bash
git status
git add index.html styles.css app.js data/contratos.js README.md assets
git commit -m "Atualiza painel de contratos"
git push origin main
```

No GitHub, confira em `Settings > Pages` se a publicação está configurada para:

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/ (root)`

Depois de um push, o GitHub Pages pode levar alguns minutos para atualizar a página pública.

## Como funcionam os filtros

O painel possui:

- busca por texto;
- recortes rápidos: todos, ativos, vencidos e 30 dias;
- filtro por status;
- filtro por prazo;
- filtro por modalidade;
- filtro por gestor;
- filtro por fiscal;
- filtro por ano de vencimento;
- chips para remover filtros individualmente;
- botão para limpar todos os filtros;
- contador de filtros ativos;
- preservação dos filtros na URL por query params.

A busca ignora acentos, maiúsculas e minúsculas, aceita termos parciais e procura em campos como objeto, empresa, número do contrato, processo, modalidade, gestor, fiscal, observações e status.

Exemplo de URL compartilhável:

```text
?busca=limpeza&prazo=30&ordem=dataVencimento&direcao=asc
```

## Como funcionam os gráficos

Os gráficos usam Chart.js local, sem CDN. Eles são atualizados conforme os filtros e exibem mensagens amigáveis quando não há dados.

Gráficos disponíveis:

- contratos por status;
- valor por modalidade;
- contratos por modalidade;
- vencimentos por mês;
- empresas por valor contratado;
- empresas por quantidade de contratos;
- distribuição por prazo;
- qualidade cadastral dos dados.

Os gráficos respeitam `prefers-reduced-motion`, são responsivos e usam cores consistentes com os badges e indicadores do painel.

## Critérios de classificação dos contratos

As regras ficam em `classifyContract()` no `app.js`.

- `Concluído`: status normalizado igual a `concluido` ou `finalizado`.
- `Encerrado`: status normalizado igual a `encerrado`, `fracassado`, `nao assinou` ou `suspenso`.
- `Sem informação suficiente`: status normalizado igual a `indefinido`, `sem informacao` ou `sem status`.
- `Sem data de vencimento`: contrato sem data de vencimento válida.
- `Vencido`: contrato com vencimento expirado e sem indicação de encerramento ou conclusão.
- `Vence hoje`: vencimento na data atual.
- `Próximo de vencer`: vencimento em até 7 dias.
- `Vence em até 30 dias`: vencimento de 8 a 30 dias.
- `Vence entre 31 e 90 dias`: vencimento de 31 a 90 dias.
- `Vigente`: contrato aberto com vencimento acima de 90 dias.

Importante: contratos encerrados ou concluídos não são tratados como vencidos apenas porque a data expirou.

## Exportar CSV

O botão `Exportar CSV` baixa os contratos do recorte atual, incluindo vigentes/em acompanhamento, vencidos e encerrados/concluídos filtrados.

O CSV inclui:

- ID;
- contrato;
- processo;
- objeto;
- empresa;
- modalidade;
- valor numérico;
- valor formatado;
- data de vencimento;
- dias até o vencimento;
- status do painel;
- status original da planilha;
- gestor;
- fiscal;
- observações.

O arquivo é gerado no navegador, sem envio de dados para servidor.

## Imprimir relatório

O botão `Imprimir` abre a impressão do navegador com a visão atual do painel.

Antes de imprimir:

- aplique os filtros desejados;
- confira o resumo automático;
- revise indicadores, qualidade dos dados, gráficos e tabelas;
- use a opção de PDF do navegador se quiser gerar um arquivo.

## Copiar resumo

O botão `Copiar resumo` copia um texto automático com os principais números do recorte filtrado. Caso a API moderna de clipboard não esteja disponível, o painel tenta usar o fallback do navegador.

## Segurança

O painel mantém uma CSP restritiva no `index.html`:

- scripts apenas de `self`;
- estilos apenas de `self`;
- imagens de `self` e `data:`;
- `object-src 'none'`;
- `frame-src 'none'`;
- `form-action 'none'`;
- `base-uri 'self'`;
- sem scripts externos por CDN.

Os dados renderizados passam por escape antes de entrar nos templates HTML, e os selects são populados com APIs de DOM para evitar execução de HTML vindo da base.

## Acessibilidade e responsividade

O painel inclui:

- link para pular ao conteúdo principal;
- headings e regiões nomeadas;
- labels nos filtros;
- estados `aria-live` para resultados e ações;
- captions e cabeçalhos corretos nas tabelas;
- foco visível;
- filtros recolhíveis no mobile;
- alvos de toque adequados no iPhone;
- respeito a `prefers-reduced-motion`;
- validação em 320px, 375px, 390px, 430px, 768px, 1024px e 1440px.

## Limitações conhecidas

- A atualização dos dados depende da geração manual de `data/contratos.js`.
- O painel não valida a planilha original em tempo real.
- GitHub Pages pode levar alguns minutos para refletir um push.
- A impressão final depende do navegador e das configurações locais de página.
- Leitores de tela e Safari em iPhone real ainda devem ser testados manualmente após grandes mudanças.
- Não há autenticação, trilha de auditoria ou histórico de versões de dados dentro da interface.

## Checklist de manutenção

Antes de publicar:

- conferir se `data/contratos.js` carrega sem erro;
- conferir `generatedAt` e `recordCount`;
- rodar `node --check app.js`;
- rodar `git diff --check`;
- testar busca com e sem acentos;
- testar filtros por status, prazo, modalidade, gestor, fiscal e ano;
- testar ordenação por data, valor e texto;
- testar CSV, imprimir e copiar resumo;
- testar a página em largura de iPhone;
- conferir console do navegador;
- conferir se não há `undefined`, `null` ou `NaN` visível;
- conferir se a página pública abriu depois do push.

## Próximos passos recomendados

- Criar um script versionado para converter `contratos.xlsx` em `data/contratos.js`.
- Adicionar validação automática da base antes do commit.
- Criar testes end-to-end simples para filtros, ordenação e exportação.
- Publicar changelog de atualizações de dados.
- Revisar textos com equipe jurídica/administrativa para alinhar nomenclaturas oficiais.
- Fazer auditoria manual com leitor de tela e Safari em iPhone físico.
