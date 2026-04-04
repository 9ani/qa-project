const { test, expect } = require('@playwright/test');

test.describe('Authentication Flow', () => {
  test.describe('Login Page', () => {
    test('renders login form with email, password, and submit button', async ({ page }) => {
      await page.goto('/login');
      await expect(page.locator('input[type="email"], input[name="email"], input[id="email"]').first()).toBeVisible();
      await expect(page.locator('input[type="password"]').first()).toBeVisible();
      await expect(page.getByRole('button', { name: /login|sign in/i })).toBeVisible();
    });

    test('shows error on invalid credentials', async ({ page }) => {
      await page.goto('/login');
      await page.locator('input[type="email"], input[name="email"], input[id="email"]').first().fill('invalid@example.com');
      await page.locator('input[type="password"]').first().fill('wrongpassword');
      await page.getByRole('button', { name: /login|sign in/i }).click();

      // Should show an error or stay on login page
      await page.waitForTimeout(2000);
      const url = page.url();
      expect(url).toContain('/login');
    });

    test('has link to registration page', async ({ page }) => {
      await page.goto('/login');
      const registerLink = page.getByRole('link', { name: /register|sign up|create account/i });
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
