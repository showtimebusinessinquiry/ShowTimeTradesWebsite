import { test, expect } from '@playwright/test'

test.describe('Trade Log', () => {
  // ─────────────────────────────────────────────
  // Unauthenticated access (runnable without a live app/auth)
  // ─────────────────────────────────────────────

  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/log')
    await expect(page).toHaveURL(/login/)
  })

  // ─────────────────────────────────────────────
  // Authenticated tests
  //
  // NOTE: The tests below require a running Next.js dev server AND valid
  // Supabase test credentials set in the environment (TEST_USER_EMAIL,
  // TEST_USER_PASSWORD). They are documented here as the complete E2E spec
  // but will be skipped when those environment variables are absent.
  // ─────────────────────────────────────────────

  test.describe('authenticated trade log interactions', () => {
    // Helper: sign in before each test in this block
    test.beforeEach(async ({ page }) => {
      const email = process.env.TEST_USER_EMAIL
      const password = process.env.TEST_USER_PASSWORD
      if (!email || !password) {
        test.skip()
        return
      }
      await page.goto('/login')
      await page.fill('input[type="email"]', email)
      await page.fill('input[type="password"]', password)
      await page.click('button[type="submit"]')
      await page.waitForURL(/dashboard|log/)
    })

    test('shows trade table with correct column headers', async ({ page }) => {
      await page.goto('/log')
      await expect(page.locator('th', { hasText: /date/i })).toBeVisible()
      await expect(page.locator('th', { hasText: /ticker/i })).toBeVisible()
      await expect(page.locator('th', { hasText: /type/i })).toBeVisible()
      await expect(page.locator('th', { hasText: /strategy/i })).toBeVisible()
      await expect(page.locator('th', { hasText: /entry/i })).toBeVisible()
      await expect(page.locator('th', { hasText: /exit/i })).toBeVisible()
      await expect(page.locator('th', { hasText: /qty/i })).toBeVisible()
      await expect(page.locator('th', { hasText: /p&l/i }).first()).toBeVisible()
      await expect(page.locator('th', { hasText: /dte/i })).toBeVisible()
    })

    test('"Add Trade" button opens the modal', async ({ page }) => {
      await page.goto('/log')
      await page.click('button:has-text("Add Trade")')
      // Modal should be visible with the "Add Trade" title
      await expect(page.locator('[role="dialog"], .modal, [class*="modal"]').first()).toBeVisible()
      await expect(page.locator('text=Add Trade').first()).toBeVisible()
    })

    test('selecting "option" as asset type reveals option-specific fields', async ({ page }) => {
      await page.goto('/log')
      await page.click('button:has-text("Add Trade")')

      // Default is equity; switch to option
      await page.selectOption('select[id*="asset"], select', { value: 'option' })

      // Option-specific fields should now be visible
      await expect(page.locator('label:has-text("Strike"), [class*="label"]:has-text("Strike")').first()).toBeVisible()
      await expect(page.locator('label:has-text("Expiration"), [class*="label"]:has-text("Expiration")').first()).toBeVisible()
      await expect(page.locator('label:has-text("Delta"), [class*="label"]:has-text("Delta")').first()).toBeVisible()
      await expect(page.locator('label:has-text("DTE"), [class*="label"]:has-text("DTE")').first()).toBeVisible()
    })

    test('selecting "equity" as asset type hides option-specific fields', async ({ page }) => {
      await page.goto('/log')
      await page.click('button:has-text("Add Trade")')

      // First switch to option to ensure conditional fields exist
      await page.selectOption('select[id*="asset"], select', { value: 'option' })
      // Then switch back to equity
      await page.selectOption('select[id*="asset"], select', { value: 'equity' })

      // Option-specific section should be hidden
      await expect(
        page.locator('text=Option Details')
      ).not.toBeVisible()
    })

    test('submitting trade form with missing ticker shows validation error', async ({ page }) => {
      await page.goto('/log')
      await page.click('button:has-text("Add Trade")')

      // Fill entry price but leave ticker blank
      await page.fill('input[placeholder="0.00"]', '100')
      await page.click('button[type="submit"]')

      // Form-level error should appear
      await expect(
        page.locator('.text-loss, [class*="error"]').first()
      ).toBeVisible({ timeout: 3000 })
    })

    test('submitting trade form with missing entry price shows validation error', async ({ page }) => {
      await page.goto('/log')
      await page.click('button:has-text("Add Trade")')

      // Fill ticker but no entry price
      await page.fill('input[placeholder="AAPL"]', 'AAPL')
      await page.click('button[type="submit"]')

      // Validation error should appear
      await expect(
        page.locator('.text-loss, [class*="error"]').first()
      ).toBeVisible({ timeout: 3000 })
    })

    test('cancel button closes the add trade modal', async ({ page }) => {
      await page.goto('/log')
      await page.click('button:has-text("Add Trade")')
      await page.click('button:has-text("Cancel")')
      await expect(
        page.locator('[role="dialog"], .modal, [class*="modal"]').first()
      ).not.toBeVisible()
    })
  })
})
