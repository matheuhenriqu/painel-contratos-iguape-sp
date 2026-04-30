import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { captureConsole, expectNoConsoleErrors, waitForDashboard } from './helpers.js';

test('carrega o painel, exibe indicadores e não registra erros no console', async ({ page }) => {
  const consoleErrors = captureConsole(page);

  await waitForDashboard(page);
  await expect(page.locator('#kpiGrid .kpi-card, #kpiGrid .kpi-button').first()).toBeVisible();
  await expect(page.locator('#contractsTable tr[data-contract-row]').first()).toBeVisible();

  await expectNoConsoleErrors(consoleErrors);
});

test('não possui violações axe na tela principal', async ({ page }) => {
  await waitForDashboard(page);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
