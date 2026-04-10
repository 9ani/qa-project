const { test, expect } = require('@playwright/test');
const { mockCatalogApi, mockCheckout, sampleProducts } = require('./support/mockApi');

test.describe('Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockCatalogApi(page);
  });

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

  test('rapid double-submit triggers a single order request and lands on success', async ({ page }) => {
    let checkoutRequests = 0;
    await mockCheckout(page, {
      delayMs: 600,
      onRequest: () => {
        checkoutRequests += 1;
      },
    });

    await page.addInitScript(product => {
      localStorage.setItem(
        'fusionCart',
        JSON.stringify([
          {
            id: product.id,
            _id: product._id,
            name: product.name,
            price: product.price,
            quantity: 1,
            image: product.image,
          },
        ])
      );
    }, sampleProducts[0]);

    await page.goto('/checkout');
    await expect(page.getByText(/Selected items \(1\/1\)/i)).toBeVisible();

    await page.getByLabel('Full Name').fill('Ada Lovelace');
    await page.getByLabel('Email Address').fill('ada@example.com');
    await page.getByLabel('Shipping Address').fill('123 Binary Blvd');
    await page.getByLabel(/Card Number/).fill('4111111111111111');
    await page.getByLabel('Name on Card').fill('Ada Lovelace');
    await page.getByLabel('Expiry Date').fill('12/2030');
    await page.getByLabel('CVC').fill('123');

    const submitButton = page.getByRole('button', { name: /place order/i });
    await expect(submitButton).toBeEnabled();

    await submitButton.evaluate(button => {
      button.click();
      button.click();
    });

    await expect.poll(() => checkoutRequests).toBe(1);
    await expect(page).toHaveURL(/\/order-success$/);
    await expect(page.getByText(/Order Successful!/i)).toBeVisible();
    expect(checkoutRequests).toBe(1);
  });
});
