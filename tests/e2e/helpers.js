import { expect } from '@playwright/test';

export function captureConsole(page) {
  const messages = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      messages.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    messages.push(error.message);
  });
  return messages;
}

export async function waitForDashboard(page) {
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__CONTRATOS_IGUAPE_STATE__?.total));
  await expect(page.locator('#kpiGrid')).toBeVisible();
  await expect(page.locator('#tableCount')).toContainText(/contrato/i);
}

export async function openFilters(page) {
  const searchInput = page.locator('#searchInput');
  if (!(await searchInput.isVisible())) {
    await page.locator('#toggleFiltersBtn').click();
  }
  await expect(searchInput).toBeVisible();
}

export async function expectNoConsoleErrors(messages) {
  expect(messages.filter((message) => !isExpectedBrowserNoise(message))).toEqual([]);
}

export async function expectDownloadWithExtension(page, selector, extension) {
  const downloadPromise = page.waitForEvent('download');
  await page.locator(selector).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(new RegExp(`\\.${extension}$`, 'i'));
  await download.delete();
}

export async function getState(page) {
  return page.evaluate(() => window.__CONTRATOS_IGUAPE_STATE__);
}

function isExpectedBrowserNoise(message) {
  return /service worker|favicon|manifest/i.test(message);
}
