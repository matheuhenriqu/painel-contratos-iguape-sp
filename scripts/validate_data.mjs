import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
let Ajv = null;
try {
  const Ajv2020 = require('ajv/dist/2020');
  Ajv = Ajv2020.default || Ajv2020;
} catch {
  // CI usa a devDependency local. Este fallback mantém o script executável em ambientes sem npm instalado.
}

const inputPath = process.argv[2] || 'data/contratos.js';
const schemaPath = path.resolve('scripts/schema/contratos.schema.json');

const [schema, dataset] = await Promise.all([readJson(schemaPath), readDataset(inputPath)]);
const schemaErrors = Ajv ? validateWithAjv(schema, dataset) : validateWithFallback(dataset);
const consistencyErrors = validateConsistency(dataset);

if (schemaErrors.length || consistencyErrors.length) {
  console.error('data/contratos.js inválido.');
  schemaErrors.forEach((error) => console.error(`- ${error}`));
  consistencyErrors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`data/contratos.js válido: ${dataset.recordCount} registro(s).`);

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

async function readDataset(filePath) {
  const content = await readFile(filePath, 'utf8');
  if (filePath.endsWith('.json')) return JSON.parse(content);

  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(content, sandbox, { filename: filePath });
  if (!sandbox.window.CONTRATOS_DATA) {
    throw new Error('window.CONTRATOS_DATA não foi definido.');
  }
  return sandbox.window.CONTRATOS_DATA;
}

function validateConsistency(dataset) {
  const errors = [];
  if (dataset.recordCount !== dataset.records.length) {
    errors.push(
      `recordCount (${dataset.recordCount}) difere de records.length (${dataset.records.length}).`,
    );
  }
  return errors;
}

function validateWithAjv(schema, dataset) {
  const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
  const validate = ajv.compile(schema);
  const ok = validate(dataset);
  if (ok) return [];
  return (validate.errors || []).map((error) => `${error.instancePath || '/'} ${error.message}`);
}

function validateWithFallback(dataset) {
  const allowedStatuses = new Set([
    null,
    'Aguardando',
    'Atenção',
    'Ativo',
    'Em Andamento',
    'Encerrado',
    'Finalizado',
    'Fracassado',
    'Indefinido',
    'Licitando',
    'Não Assinou',
    'Publicado',
    'Suspenso',
    'Vence em breve',
    'Vencido',
  ]);
  const errors = [];
  if (!Array.isArray(dataset.records)) {
    errors.push('/records deve ser um array.');
    return errors;
  }
  dataset.records.forEach((record, index) => {
    const prefix = `/records/${index}`;
    if (!Number.isInteger(record.id) || record.id < 1) {
      errors.push(`${prefix}/id deve ser inteiro positivo.`);
    }
    if (
      record.valor !== null &&
      record.valor !== undefined &&
      (typeof record.valor !== 'number' || record.valor < 0)
    ) {
      errors.push(`${prefix}/valor deve ser número não negativo ou null.`);
    }
    ['dataInicio', 'dataVencimento'].forEach((field) => {
      const value = record[field];
      if (
        value !== null &&
        value !== undefined &&
        value !== '' &&
        !/^\d{4}-\d{2}-\d{2}$/.test(String(value))
      ) {
        errors.push(`${prefix}/${field} deve usar AAAA-MM-DD ou null.`);
      }
    });
    if (record.status !== undefined && !allowedStatuses.has(record.status)) {
      errors.push(`${prefix}/status está fora da lista permitida.`);
    }
  });
  return errors;
}
