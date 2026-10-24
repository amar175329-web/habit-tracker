import { createClient } from "@libsql/client";
import fs from "fs";
import path from "path";

const client = createClient({ url: process.env.TURSO_URL, authToken: process.env.TURSO_TOKEN });
const migDir = "drizzle/migrations";
const files = ["0000_fair_sentinel.sql", "0001_search_fts.sql"].filter((f) => fs.existsSync(path.join(migDir, f)));

for (const f of files) {
  const raw = fs.readFileSync(path.join(migDir, f), "utf8");
  const stmts = raw.split("--> statement-breakpoint").map((s) => s.trim()).filter((s) => s.length > 0 && !s.startsWith("--"));
  for (const stmt of stmts) {
    try { await client.execute(stmt); }
    catch (e) {
      const msg = String(e.message || e);
      if (msg.includes("already exists")) { console.log(`[skip] ${f}`); continue; }
      console.error(`[FAIL] ${f}:`, msg.slice(0, 200)); process.exitCode = 1;
    }
  }
  console.log(`[ok] applied ${f}`);
}
const existing = await client.execute("SELECT COUNT(*) as c FROM habits");
if (Number(existing.rows[0].c) === 0) {
  const now = new Date().toISOString();
  for (const [id, label, sortOrder] of [["workout","Workout",0],["study","Study",1],["ai","AI",2],["book","Book Listening",3]]) {
    await client.execute({ sql: "INSERT INTO habits (id,label,sort_order,color_full,color_light,is_active,created_at) VALUES (?,?,?,?,?,1,?)", args: [id, label, sortOrder, "#22c55e", "#86efac", now] });
  }
  console.log("[ok] seeded 4 habits");
} else { console.log("[ok] habits already seeded:", Number(existing.rows[0].c)); }
await client.close();
