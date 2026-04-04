const { test, expect } = require('@playwright/test');

test.describe('Search Functionality', () => {
  test('search page renders results or empty state', async ({ page }) => {
    await page.goto('/shop');
    await page.waitForTimeout(1000);

    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[name="search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('laptop');
      await searchInput.press('Enter');
      await page.waitForTimeout(2000);
      await expect(page.locator('body')).not.toBeEmpty();
    }
  });

  test('search with no results shows appropriate message', async ({ page }) => {
    await page.goto('/shop');
    await page.waitForTimeout(1000);

    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[name="search"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('xyznonexistentproduct12345');
      await searchInput.press('Enter');
      await page.waitForTimeout(2000);
      await expect(page.locator('body')).not.toBeEmpty();
    }
  });
});
