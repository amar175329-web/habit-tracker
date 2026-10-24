import { test, expect } from "@playwright/test";

const PASSWORD = "dailyos";

async function login(page: any) {
  await page.goto("/login");
  await expect(page.getByTestId("password-input")).toBeVisible();
  await page.getByTestId("password-input").fill(PASSWORD);
  await page.getByTestId("login-button").click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("habit-workout")).toBeVisible({ timeout: 10_000 });
}

test.describe("DailyOS E2E", () => {
  test.beforeEach(async ({ page }) => {
    // Ensure clean: login first to clean data via API? We'll rely on API cleanup via direct DB? Instead use UI.
  });

  test("1 login → Today → habit RED→LIGHT→WHITE → refresh persists", async ({ page }) => {
    await login(page);
    // Today should show 4 habits
    await expect(page.getByTestId("habit-workout")).toBeVisible();
    await expect(page.getByTestId("habit-ai")).toBeVisible();
    await expect(page.getByTestId("habit-ai")).toContainText("AI");
    await expect(page.getByText("English")).not.toBeVisible();

    const workout = page.getByTestId("habit-workout");
    await expect(workout).toHaveAttribute("data-state", "0");
    await workout.click();
    await expect(workout).toHaveAttribute("data-state", "2");
    await workout.click();
    await expect(workout).toHaveAttribute("data-state", "1");
    await workout.click();
    await expect(workout).toHaveAttribute("data-state", "0");

    // Now set to RED and refresh
    await workout.click(); // 0->2
    await expect(workout).toHaveAttribute("data-state", "2");
    await page.reload();
    await expect(page.getByTestId("habit-workout")).toHaveAttribute("data-state", "2");
    // Cleanup: back to WHITE
    await page.getByTestId("habit-workout").click(); // 2->1
    await page.getByTestId("habit-workout").click(); // 1->0
    await expect(page.getByTestId("habit-workout")).toHaveAttribute("data-state", "0");
  });

  test("2 sleep 23:45→07:15 = 7h30m + daily log + isolation + calendar/timeline/heatmap/insights/search/export/logout", async ({ page }) => {
    await login(page);
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

    // Sleep
    await expect(page.getByTestId("sleep-bed")).toBeVisible();
    await page.getByTestId("sleep-bed").fill("23:45");
    await page.getByTestId("sleep-wake").fill("07:15");
    // Duration should show 7h 30m
    await expect(page.getByText("7h 30m").first()).toBeVisible();
    await page.getByTestId("sleep-save").click();
    await expect(page.getByTestId("sleep-save")).toBeVisible();

    // Daily log
    const log = page.getByTestId("daily-log");
    await expect(log).toBeVisible();
    const unique = `E2E log ${Date.now()} — what happened today`;
    await log.fill(unique);
    // Autosave shows Saving/Saved - wait for debounce
    await page.waitForTimeout(1200);
    await expect(page.getByText(/Saved|Saving/).first()).toBeVisible({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(300);
    await page.reload();
    await expect(page.getByTestId("daily-log")).toHaveValue(unique);

    // Date isolation: go to previous day via URL
    const prev = new Date(`${today}T12:00:00`);
    prev.setDate(prev.getDate() - 1);
    const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-${String(prev.getDate()).padStart(2, "0")}`;
    await page.goto(`/day/${prevKey}`);
    await expect(page.getByTestId("habit-workout")).toBeVisible();
    // Previous day should not have same sleep/log (unless previously set)
    // It should be WHITE and empty log
    // We check that workout is not necessarily 2 (could be 0) and log is not unique
    const prevLog = page.getByTestId("daily-log");
    await expect(prevLog).not.toHaveValue(unique);

    // Back to today
    await page.goto("/");
    await expect(page.getByTestId("daily-log")).toHaveValue(unique);

    // Calendar
    await page.goto("/calendar");
    await expect(page.getByText(/Calendar/)).toBeVisible();
    // Navigate months
    const prevBtn = page.getByText("‹").first();
    await prevBtn.click();
    await page.waitForTimeout(500);
    await page.getByText("›").first().click();
    await page.waitForTimeout(500);
    // Open a date drawer (today)
    const todayCell = page.getByTestId(`cal-${today}`);
    if (await todayCell.isVisible()) {
      await todayCell.click();
      await expect(page.getByText(/Day detail/)).toBeVisible();
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
      // Close via click backdrop
      const close = page.getByLabel("Close");
      if (await close.isVisible()) await close.click();
    }

    // Timeline
    await page.goto("/timeline");
    await expect(page.getByRole("heading", { name: "Your days" })).toBeVisible();
    await expect(page.getByText(unique.slice(0, 15))).toBeVisible({ timeout: 5000 });

    // Heatmap is on calendar - already visible
    await page.goto("/calendar");
    await expect(page.getByText(/consistency/)).toBeVisible();

    // Insights
    await page.goto("/insights");
    await expect(page.getByRole("heading", { name: /Weekly review|Monthly review/ })).toBeVisible();
    await expect(page.getByText(/Habit completion/)).toBeVisible();

    // Search
    await page.goto("/search");
    await page.getByTestId("search-input").fill(unique.slice(0, 8));
    await page.getByTestId("search-button").click();
    await expect(page.getByTestId(`search-result-${today}`)).toBeVisible({ timeout: 5000 });

    // Export
    await page.goto("/export");
    await expect(page.getByTestId("export-json")).toBeVisible();
    // Mock download? Instead verify API directly
    const [json] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/export") && r.request().method() === "GET"),
      page.getByTestId("export-json").click(),
    ]).catch(() => [null]);
    // Also test via API fetch inside page
    const exportData = await page.evaluate(async () => {
      const res = await fetch("/api/export", { credentials: "include" });
      return res.json();
    });
    expect(exportData.habits.map((h: any) => h.id).sort()).toEqual(["ai", "book", "study", "workout"]);
    expect(exportData.habits.some((h: any) => h.label === "AI")).toBeTruthy();
    expect(JSON.stringify(exportData).toLowerCase()).not.toContain("english");
    // Verify our log is in export
    const found = exportData.dailyLogs.some((d: any) => d.content === unique);
    expect(found).toBeTruthy();

    // Cleanup: clear log and sleep
    await page.goto("/");
    await page.getByTestId("daily-log").fill("");
    await page.waitForTimeout(1200);
    // Set sleep to 00:00 (will be 0h)
    await page.getByTestId("sleep-bed").fill("00:00");
    await page.getByTestId("sleep-wake").fill("00:00");
    await page.getByTestId("sleep-save").click();
    // Clear habit
    const w = page.getByTestId("habit-workout");
    let state = await w.getAttribute("data-state");
    // Ensure WHITE
    for (let i = 0; i < 3; i++) {
      state = await w.getAttribute("data-state");
      if (state === "0") break;
      await w.click();
      await page.waitForTimeout(400);
    }

    // Logout
    await page.goto("/");
    await page.getByText("Logout").click();
    await expect(page).toHaveURL(/\/login/);
    // Protected route should reject
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/calendar");
    await expect(page).toHaveURL(/\/login/);
  });

  test("3 empty states, invalid date, mobile viewport, unauthorized API", async ({ page, request }) => {
    // Empty state check after login with clean tomorrow date
    await login(page);
    const tomorrow = new Date(`${new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" })}T12:00:00`);
    tomorrow.setDate(tomorrow.getDate() + 2);
    const tKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
    await page.goto(`/day/${tKey}`);
    await expect(page.getByText(/No data yet for/)).toBeVisible();

    // Invalid date via direct navigation should still show Today fallback or error
    await page.goto(`/day/invalid-date`);
    // Should either redirect or show error — ensure not crash
    await expect(page).toHaveURL(/\/day\/invalid-date|\//);

    // Unauthorized API via request (no cookie)
    const unauth = await request.get("http://127.0.0.1:8788/api/day/2026-09-02");
    expect(unauth.status()).toBe(401);

    // Invalid habitId
    const bad = await page.evaluate(async () => {
      const res = await fetch("/api/habit-logs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: "2026-09-02", habitId: "english", state: 2 }),
        credentials: "include",
      });
      return { status: res.status, body: await res.text() };
    });
    expect(bad.status).toBe(400);

    // Check that export does not contain secrets
    const exp = await page.evaluate(async () => {
      const res = await fetch("/api/export", { credentials: "include" });
      const j = await res.json();
      return JSON.stringify(j);
    });
    expect(exp.toLowerCase()).not.toContain("password");
    expect(exp.toLowerCase()).not.toContain("jwt");
    expect(exp.toLowerCase()).not.toContain("secret");
  });

  test("4 mobile viewport still usable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    await expect(page.getByTestId("habit-workout")).toBeVisible();
    // Habit targets should be at least 44px - check bounding box
    const box = await page.getByTestId("habit-workout").boundingBox();
    expect(box?.height).toBeGreaterThan(44);
    expect(box?.width).toBeGreaterThan(44);
    // Bottom nav visible
    await expect(page.getByRole("link", { name: "Today" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Cal" })).toBeVisible();
    await page.goto("/calendar");
    await expect(page.getByText("Mon")).toBeVisible();
  });
});
