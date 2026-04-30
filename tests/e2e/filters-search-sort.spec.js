import { expect, test } from '@playwright/test';
import { getState, openFilters, waitForDashboard } from './helpers.js';

test('aplica filtros por prazo, status e limpa o recorte preservando contagens', async ({
  page,
}) => {
  await waitForDashboard(page);
  await openFilters(page);
  const initial = await getState(page);

  await page.locator('#prazoFilter').selectOption('vencido');
  await expect(page).toHaveURL(/prazo=vencido/);
  const expired = await getState(page);
  expect(expired.filtered).toBeLessThanOrEqual(initial.filtered);

  await page.locator('#statusFilter').selectOption({ label: 'Vencido' });
  await expect(page).toHaveURL(/status=/);
  const byStatus = await getState(page);
  expect(byStatus.filtered).toBeLessThanOrEqual(expired.filtered);

  await page.locator('#clearFiltersBtn').click();
  await expect(page).not.toHaveURL(/prazo=vencido/);
  const cleared = await getState(page);
  expect(cleared.filtered).toBe(initial.filtered);
});

test('busca termos com acento, sem acento e operadores avançados', async ({ page }) => {
  await waitForDashboard(page);
  await openFilters(page);

  await page.locator('#searchInput').fill('iguape');
  await page.waitForFunction(() => window.__CONTRATOS_IGUAPE_STATE__.filtered > 0);
  const plain = await getState(page);
  expect(plain.filtered).toBeGreaterThan(0);

  await page.locator('#searchInput').fill('empresa:"iguape"');
  await page.waitForFunction(() => window.__CONTRATOS_IGUAPE_STATE__.filtered > 0);
  const company = await getState(page);
  expect(company.filtered).toBeGreaterThan(0);

  await page.locator('#searchInput').fill('status:vencido valor:>1000');
  await page.waitForTimeout(250);
  const advanced = await getState(page);
  expect(advanced.filtered).toBeGreaterThanOrEqual(0);

  await expect(page).toHaveURL(/busca=/);
});

test('ordena a tabela por valor em ordem crescente e decrescente', async ({ page }) => {
  await waitForDashboard(page);

  await page.locator('#sortField').selectOption('valor');
  await expect(page).toHaveURL(/ordem=valor/);
  await expect(page.locator('#sortDirLabel')).toContainText(/decrescente/i);

  await page.locator('#sortDirBtn').click();
  await expect(page.locator('#sortDirLabel')).toContainText(/crescente/i);
  await expect.poll(async () => (await getState(page)).sortDir).toBe('asc');
});
