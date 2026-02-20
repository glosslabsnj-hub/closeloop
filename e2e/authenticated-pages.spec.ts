import { test, expect } from "@playwright/test";
import path from "path";

// Use saved auth state
test.use({ storageState: path.join(__dirname, ".auth", "user.json") });

test.describe("Authenticated pages smoke tests", () => {
  test("admin dashboard loads", async ({ page }) => {
    await page.goto("/admin/dashboard");
    await expect(page.getByText(/command center/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Total Tenants")).toBeVisible();
  });

  test("app dashboard loads with widgets", async ({ page }) => {
    await page.goto("/app/dashboard");
    // Should see agent control panel or setup wizard
    await expect(
      page.getByText(/paused|live|setup/i).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("business brain loads", async ({ page }) => {
    await page.goto("/app/business-brain");
    await expect(page.getByRole("heading", { name: "Business Brain" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("complete")).toBeVisible();
  });

  test("bookings page loads", async ({ page }) => {
    await page.goto("/app/bookings");
    await expect(page.getByRole("heading", { name: "Schedule" })).toBeVisible({ timeout: 10000 });
  });

  test("settings page loads", async ({ page }) => {
    await page.goto("/app/settings");
    await expect(page.getByText("Team Members")).toBeVisible({ timeout: 10000 });
  });

  test("go live page loads", async ({ page }) => {
    await page.goto("/app/go-live");
    await expect(page.getByText(/choose your plan|readiness/i)).toBeVisible({ timeout: 10000 });
  });

  test("reports page loads", async ({ page }) => {
    await page.goto("/app/reports/roi");
    await expect(page.getByText(/revenue report/i)).toBeVisible({ timeout: 10000 });
  });

  test("help center loads", async ({ page }) => {
    await page.goto("/app/help");
    await expect(page.getByRole("heading", { name: "Help Center" })).toBeVisible({ timeout: 10000 });
  });

  test("integrations page loads", async ({ page }) => {
    await page.goto("/app/integrations");
    await expect(page.getByRole("heading", { name: "Integrations" })).toBeVisible({ timeout: 10000 });
  });

  test("leads/inbox page loads", async ({ page }) => {
    await page.goto("/app/inbox");
    await expect(page.getByRole("heading", { name: "Leads" })).toBeVisible({ timeout: 10000 });
  });
});
