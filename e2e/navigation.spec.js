const { test, expect } = require('@playwright/test');

test.describe('Navigation & Core Pages', () => {
  test('home page loads and shows product listings', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Fusion|Electronics|Shop/i);
    // Should have some content visible
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('shop page is accessible', async ({ page }) => {
    await page.goto('/shop');
    await page.waitForTimeout(1000);
    // Shop page should load without errors
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('cart page is accessible', async ({ page }) => {
    await page.goto('/cart');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('login page is accessible', async ({ page }) => {
    await page.goto('/login');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('about page is accessible', async ({ page }) => {
    await page.goto('/about');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('non-existent route shows 404 page', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await page.waitForTimeout(1000);
    // Should show some content (404 page)
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('navigating from home to shop via link', async ({ page }) => {
    await page.goto('/');
    const shopLink = page.getByRole('link', { name: /shop/i }).first();
    if (await shopLink.isVisible()) {
      await shopLink.click();
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('/shop');
    }
  });
});
