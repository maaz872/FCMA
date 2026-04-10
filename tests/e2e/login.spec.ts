import { test, expect } from "@playwright/test";

/**
 * Phase 1 smoke test for Playwright plumbing.
 *
 * Just verifies that:
 * - The dev server starts
 * - /login renders
 * - Form submission with invalid creds shows an error
 *
 * Real E2E suites (Phase 6) live in super-admin.spec.ts, coach.spec.ts, etc.
 */
test.describe("Login page", () => {
  test("renders the login form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in|login|log in/i })).toBeVisible();
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill("nonexistent@example.com");
    await page.getByLabel(/password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /sign in|login|log in/i }).click();

    // Wait for the error message (may be "Invalid email or password" or similar)
    await expect(
      page.getByText(/invalid|incorrect|wrong/i).first()
    ).toBeVisible({ timeout: 10_000 });

    // URL should still be /login (not redirected)
    await expect(page).toHaveURL(/\/login/);
  });
});
