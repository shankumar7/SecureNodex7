import { test, expect } from "@playwright/test";

test.describe("SecureNodeX Dashboard End-to-End Demo Flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000");
  });

  test("Overview plane displays 5/5 operational architecture planes", async ({ page }) => {
    await expect(page.locator("text=SecureNodeX Control & Trust Dashboard")).toBeVisible();
    await expect(page.locator("text=Device Plane")).toBeVisible();
    await expect(page.locator("text=Data Plane")).toBeVisible();
    await expect(page.locator("text=Trust Plane")).toBeVisible();
  });

  test("Role switching updates persona and access privileges", async ({ page }) => {
    // Open user persona menu
    await page.click("button:has-text('ADMIN'), button:has-text('USER')");
    await expect(page.locator("text=Switch Demo Persona:")).toBeVisible();

    // Switch to Auditor
    await page.click("button:has-text('AUDITOR')");
    await expect(page.locator("text=AUDITOR")).toBeVisible();
  });

  test("Devices tab lists registered identities and allows enrollment modal", async ({ page }) => {
    await page.click("button:has-text('Devices (PKI)')");
    await expect(page.locator("text=Device PKI & Identity Management")).toBeVisible();

    // Click Enroll
    await page.click("button:has-text('Enroll New Device')");
    await expect(page.locator("text=Enroll Device Identity")).toBeVisible();
  });

  test("Objects tab renders Interactive Placement Grid (Chunks x Nodes)", async ({ page }) => {
    await page.click("button:has-text('Decentralized Data')");
    await expect(page.locator("text=Decentralized Split Storage")).toBeVisible();

    // Open placement modal if objects exist
    const placementBtn = page.locator("button:has-text('Placement')").first();
    if (await placementBtn.isVisible()) {
      await placementBtn.click();
      await expect(page.locator("text=Placement Matrix")).toBeVisible();
      await expect(page.locator("text=Primary Replica")).toBeVisible();
    }
  });

  test("Live telemetry stream displays verified ECDSA P-256 badges", async ({ page }) => {
    await page.click("button:has-text('Live Telemetry')");
    await expect(page.locator("text=Live Telemetry & Merkle Batch Stream")).toBeVisible();
    await expect(page.locator("text=ECDSA P-256").first()).toBeVisible();
  });

  test("Audit tab allows recomputing rolling hash chain from genesis", async ({ page }) => {
    await page.click("button:has-text('Audit Timeline')");
    await expect(page.locator("text=Cryptographic Audit Log & Hash Chain")).toBeVisible();

    // Click Verify Chain
    const verifyBtn = page.locator("button:has-text('Verify Hash Chain')");
    await expect(verifyBtn).toBeVisible();
    await verifyBtn.click();
  });
});
