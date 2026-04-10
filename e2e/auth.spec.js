const { test, expect } = require('@playwright/test');
const { mockCatalogApi, mockInvalidLogin } = require('./support/mockApi');

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockCatalogApi(page);
  });

  test.describe('Login Page', () => {
    test('renders login form with email, password, and submit button', async ({ page }) => {
      await page.goto('/login');
      await expect(page.locator('input[type="email"], input[name="email"], input[id="email"]').first()).toBeVisible();
      await expect(page.locator('input[type="password"]').first()).toBeVisible();
      await expect(page.getByRole('button', { name: /login|sign in/i })).toBeVisible();
    });

    test('shows error on invalid credentials', async ({ page }) => {
      await mockInvalidLogin(page);
      await page.goto('/login');
      const loginForm = page.locator('main form');
      await loginForm.getByLabel('Email').fill('invalid@example.com');
      await loginForm.locator('input[type="password"]').fill('wrongpassword');

      const loginResponse = page.waitForResponse(
        response =>
          response.url().includes('/api/auth/login') &&
          response.request().method() === 'POST'
      );
      await loginForm.getByRole('button', { name: /^login$/i }).click();

      const response = await loginResponse;
      expect(response.status()).toBe(400);
      await expect(page).toHaveURL(/\/login$/);
    });

    test('has link to registration page', async ({ page }) => {
      await page.goto('/login');
      const registerLink = page.getByRole('link', { name: /register|sign up|create account/i }).first();
      await expect(registerLink).toBeVisible();
    });

    test('has link to forgot password', async ({ page }) => {
      await page.goto('/login');
      const forgotLink = page.getByRole('link', { name: /forgot/i });
      await expect(forgotLink).toBeVisible();
    });
  });

  test.describe('Registration Page', () => {
    test('renders registration form', async ({ page }) => {
      await page.goto('/register');
      await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
      await expect(page.locator('input[type="password"]').first()).toBeVisible();
      await expect(page.getByRole('button', { name: /register|sign up|create/i })).toBeVisible();
    });

    test('shows validation error on short password', async ({ page }) => {
      await page.goto('/register');
      const nameInput = page.locator('input[name="name"], input[id="name"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.fill('Test User');
      }
      await page.locator('input[type="email"], input[name="email"]').first().fill('testuser@example.com');
      await page.locator('input[type="password"]').first().fill('12');
      await page.getByRole('button', { name: /register|sign up|create/i }).click();

      await page.waitForTimeout(1000);
      // Should stay on register page or show error
      const url = page.url();
      expect(url).toContain('/register');
    });
  });
});
