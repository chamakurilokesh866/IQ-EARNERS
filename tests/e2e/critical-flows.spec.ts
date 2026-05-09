import { test, expect } from "@playwright/test"

test.describe("critical public flows", () => {
  test("home page renders", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveTitle(/quiz|iq|challenge|master/i)
    await expect(page.locator("body")).toBeVisible()
  })

  test("key growth pages are reachable", async ({ request }) => {
    const pages = ["/leaderboard", "/tournaments", "/mock-exam", "/more/faq"]
    for (const route of pages) {
      const apiRes = await request.get(route)
      expect(apiRes.status()).toBeLessThan(500)
    }
  })

  test("admin settings aliases resolve", async ({ request }) => {
    const aliases = ["/admin/settings", "/dashboard/settings"]
    for (const route of aliases) {
      const res = await request.get(route, { maxRedirects: 0 })
      expect([200, 307, 308]).toContain(res.status())
    }
  })
})

test.describe("critical api health", () => {
  test("public AI and contact APIs do not crash", async ({ request }) => {
    const support = await request.post("/api/ai/support", {
      data: { message: "What is this app?" }
    })
    expect(support.status()).toBeLessThan(500)

    const contact = await request.post("/api/contact", {
      data: { name: "E2E Bot", email: "e2e@example.com", message: "hello", reason: "test" }
    })
    expect(contact.status()).toBeLessThan(500)
  })

  test("practice quiz generation endpoint stays healthy", async ({ request }) => {
    const res = await request.post("/api/practice-quiz/generate", {
      data: { category: "General Knowledge" }
    })
    // Accepts rate-limit or successful generation, but should not hard-crash.
    expect(res.status()).toBeLessThan(500)
  })
})
