# Dashboard de Atendimentos

Dashboard financeiro simples para transformar uma planilha de atendimentos em indicadores visuais. O projeto roda no navegador, sem backend, e gera automaticamente resumo de receita, quantidade de atendimentos, quantidade de pacientes, graficos por mes, ranking de pacientes e distribuicao por dia da semana.

## O que o dashboard faz

- Le arquivos `.xlsx`, `.xls`, `.csv` e planilhas do Google Sheets selecionadas pelo navegador.
- Identifica automaticamente as colunas principais da planilha.
- Calcula a receita total.
- Conta o total de atendimentos.
- Conta pacientes unicos.
- Exibe a evolucao da receita por mes.
- Exibe o volume de sessoes por mes.
- Mostra a receita por paciente.
- Mostra a distribuicao dos atendimentos por dia da semana.
- Lista os principais pacientes por receita, sessoes e valor medio.
- Inclui um botao **Ver exemplo** para demonstrar o funcionamento sem precisar carregar arquivo.

## Regra essencial da planilha

Antes de usar o dashboard, e necessario criar previamente uma planilha com uma linha de cabecalho e, obrigatoriamente, as 3 colunas essenciais abaixo:

| Coluna obrigatoria | O que deve conter | Exemplo |
| --- | --- | --- |
| `Data do atendimento` | Data em que a sessao aconteceu | `15/01/2026` |
| `Nome do paciente` | Nome ou identificador do paciente | `Maria Souza` |
| `Valor da sessao` | Valor cobrado/recebido pelo atendimento | `180,00` |

Essas tres colunas sao a base de todos os calculos. Se alguma delas nao existir, estiver vazia ou tiver dados invalidos, o dashboard nao conseguira montar os indicadores corretamente.

### Nomes de coluna aceitos

O sistema tenta reconhecer variacoes simples dos nomes das colunas. Por exemplo:

- Data: `Data do atendimento`, `Data`, `Atendimento`
- Paciente: `Nome do paciente`, `Paciente`, `Nome`
- Valor: `Valor da sessao`, `Valor`, `Sessao`

Mesmo com essa flexibilidade, a recomendacao e usar exatamente:

```text
Data do atendimento
Nome do paciente
Valor da sessao
```

Isso evita erro de leitura e deixa a planilha mais previsivel.

## Exemplo de planilha

```csv
Data do atendimento,Nome do paciente,Valor da sessao
05/01/2026,Ana Martins,180
08/01/2026,Bruno Lopes,220
12/01/2026,Ana Martins,180
19/02/2026,Carla Nunes,200
```

Tambem e possivel usar separador `;` em arquivos CSV:

```csv
Data do atendimento;Nome do paciente;Valor da sessao
05/01/2026;Ana Martins;180,00
08/01/2026;Bruno Lopes;220,00
```

## Formatos aceitos

- Excel: `.xlsx` e `.xls`
- CSV: `.csv`
- Google Sheets: planilhas identificadas pelo tipo `application/vnd.google-apps.spreadsheet`

Para arquivos Excel e planilhas do Google Sheets, o dashboard le a primeira aba. Se houver varias abas, deixe os dados principais na primeira.

## Como usar

1. Crie uma planilha com as 3 colunas obrigatorias.
2. Preencha uma linha para cada atendimento realizado.
3. Abra o arquivo `src/index.html` no navegador.
4. Clique em **Selecionar planilha**.
5. Escolha o arquivo `.xlsx`, `.xls`, `.csv` ou uma planilha do Google Sheets.
6. Aguarde o dashboard gerar os indicadores.

Se quiser testar sem arquivo proprio, clique em **Ver exemplo**.

## Como executar localmente

Este projeto e composto apenas por arquivos estaticos organizados dentro da pasta `src`:

```text
src/index.html
src/css/styles.css
src/js/app.js
```

Voce pode abrir o `src/index.html` diretamente no navegador. Tambem pode servir a pasta raiz com qualquer servidor estatico, por exemplo:

```bash
python -m http.server 8000
```

Depois acesse:

