import { chromium } from "@playwright/test";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

async function main() {
  const outDir = "/home/ubuntu/habit-tracker/store-assets";
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log("Starting preview server...");
  const server = spawn("npx", ["vite", "preview", "--port", "4173"], {
    cwd: "/home/ubuntu/habit-tracker",
    stdio: "pipe",
  });

  await new Promise((resolve) => setTimeout(resolve, 2500));

  console.log("Launching Chromium...");
  const browser = await chromium.launch({ headless: true });
  
  // High-res modern Android phone device specs (e.g. Pixel 8 / Galaxy S24)
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2.621359, // Exactly 1080 x 2400 pixels!
    isMobile: true,
    hasTouch: true,
  });

  const page = await context.newPage();

  // Populate some sample habit entries if needed
  await page.goto("http://localhost:4173/");
  await page.waitForTimeout(1000);

  // Screen 1: Today
  console.log("Capturing Screen 1: Today...");
  await page.goto("http://localhost:4173/");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, "phone-screenshot-01-today.png") });

  // Screen 2: Sleep Dial
  console.log("Capturing Screen 2: Sleep Dial...");
  await page.goto("http://localhost:4173/sleep");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, "phone-screenshot-02-sleep.png") });

  // Screen 3: Calendar
  console.log("Capturing Screen 3: Calendar...");
  await page.goto("http://localhost:4173/calendar");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, "phone-screenshot-03-calendar.png") });

  // Screen 4: Mind & Reflection
  console.log("Capturing Screen 4: Mind...");
  await page.goto("http://localhost:4173/mind");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, "phone-screenshot-04-mind.png") });

  await browser.close();
  server.kill();
  console.log("All screenshots captured successfully!");
}

main().catch((err) => {
  console.error("Error capturing screenshots:", err);
  process.exit(1);
});
