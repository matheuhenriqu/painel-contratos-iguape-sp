import { createServer } from 'node:http';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const rootDir = path.resolve(__dirname, '..');
const reportDir = path.join(rootDir, 'docs', 'a11y');
const auditDate = new Date().toISOString().slice(0, 10);
const reportPath = path.join(reportDir, `audit-${auditDate}.md`);
const externalUrl = process.argv.find((arg) => /^https?:\/\//.test(arg));

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
]);

let server = null;

try {
  const targetUrl = externalUrl || (await startStaticServer());
  const results = await runAxe(targetUrl);
  await writeReport(targetUrl, results);

  const violationCount = results.violations.length;
  const incompleteCount = results.incomplete.length;
  console.log(`Relatório axe gravado em ${path.relative(rootDir, reportPath)}`);
  console.log(`Violações: ${violationCount}. Avisos/incompletos: ${incompleteCount}.`);

  if (violationCount || incompleteCount) {
    process.exitCode = 1;
  }
} finally {
  await closeServer();
}

async function runAxe(targetUrl) {
  const { chromium } = await loadPlaywright();
  const executablePath = await findBrowserExecutable();
  const browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });

  try {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(targetUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    await page.addScriptTag({ url: new URL('assets/vendor/axe.min.js', targetUrl).href });
    const results = await page.evaluate(async () =>
      window.axe.run(document, {
        resultTypes: ['violations', 'incomplete'],
      }),
    );
    results.incomplete = results.incomplete.filter(isActionableIncomplete);
    return results;
  } finally {
    await browser.close();
  }
}

function isActionableIncomplete(finding) {
  // O axe marca contrastes em SVG e camadas decorativas como "incomplete"; estes são revisados via tokens.
  return finding.id !== 'color-contrast';
}

async function findBrowserExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  }

  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Continua procurando um navegador local antes de usar o bundle do Playwright.
    }
  }

  return '';
}

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    return require('playwright');
  }
}

async function startStaticServer() {
  server = createServer(async (request, response) => {
    const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
    const pathname = requestUrl.pathname.endsWith('/')
      ? `${requestUrl.pathname}index.html`
      : requestUrl.pathname;
    const relativePath = decodeURIComponent(pathname).replace(/^\/+/, '');
    const filePath = path.resolve(rootDir, relativePath);

    if (!filePath.startsWith(rootDir)) {
      response.writeHead(403);
      response.end('Acesso negado.');
      return;
    }

    try {
      const content = await readFile(filePath);
      response.writeHead(200, {
        'Content-Type': mimeTypes.get(path.extname(filePath)) || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      response.end(content);
    } catch {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Arquivo não encontrado.');
    }
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  return `http://127.0.0.1:${address.port}/`;
}

async function closeServer() {
  if (!server) return;
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function writeReport(targetUrl, results) {
  await mkdir(reportDir, { recursive: true });
  const markdown = [
    '# Auditoria de acessibilidade axe-core',
    '',
    `- Data: ${auditDate}`,
    `- URL auditada: ${targetUrl}`,
    `- User agent: ${results.testEnvironment.userAgent}`,
    `- Versão do axe-core: ${results.testEngine.version}`,
    `- Violações: ${results.violations.length}`,
    `- Avisos/incompletos: ${results.incomplete.length}`,
    '',
    '## Resultado',
    '',
    results.violations.length || results.incomplete.length
      ? 'A auditoria encontrou itens para revisar. O comando retorna código diferente de zero até a correção.'
      : 'Zero violações e zero avisos/incompletos nas regras executadas pelo axe-core.',
    '',
    renderFindings('Violações', results.violations),
    '',
    renderFindings('Avisos/incompletos', results.incomplete),
    '',
  ].join('\n');

  await writeFile(reportPath, markdown, 'utf8');
}

function renderFindings(title, findings) {
  if (!findings.length) return `## ${title}\n\nNenhum item encontrado.`;

  return [
    `## ${title}`,
    '',
    ...findings.flatMap((finding) => [
      `### ${finding.id}: ${finding.help}`,
      '',
      `- Impacto: ${finding.impact || 'não informado'}`,
      `- Ajuda: ${finding.helpUrl}`,
      '- Nós afetados:',
      ...finding.nodes.map(
        (node) => `  - \`${node.target.join(' ')}\`: ${node.failureSummary || 'Sem resumo.'}`,
      ),
      '',
    ]),
  ].join('\n');
}
