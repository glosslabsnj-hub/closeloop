import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, ".auth", "user.json");

setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill(process.env.TEST_EMAIL || "");
  await page.getByRole("textbox", { name: "Password" }).fill(process.env.TEST_PASSWORD || "");
  await page.getByRole("button", { name: "Sign In" }).click();

  // Wait for redirect to admin or app dashboard
  await page.waitForURL(/\/(admin|app)\//);
  await expect(page.getByText(/dashboard|command center/i)).toBeVisible({ timeout: 10000 });

  // Save auth state
  await page.context().storageState({ path: authFile });
});
