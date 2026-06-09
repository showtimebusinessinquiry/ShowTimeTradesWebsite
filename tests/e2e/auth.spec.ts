import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('text=Sign in')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('redirects unauthenticated user from /dashboard to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/login/)
  })

  test('redirects unauthenticated user from /log to /login', async ({ page }) => {
    await page.goto('/log')
    await expect(page).toHaveURL(/login/)
  })

  test('redirects unauthenticated user from /portfolio to /login', async ({ page }) => {
    await page.goto('/portfolio')
    await expect(page).toHaveURL(/login/)
  })

  test('redirects unauthenticated user from /watchlist to /login', async ({ page }) => {
    await page.goto('/watchlist')
    await expect(page).toHaveURL(/login/)
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'bad@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    // Error message should appear — the login form renders errors with text-loss class
    await expect(
      page.locator('.text-loss, [class*="error"], [class*="loss"]').first()
    ).toBeVisible({ timeout: 5000 })
  })

  test('signup page renders correctly', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.locator('text=Create Account')).toBeVisible()
  })

  test('login page has a link to the signup page', async ({ page }) => {
    await page.goto('/login')
    // There should be a way to navigate to sign up from the login page
    const signupLink = page.locator('a[href="/signup"], a[href*="signup"]')
    await expect(signupLink).toBeVisible()
  })

  test('login form submit button is present', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('signup page has email and password fields', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })
})
