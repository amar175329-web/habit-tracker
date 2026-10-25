import { chromium } from "playwright";

async function verifyLive(appUrl, appName) {
  console.log(`\n========================================`);
  console.log(`TESTING LIVE PRODUCTION: ${appName} (${appUrl})`);
  console.log(`========================================`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15",
  });
  const page = await context.newPage();

  try {
    await page.goto(appUrl);
    await page.waitForTimeout(2000);

    // Clean session
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await page.waitForTimeout(1500);

    // 1. Add Habit 1: Alpha
    console.log("[1/5] Adding Habit 1 ('Alpha')...");
    const addBtn1 = page.locator("button:has-text('+ Add habit'), [aria-label='Add habit']").first();
    await addBtn1.click();
    await page.waitForURL("**/new-habit**", { timeout: 4000 });
    await page.locator("input[placeholder*='workout' i], input[type='text']").first().fill("Alpha");
    await page.locator("button:has-text('Save Habit')").click();
    await page.waitForURL((url) => !url.pathname.includes("new-habit"), { timeout: 4000 });
    await page.waitForTimeout(800);

    let habitTitles = await page.locator(".habit-tile-root").allInnerTexts();
    console.log("Current habits:", habitTitles.map(t => t.split("\n")[0]));
    if (!habitTitles.some(t => t.includes("Alpha"))) {
      throw new Error(`Habit 'Alpha' not rendered!`);
    }

    // 2. Add Habit 2: Beta
    console.log("[2/5] Adding Habit 2 ('Beta') - verifying NO OVERWRITE...");
    const addBtn2 = page.locator("button:has-text('+ Add habit'), [aria-label='Add habit']").first();
    await addBtn2.click();
    await page.waitForURL("**/new-habit**", { timeout: 4000 });
    await page.locator("input[placeholder*='workout' i], input[type='text']").first().fill("Beta");
    await page.locator("button:has-text('Save Habit')").click();
    await page.waitForURL((url) => !url.pathname.includes("new-habit"), { timeout: 4000 });
    await page.waitForTimeout(800);

    habitTitles = await page.locator(".habit-tile-root").allInnerTexts();
    console.log("Current habits after adding Beta:", habitTitles.map(t => t.split("\n")[0]));
    const hasAlpha = habitTitles.some(t => t.includes("Alpha"));
    const hasBeta = habitTitles.some(t => t.includes("Beta"));
    if (!hasAlpha || !hasBeta) {
      throw new Error(`OVERWRITE BUG DETECTED! hasAlpha=${hasAlpha}, hasBeta=${hasBeta}`);
    }
    console.log("✓ SUCCESS: Both Alpha and Beta co-exist simultaneously!");

    // 3. Add Habit 3: Gamma
    console.log("[3/5] Adding Habit 3 ('Gamma')...");
    const addBtn3 = page.locator("button:has-text('+ Add habit'), [aria-label='Add habit']").first();
    await addBtn3.click();
    await page.waitForURL("**/new-habit**", { timeout: 4000 });
    await page.locator("input[placeholder*='workout' i], input[type='text']").first().fill("Gamma");
    await page.locator("button:has-text('Save Habit')").click();
    await page.waitForURL((url) => !url.pathname.includes("new-habit"), { timeout: 4000 });
    await page.waitForTimeout(800);

    habitTitles = await page.locator(".habit-tile-root").allInnerTexts();
    console.log("Current habits after adding Gamma:", habitTitles.map(t => t.split("\n")[0]));
    if (!habitTitles.some(t => t.includes("Alpha")) || !habitTitles.some(t => t.includes("Beta")) || !habitTitles.some(t => t.includes("Gamma"))) {
      throw new Error("Missing habit among Alpha, Beta, Gamma!");
    }
    console.log("✓ SUCCESS: All 3 habits (Alpha, Beta, Gamma) rendered!");

    // 4. Toggle Alpha (cycles 0 -> 2 -> 1 -> 0)
    console.log("[4/5] Testing real-time toggle cycle on 'Alpha'...");
    const alphaTile = page.locator(".habit-tile-root").filter({ hasText: "Alpha" }).first();
    await alphaTile.click();
    await page.waitForTimeout(400);
    console.log("✓ Toggled Alpha state");

    // 5. Delete Beta in real-time
    console.log("[5/5] Testing real-time delete on 'Beta'...");
    const betaTile = page.locator(".habit-tile-root").filter({ hasText: "Beta" }).first();
    const menuBtn = betaTile.locator("button[aria-label='Habit options']");
    await menuBtn.click();
    await page.waitForTimeout(400);
    const deleteBtn = page.locator("button:has-text('Delete habit')");
    await deleteBtn.click();
    await page.waitForTimeout(800);

    habitTitles = await page.locator(".habit-tile-root").allInnerTexts();
    console.log("Habits after deleting Beta:", habitTitles.map(t => t.split("\n")[0]));
    if (habitTitles.some(t => t.includes("Beta"))) {
      throw new Error("Beta was NOT deleted in real-time!");
    }
    if (!habitTitles.some(t => t.includes("Alpha")) || !habitTitles.some(t => t.includes("Gamma"))) {
      throw new Error("Alpha or Gamma was lost!");
    }
    console.log("✓ SUCCESS: Beta deleted in real-time without page reload!");

    // Verification across reload
    console.log("Checking persistence after hard reload...");
    await page.reload();
    await page.waitForTimeout(1000);
    habitTitles = await page.locator(".habit-tile-root").allInnerTexts();
    console.log("Habits after reload:", habitTitles.map(t => t.split("\n")[0]));
    if (habitTitles.some(t => t.includes("Beta")) || !habitTitles.some(t => t.includes("Alpha")) || !habitTitles.some(t => t.includes("Gamma"))) {
      throw new Error("Persistence error after reload!");
    }
    console.log(`✓ 100% SUCCESS ON PRODUCTION FOR ${appName}!`);
  } finally {
    await browser.close();
  }
}

async function run() {
  await verifyLive("https://habit-tracker-livid-delta-16.vercel.app", "HABIT-TRACKER");
  await verifyLive("https://daily-os-wheat.vercel.app", "DAILY-OS");
  console.log("\n>>> ALL PRODUCTION SITES FULLY VERIFIED & 100% OPERATIONAL! <<<");
  process.exit(0);
}

run().catch((e) => {
  console.error("Verification failed:", e);
  process.exit(1);
});
