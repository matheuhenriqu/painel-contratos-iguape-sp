# Scripts de dados

Os scripts desta pasta rodam localmente e não fazem parte do runtime do GitHub Pages.

## Preparar ambiente Python

Requisito: Python 3.10 ou superior.

```bash
python -m pip install -r scripts/requirements.txt
```

## Converter planilha para data/contratos.js

```bash
python scripts/xlsx_to_js.py contratos.xlsx --sheet CONTRATOS --output data/contratos.js
```

O conversor:

- lê a aba informada com `openpyxl`;
- normaliza strings, datas em `AAAA-MM-DD`, valores numéricos e campos vazios como `null`;
- valida o resultado com `scripts/schema/contratos.schema.json`;
- escreve `window.CONTRATOS_DATA = { source, sheet, generatedAt, recordCount, records }`;
- encerra com código diferente de zero se houver erro de schema.

## Validar a base atual

```bash
npm run validate:data
```

O validador Node usa Ajv local e confere também se `recordCount` bate com `records.length`.
