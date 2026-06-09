import { test, expect } from '@playwright/test'

const PROTECTED_ROUTES = ['/dashboard', '/log', '/portfolio', '/watchlist']

for (const route of PROTECTED_ROUTES) {
  test(`${route} redirects unauthenticated users to /login`, async ({ page }) => {
    await page.goto(route)
    await expect(page).toHaveURL(/\/login/)
  })
}

// Verify that the login page itself is publicly accessible (not protected)
test('/login is publicly accessible', async ({ page }) => {
  await page.goto('/login')
  await expect(page).toHaveURL(/\/login/)
})

// Verify that the signup page itself is publicly accessible (not protected)
test('/signup is publicly accessible', async ({ page }) => {
  await page.goto('/signup')
  await expect(page).toHaveURL(/\/signup/)
})