```text
http://localhost:8000/src/
```

## Dependencias externas

O projeto usa bibliotecas carregadas por CDN no `index.html`:

- Chart.js: renderizacao dos graficos.
- SheetJS/xlsx: leitura de arquivos Excel e planilhas do Google Sheets selecionadas pelo navegador.

Por isso, e necessario ter conexao com a internet quando abrir o dashboard, a menos que essas bibliotecas sejam baixadas e referenciadas localmente no projeto.

## Como os dados sao tratados

O processamento acontece no proprio navegador. A planilha selecionada e lida localmente pelo JavaScript da pagina para gerar os indicadores em tela.

O projeto atual nao envia os dados para servidor proprio, banco de dados ou API externa.

## Regras de leitura dos dados

Durante a importacao, o dashboard:

- Procura as 3 colunas essenciais.
- Converte a data para um objeto de data valido.
- Remove linhas sem data, sem paciente ou sem valor.
- Ignora valores que nao sejam numericos.
- Ignora atendimentos com valor menor ou igual a zero.
- Ordena os dados por data.

### Datas

Sao aceitos formatos comuns como:

- `15/01/2026`
- `15-01-2026`
- Datas nativas do Excel

### Valores

Sao aceitos valores como:

- `180`
- `180,00`
- `R$ 180,00`
- `1.200,00`

## Estrutura do projeto

```text
.
|-- src
|   |-- index.html
|   |-- css
|   |   `-- styles.css
|   `-- js
|       `-- app.js
`-- README.md
```

### `src/index.html`

Define a estrutura da pagina, os botoes de upload, o estado inicial, os cards de resumo, os canvas dos graficos e a tabela de pacientes.

### `src/css/styles.css`

Contem toda a aparencia do dashboard, incluindo layout responsivo, cards, paineis, tabela, botoes e toast de feedback.

### `src/js/app.js`

Contem a logica principal:

- Leitura da planilha.
- Conversao de CSV.
- Normalizacao das colunas.
- Validacao das linhas.
- Calculo dos indicadores.
- Renderizacao dos graficos.
- Preenchimento da tabela.
- Geracao dos dados de exemplo.

## Indicadores exibidos

- **Receita total**: soma de todos os valores validos.
- **Atendimentos**: quantidade de linhas validas importadas.
- **Pacientes**: quantidade de nomes de pacientes unicos.
- **Receita por mes**: soma de receita agrupada por mes.
- **Receita por paciente**: ranking dos pacientes por valor total.
- **Sessoes por mes**: quantidade de atendimentos agrupada por mes.
- **Dias da semana**: distribuicao dos atendimentos por dia.
- **Top pacientes**: tabela com receita, quantidade de sessoes e media por paciente.

## Possiveis problemas e solucoes

### "A planilha precisa ter as colunas..."

Verifique se a primeira linha da planilha contem as 3 colunas obrigatorias:

```text
Data do atendimento
Nome do paciente
Valor da sessao
```

### "Nao encontrei linhas validas..."

Isso geralmente acontece quando:

- As datas estao vazias ou em formato invalido.
- Os nomes dos pacientes estao vazios.
- Os valores estao vazios, zerados, negativos ou em formato nao numerico.

### Graficos nao carregam

Confira se ha conexao com a internet, pois Chart.js e SheetJS sao carregados por CDN.

## Publicacao

Como o projeto e estatico, ele pode ser publicado em servicos como:

- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages
- Qualquer hospedagem de arquivos estaticos

Basta publicar os arquivos mantendo a pasta `src` e apontar a hospedagem para `src/index.html` ou configurar `src` como diretorio publico.

## Observacoes importantes

- A planilha deve ter uma linha por atendimento.
- A primeira aba do Excel deve conter os dados principais.
- A primeira linha deve ser o cabecalho.
- Pacientes com nomes escritos de formas diferentes serao tratados como pacientes diferentes.
- Linhas invalidas sao ignoradas nos calculos.
- O dashboard nao substitui um sistema financeiro completo; ele organiza e visualiza os dados informados na planilha.
