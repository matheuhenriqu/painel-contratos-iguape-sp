import { expect, test } from '@playwright/test';
import { waitForDashboard } from './helpers.js';

test('abre e fecha o detalhe do contrato com deep-link', async ({ page }) => {
  await waitForDashboard(page);

  const firstButton = page.locator('[data-open-contract]').first();
  const contractId = await firstButton.getAttribute('data-open-contract');
  await firstButton.click();

  await expect(page.locator('#contractDialog')).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`#contrato/${contractId}$`));

  await page.locator('#contractDialogCloseBtn').click();
  await expect(page.locator('#contractDialog')).toBeHidden();

  await page.goto(`/#contrato/${contractId}`);
  await expect(page.locator('#contractDialog')).toBeVisible();
});

test('alterna cards no mobile e mantém alvos de toque acessíveis', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await waitForDashboard(page);

  await page.locator('#mobileViewToggleBtn').click();
  await expect(page.locator('#contractsCards')).toBeVisible();
  const box = await page.locator('#mobileViewToggleBtn').boundingBox();

  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
});

test('atalhos focam busca, limpam filtro e abrem ajuda', async ({ page }) => {
  await waitForDashboard(page);

  await page.keyboard.press('/');
  await expect(page.locator('#searchInput')).toBeFocused();

  await page.locator('#searchInput').fill('empresa');
  await page.keyboard.press('Escape');
  await expect(page.locator('#searchInput')).toBeFocused();
  await expect(page.locator('#searchInput')).toHaveValue('');

  await page.keyboard.press('Tab');
  await page.keyboard.press('Shift+?');
  await expect(page.locator('#shortcutsDialog')).toBeVisible();
  await page.locator('#shortcutsDialogCloseBtn').click();
  await expect(page.locator('#shortcutsDialog')).toBeHidden();
});
