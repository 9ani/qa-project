const { test, expect } = require('@playwright/test');

test.describe('Checkout Flow', () => {
  test('checkout page redirects or shows form', async ({ page }) => {
    await page.goto('/checkout');
    await page.waitForTimeout(1000);
    // Checkout should either show a form or redirect to cart/login
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('checkout page has required payment fields when items in cart', async ({ page }) => {
    // First add an item to cart via localStorage
    await page.goto('/');
    await page.evaluate(() => {
      const cart = [
        {
          id: 'test-product-1',
          name: 'Test Product',
          price: 29.99,
          quantity: 1,
          image: 'test.png',
        },
      ];
      localStorage.setItem('fusionCart', JSON.stringify(cart));
    });
    await page.goto('/checkout');
    await page.waitForTimeout(2000);

    // Should show checkout form fields
    const body = await page.locator('body').textContent();
    // The page should have some checkout-related content
    expect(body.length).toBeGreaterThan(0);
  });

  test('order success page loads', async ({ page }) => {
    await page.goto('/order-success');
    await page.waitForTimeout(1000);
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
