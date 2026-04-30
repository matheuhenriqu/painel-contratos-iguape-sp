import { test } from '@playwright/test';
import { expectDownloadWithExtension, waitForDashboard } from './helpers.js';

test('exporta CSV, XLSX, PDF e JSON do recorte atual', async ({ page }) => {
  await waitForDashboard(page);

  await expectDownloadWithExtension(page, '#exportCsvBtn', 'csv');
  await expectDownloadWithExtension(page, '#exportJsonBtn', 'json');
  await expectDownloadWithExtension(page, '#exportXlsxBtn', 'xlsx');
  await expectDownloadWithExtension(page, '#exportPdfBtn', 'pdf');
});
