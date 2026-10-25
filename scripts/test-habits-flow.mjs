import { chromium } from "playwright";
import { spawn } from "child_process";

async function main() {
  console.log("Starting preview server...");
  let targetUrl = "";
  const server = spawn("npx", ["vite", "preview", "--port", "54321"], {
    cwd: "/home/ubuntu/habit-tracker",
    stdio: "pipe",
  });

  server.stdout.on("data", (d) => {
    const text = d.toString();
    console.log(`[server] ${text}`);
    const match = text.match(/http:\/\/(localhost|127\.0\.0\.1):(\d+)\//);
    if (match) {
      targetUrl = `http://localhost:${match[2]}/`;
    }
  });
  server.stderr.on("data", (d) => console.error(`[server err] ${d}`));

  for (let i = 0; i < 30; i++) {
    if (targetUrl) break;
    await new Promise((res) => setTimeout(res, 200));
  }
  if (!targetUrl) targetUrl = "http://localhost:54321/";

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15",
  });
  const page = await context.newPage();

  try {
    console.log(`Navigating to ${targetUrl}...`);
    await page.goto(targetUrl);
    await page.waitForTimeout(1000);

    // Clean start: clear local storage & indexedDB if needed
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await page.waitForTimeout(1000);

    console.log("--- TEST 1: Create Habit 1 ('Workout') ---");
    // Click Add habit
    const addBtn1 = page.locator("button:has-text('+ Add habit'), [aria-label='Add habit']").first();
    await addBtn1.click();
    await page.waitForURL("**/new-habit**");
    
    // Fill Habit name
    await page.locator("input[placeholder*='workout' i], input[type='text']").first().fill("Workout");
    // Click Save habit
    await page.locator("button:has-text('Save Habit')").click();
    
    // Should be redirected to Today page (/)
    await page.waitForURL((url) => !url.pathname.includes("new-habit"), { timeout: 3000 });
    await page.waitForTimeout(500);

    let habitTitles = await page.locator(".habit-tile-root").allInnerTexts();
    console.log("Habits after Habit 1:", habitTitles.map(t => t.split("\n")[0]));
    if (!habitTitles.some(t => t.includes("Workout"))) {
      throw new Error("Habit 1 ('Workout') not found on Today screen!");
    }

    console.log("--- TEST 2: Create Habit 2 ('Study') ---");
    const addBtn2 = page.locator("button:has-text('+ Add habit'), [aria-label='Add habit']").first();
    await addBtn2.click();
    await page.waitForURL("**/new-habit**");

    await page.locator("input[placeholder*='workout' i], input[type='text']").first().fill("Study");
    await page.locator("button:has-text('Save Habit')").click();

    await page.waitForURL((url) => !url.pathname.includes("new-habit"), { timeout: 3000 });
    await page.waitForTimeout(500);

    habitTitles = await page.locator(".habit-tile-root").allInnerTexts();
    console.log("Habits after Habit 2:", habitTitles.map(t => t.split("\n")[0]));
    const hasWorkout = habitTitles.some(t => t.includes("Workout"));
    const hasStudy = habitTitles.some(t => t.includes("Study"));
    if (!hasWorkout || !hasStudy) {
      throw new Error(`CRITICAL DEFECT: Habit 1 or 2 missing! hasWorkout=${hasWorkout}, hasStudy=${hasStudy}`);
    }
    console.log("SUCCESS: Both Workout and Study are visible simultaneously!");

    console.log("--- TEST 3: Create Habit 3 ('Reading') ---");
    const addBtn3 = page.locator("button:has-text('+ Add habit'), [aria-label='Add habit']").first();
    await addBtn3.click();
    await page.waitForURL("**/new-habit**");

    await page.locator("input[placeholder*='workout' i], input[type='text']").first().fill("Reading");
    await page.locator("button:has-text('Save Habit')").click();

    await page.waitForURL((url) => !url.pathname.includes("new-habit"), { timeout: 3000 });
    await page.waitForTimeout(500);

    habitTitles = await page.locator(".habit-tile-root").allInnerTexts();
    console.log("Habits after Habit 3:", habitTitles.map(t => t.split("\n")[0]));
    if (!habitTitles.some(t => t.includes("Workout")) || !habitTitles.some(t => t.includes("Study")) || !habitTitles.some(t => t.includes("Reading"))) {
      throw new Error("One or more of the 3 habits is missing!");
    }
    console.log("SUCCESS: All 3 habits (Workout, Study, Reading) visible together!");

    console.log("--- TEST 4: Real-time Toggle Cycle (Habit 1) ---");
    const workoutTile = page.locator(".habit-tile-root").filter({ hasText: "Workout" }).first();
    // Click once -> should turn Done (state 2)
    await workoutTile.click();
    await page.waitForTimeout(300);
    let stateText = await workoutTile.innerText();
    console.log("After 1st tap text:", stateText.replace(/\n/g, " | "));

    // Click again -> should turn Half (state 1)
    await workoutTile.click();
    await page.waitForTimeout(300);
    stateText = await workoutTile.innerText();
    console.log("After 2nd tap text:", stateText.replace(/\n/g, " | "));

    console.log("--- TEST 5: Real-time Delete (Habit 2: Study) ---");
    const studyTile = page.locator(".habit-tile-root").filter({ hasText: "Study" }).first();
    // Open 3-dots options menu on Study habit
    const menuBtn = studyTile.locator("button[aria-label='Habit options']");
    await menuBtn.click();
    await page.waitForTimeout(300);

    // Click "Delete habit" in action sheet
    const deleteBtn = page.locator("button:has-text('Delete habit')");
    await deleteBtn.click();
    await page.waitForTimeout(500);

    habitTitles = await page.locator(".habit-tile-root").allInnerTexts();
    console.log("Habits after Delete Study:", habitTitles.map(t => t.split("\n")[0]));
    if (habitTitles.some(t => t.includes("Study"))) {
      throw new Error("Study habit was NOT deleted in real-time!");
    }
    if (!habitTitles.some(t => t.includes("Workout")) || !habitTitles.some(t => t.includes("Reading"))) {
      throw new Error("Workout or Reading was accidentally removed!");
    }
    console.log("SUCCESS: Study deleted immediately, Workout and Reading remain!");

    console.log("--- TEST 6: Persistence verification across page reload ---");
    await page.reload();
    await page.waitForTimeout(800);
    habitTitles = await page.locator(".habit-tile-root").allInnerTexts();
    console.log("Habits after full reload:", habitTitles.map(t => t.split("\n")[0]));
    if (habitTitles.some(t => t.includes("Study")) || !habitTitles.some(t => t.includes("Workout")) || !habitTitles.some(t => t.includes("Reading"))) {
      throw new Error("Persistence check failed after page reload!");
    }
    console.log("SUCCESS: Persistence verified across browser reload!");

    console.log("ALL E2E HABIT TESTS PASSED WITH 100% SUCCESS!");
  } finally {
    await browser.close();
    server.kill();
  }
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
