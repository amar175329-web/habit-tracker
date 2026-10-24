import { useState } from "react";
import { useTheme } from "../lib/theme";
import { Card } from "../components/primitives/Card";
import { Pill } from "../components/primitives/Pill";
import { IconChip } from "../components/primitives/IconChip";
import { BottomNav, type NavTabId } from "../components/primitives/BottomNav";
import { Sheet } from "../components/primitives/Sheet";
import { SectionLabel } from "../components/primitives/SectionLabel";

import { MomentumGauge } from "../components/signature/MomentumGauge";
import { DayRings } from "../components/signature/DayRings";
import { HabitTile, type HabitState } from "../components/signature/HabitTile";
import { MoodOrbs, type MoodScore } from "../components/signature/MoodOrbs";
import { SleepDial } from "../components/signature/SleepDial";
import { TerrainChart } from "../components/signature/TerrainChart";
import { CalendarGrid } from "../components/signature/CalendarGrid";

interface TokenItem {
  name: string;
  variable: string;
  role: string;
  lightHex: string;
  darkHex: string;
}

const CORE_TOKENS: TokenItem[] = [
  { name: "Background", variable: "--bg", role: "Page background", lightHex: "#F2F6F5", darkHex: "#0B1112" },
  { name: "Card", variable: "--card", role: "Surface cards & containers", lightHex: "#FFFFFF", darkHex: "#121B1C" },
  { name: "Text", variable: "--tx", role: "Primary headings & body text", lightHex: "#0E1F1E", darkHex: "#EAF4F2" },
  { name: "Muted", variable: "--mu", role: "Labels, subtitles, inactive tabs", lightHex: "#566C6A", darkHex: "#93ABA8" },
  { name: "Primary", variable: "--pr", role: "Habits brand teal / progress", lightHex: "#0F9D8A", darkHex: "#2DD4BF" },
  { name: "Primary Text", variable: "--prt", role: "Contrast text on light tint", lightHex: "#0B7A6B", darkHex: "#2DD4BF" },
  { name: "Line", variable: "--ln", role: "Card borders & dividers", lightHex: "#E3ECEA", darkHex: "#1F2D2E" },
  { name: "Tint", variable: "--tint", role: "Subtle teal badge & chip fill", lightHex: "#E2F3F0", darkHex: "#133634" },
  { name: "Indigo", variable: "--ind", role: "Sleep charts & sleep dial", lightHex: "#5B5BD6", darkHex: "#9A9AF5" },
  { name: "Track", variable: "--tr", role: "Unlit dots & inactive rings", lightHex: "#CFDDDB", darkHex: "#2B3E3F" },
  { name: "On-Primary", variable: "--on", role: "Text on primary filled buttons", lightHex: "#FFFFFF", darkHex: "#062B27" },
  { name: "Coral", variable: "--co", role: "Mood orbs & emotional wellness", lightHex: "#E8624A", darkHex: "#FF8A70" },
  { name: "Flame", variable: "--fl", role: "Streak counter & missed sand tint", lightHex: "#D97706", darkHex: "#FBBF24" },
];

export default function DesignCheck() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  // Interactive component states
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [navTab, setNavTab] = useState<NavTabId>("today");

  // Interactive Habit Tile States
  const [habit1State, setHabit1State] = useState<HabitState>(0); // AI (Pending)
  const [habit2State, setHabit2State] = useState<HabitState>(1); // Study (Half)
  const [habit3State, setHabit3State] = useState<HabitState>(2); // Book (Done)
  const [habit4WeekDone, setHabit4WeekDone] = useState(true);   // Workout (Week Done)
  const [habit5State, setHabit5State] = useState<HabitState>(0); // Video

  // Interactive Mood Orb
  const [moodScore, setMoodScore] = useState<MoodScore>(4);

  // Interactive Sleep Dial
  const [bedtime, setBedtime] = useState("23:00");
  const [wakeTime, setWakeTime] = useState("06:30");

  // Interactive Terrain Chart Range
  const [chartRange, setChartRange] = useState<"7D" | "14D" | "30D" | "ALL">("7D");

  // Interactive Calendar Selection
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>("2026-10-23");

  const cycleState = (s: HabitState): HabitState => {
    if (s === 0) return 2;
    if (s === 2) return 1;
    return 0;
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--tx)",
        fontFamily: "var(--font)",
        paddingBottom: "80px",
      }}
    >
      {/* -------------------------------------------------------------------
          TOP STICKY CONTROLLER: Theme Switcher & System Status
          ------------------------------------------------------------------- */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "var(--card)",
          borderBottom: "1px solid var(--ln)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
          padding: "16px 20px",
        }}
      >
        <div
          style={{
            maxWidth: "960px",
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "12px",
                  background: "var(--pr)",
                  color: "var(--on)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "Space Grotesk, sans-serif",
                  fontWeight: 700,
                  fontSize: "18px",
                }}
              >
                D
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>
                  DailyOS Design System Harness
                </h1>
                <div style={{ fontSize: "12px", color: "var(--mu)", fontWeight: 600 }}>
                  Route: <code>/design-check</code> · Milestone 1 Verification
                </div>
              </div>
            </div>
          </div>

          {/* Theme Toggle Controller */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "var(--bg)",
              border: "1px solid var(--ln)",
              borderRadius: "99px",
              padding: "3px",
              gap: "2px",
            }}
            role="group"
            aria-label="Theme Switcher"
          >
            {(["light", "dark", "system"] as const).map((t) => {
              const isSelected = theme === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  style={{
                    border: "none",
                    borderRadius: "99px",
                    padding: "6px 14px",
                    fontSize: "12.5px",
                    fontWeight: isSelected ? 800 : 600,
                    background: isSelected ? "var(--pr)" : "transparent",
                    color: isSelected ? "var(--on)" : "var(--mu)",
                    cursor: "pointer",
                    textTransform: "capitalize",
                    transition: "all 0.15s ease",
                    fontFamily: "inherit",
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status Readout Banner */}
        <div
          style={{
            maxWidth: "960px",
            margin: "10px auto 0",
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            fontSize: "11.5px",
            color: "var(--mu)",
            fontWeight: 600,
          }}
        >
          <span>
            Resolved Theme: <b style={{ color: "var(--tx)" }}>{resolvedTheme.toUpperCase()}</b>
          </span>
          <span>·</span>
          <span>
            Mode Setting: <b style={{ color: "var(--tx)" }}>{theme.toUpperCase()}</b>
          </span>
          <span>·</span>
          <span>
            Background: <code style={{ color: "var(--prt)" }}>var(--bg)</code>
          </span>
          <span>·</span>
          <span>
            Card Surface: <code style={{ color: "var(--prt)" }}>var(--card)</code>
          </span>
          <span>·</span>
          <span>
            Primary Accent: <code style={{ color: "var(--pr)" }}>var(--pr)</code>
          </span>
        </div>
      </header>

      {/* Main Content Showcase */}
      <main style={{ maxWidth: "960px", margin: "24px auto", padding: "0 20px" }}>
        {/* -------------------------------------------------------------------
            SECTION 1: COLOR TOKEN PALETTE GRID
            ------------------------------------------------------------------- */}
        <section style={{ marginBottom: "40px" }}>
          <SectionLabel style={{ marginBottom: "12px" }}>1. COLOR TOKEN PALETTE (13 TOKENS + MISSED SAND MIX)</SectionLabel>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "12px",
            }}
          >
            {CORE_TOKENS.map((token) => (
              <div
                key={token.variable}
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--ln)",
                  borderRadius: "18px",
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                }}
              >
                <div
                  style={{
                    height: "44px",
                    borderRadius: "12px",
                    background: `var(${token.variable})`,
                    border: "1px solid var(--ln)",
                    boxSizing: "border-box",
                  }}
                />
                <div>
                  <div style={{ fontWeight: 800, fontSize: "13px" }}>{token.name}</div>
                  <div
                    style={{
                      fontFamily: "ui-monospace, monospace",
                      fontSize: "11.5px",
                      color: "var(--prt)",
                      fontWeight: 700,
                    }}
                  >
                    {token.variable}
                  </div>
                  <div style={{ fontSize: "10.5px", color: "var(--mu)", marginTop: "2px" }}>
                    {token.role}
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "var(--mu)",
                      fontFamily: "Space Grotesk, sans-serif",
                      fontWeight: 600,
                      marginTop: "4px",
                    }}
                  >
                    Light: {token.lightHex} · Dark: {token.darkHex}
                  </div>
                </div>
              </div>
            ))}

            {/* Special Formula: Missed Sand Tint */}
            <div
              style={{
                background: "var(--card)",
                border: "1px solid var(--ln)",
                borderRadius: "18px",
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
              }}
            >
              <div
                style={{
                  height: "44px",
                  borderRadius: "12px",
                  background: "color-mix(in srgb, var(--fl) 32%, var(--card))",
                  border: "1px solid var(--ln)",
                  boxSizing: "border-box",
                }}
              />
              <div>
                <div style={{ fontWeight: 800, fontSize: "13px" }}>Missed Sand Tint</div>
                <div
                  style={{
                    fontFamily: "ui-monospace, monospace",
                    fontSize: "10px",
                    color: "var(--prt)",
                    fontWeight: 700,
                    wordBreak: "break-all",
                  }}
                >
                  color-mix(in srgb, var(--fl) 32%, var(--card))
                </div>
                <div style={{ fontSize: "10.5px", color: "var(--mu)", marginTop: "2px" }}>
                  Gentle non-punitive sand hue
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------------
            SECTION 2: TYPOGRAPHY TEST SUITE
            ------------------------------------------------------------------- */}
        <section style={{ marginBottom: "40px" }}>
          <SectionLabel style={{ marginBottom: "12px" }}>2. TYPOGRAPHY (PLUS JAKARTA SANS & SPACE GROTESK)</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {/* Plus Jakarta Sans */}
            <Card padding="md" radius="default">
              <div
                style={{
                  fontSize: "11px",
                  letterSpacing: "0.14em",
                  fontWeight: 700,
                  color: "var(--mu)",
                  marginBottom: "12px",
                }}
              >
                PLUS JAKARTA SANS (PRIMARY UI)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--mu)", fontWeight: 700 }}>500 Medium (14px)</div>
                  <div style={{ fontSize: "14px", fontWeight: 500 }}>
                    The quick brown fox jumps over the lazy dog.
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--mu)", fontWeight: 700 }}>600 SemiBold (16px)</div>
                  <div style={{ fontSize: "16px", fontWeight: 600 }}>
                    Consistent Pace · 17 of 35 points completed
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--mu)", fontWeight: 700 }}>700 Bold (19px)</div>
                  <div style={{ fontSize: "19px", fontWeight: 700 }}>
                    DailyOS — Own Your Every Day
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--mu)", fontWeight: 700 }}>800 ExtraBold (24px)</div>
                  <div style={{ fontSize: "24px", fontWeight: 800 }}>
                    Weekly Momentum & Clarity
                  </div>
                </div>
              </div>
            </Card>

            {/* Space Grotesk */}
            <Card padding="md" radius="default">
              <div
                style={{
                  fontSize: "11px",
                  letterSpacing: "0.14em",
                  fontWeight: 700,
                  color: "var(--mu)",
                  marginBottom: "12px",
                }}
              >
                SPACE GROTESK (TABULAR NUMERICS)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--mu)", fontWeight: 700 }}>600 SemiBold (18px)</div>
                  <div className="font-num" style={{ fontSize: "18px", fontWeight: 600 }}>
                    11:00 PM to 6:30 AM · 2,140 words
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--mu)", fontWeight: 700 }}>700 Bold (24px / 34px)</div>
                  <div className="font-num" style={{ fontSize: "24px", fontWeight: 700 }}>
                    +17 pts · 4.0 Best Day
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--mu)", fontWeight: 700 }}>700 Bold (40px Gauge & Readout)</div>
                  <div className="font-num" style={{ fontSize: "40px", fontWeight: 700, lineHeight: 1.1 }}>
                    49% · 7h 30m
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* -------------------------------------------------------------------
            SECTION 3: SHARED UI PRIMITIVES GALLERY (6 PRIMITIVES)
            ------------------------------------------------------------------- */}
        <section style={{ marginBottom: "40px" }}>
          <SectionLabel style={{ marginBottom: "12px" }}>3. SHARED UI PRIMITIVES GALLERY</SectionLabel>

          {/* Cards Showcase */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>Primitive: Card</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
              <Card padding="md" radius="default">
                <div style={{ fontWeight: 800 }}>Standard Card (24px)</div>
                <div style={{ fontSize: "12.5px", color: "var(--mu)", marginTop: "4px" }}>
                  Used for secondary tiles, settings items and stats.
                </div>
              </Card>

              <Card padding="lg" radius="lg">
                <div style={{ fontWeight: 800 }}>Large Card (26px)</div>
                <div style={{ fontSize: "12.5px", color: "var(--mu)", marginTop: "4px" }}>
                  Used for main gauge containers and screen sections.
                </div>
              </Card>

              <Card padding="md" radius="default" onClick={() => alert("Card clicked!")}>
                <div style={{ fontWeight: 800 }}>Clickable Card</div>
                <div style={{ fontSize: "12.5px", color: "var(--prt)", marginTop: "4px" }}>
                  Tap me to verify active state feedback ›
                </div>
              </Card>
            </div>
          </div>

          {/* Pills Showcase (6 Variants) */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>Primitive: Pill (6 Variants)</div>
            <Card padding="md" radius="default">
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px" }}>
                <div>
                  <div style={{ fontSize: "10.5px", color: "var(--mu)", fontWeight: 700, marginBottom: "4px" }}>Active</div>
                  <Pill variant="active">Active (7D)</Pill>
                </div>
                <div>
                  <div style={{ fontSize: "10.5px", color: "var(--mu)", fontWeight: 700, marginBottom: "4px" }}>Tint</div>
                  <Pill variant="tint">Consistent Pace</Pill>
                </div>
                <div>
                  <div style={{ fontSize: "10.5px", color: "var(--mu)", fontWeight: 700, marginBottom: "4px" }}>Default</div>
                  <Pill variant="default">19 – 25 Oct</Pill>
                </div>
                <div>
                  <div style={{ fontSize: "10.5px", color: "var(--mu)", fontWeight: 700, marginBottom: "4px" }}>Subdued</div>
                  <Pill variant="subdued">Subdued Tag</Pill>
                </div>
                <div>
                  <div style={{ fontSize: "10.5px", color: "var(--mu)", fontWeight: 700, marginBottom: "4px" }}>Missed</div>
                  <Pill variant="missed">Missed (Sand)</Pill>
                </div>
                <div>
                  <div style={{ fontSize: "10.5px", color: "var(--mu)", fontWeight: 700, marginBottom: "4px" }}>Streak</div>
                  <Pill variant="streak" streakCount={12} />
                </div>
              </div>
            </Card>
          </div>

          {/* IconChips Showcase (5 States, 3 Sizes) */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>Primitive: IconChip (5 States & 3 Sizes)</div>
            <Card padding="md" radius="default">
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px" }}>
                <div style={{ textAlign: "center" }}>
                  <IconChip state="pending" size={32}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /></svg>
                  </IconChip>
                  <div style={{ fontSize: "10.5px", color: "var(--mu)", marginTop: "4px" }}>Pending (32)</div>
                </div>

                <div style={{ textAlign: "center" }}>
                  <IconChip state="half" size={32}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 0 0 0 20z" /></svg>
                  </IconChip>
                  <div style={{ fontSize: "10.5px", color: "var(--mu)", marginTop: "4px" }}>Half (32)</div>
                </div>

                <div style={{ textAlign: "center" }}>
                  <div style={{ background: "var(--pr)", padding: "4px", borderRadius: "14px" }}>
                    <IconChip state="done" size={32}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>
                    </IconChip>
                  </div>
                  <div style={{ fontSize: "10.5px", color: "var(--mu)", marginTop: "4px" }}>Done (32)</div>
                </div>

                <div style={{ textAlign: "center" }}>
                  <IconChip state="rest" size={32}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="4" /></svg>
                  </IconChip>
                  <div style={{ fontSize: "10.5px", color: "var(--mu)", marginTop: "4px" }}>Rest (32)</div>
                </div>

                <div style={{ textAlign: "center" }}>
                  <IconChip state="menu" size={38}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" /></svg>
                  </IconChip>
                  <div style={{ fontSize: "10.5px", color: "var(--mu)", marginTop: "4px" }}>Menu (38)</div>
                </div>

                <div style={{ textAlign: "center" }}>
                  <IconChip state="half" size={54}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                  </IconChip>
                  <div style={{ fontSize: "10.5px", color: "var(--mu)", marginTop: "4px" }}>Creator (54)</div>
                </div>
              </div>
            </Card>
          </div>

          {/* SectionLabel, Sheet Trigger, and BottomNav Showcase */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <Card padding="md" radius="default">
              <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>Primitive: SectionLabel & Sheet</div>
              <SectionLabel>WEEKLY MOMENTUM</SectionLabel>
              <SectionLabel style={{ marginTop: "6px" }}>THIS WEEK · TARGET 7 TO 9 H</SectionLabel>
              <div style={{ marginTop: "16px" }}>
                <button
                  type="button"
                  onClick={() => setIsSheetOpen(true)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: "99px",
                    background: "var(--pr)",
                    color: "var(--on)",
                    border: "none",
                    fontWeight: 800,
                    fontSize: "13px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Test Open Bottom Sheet
                </button>
              </div>
            </Card>

            <Card padding="md" radius="default">
              <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>Primitive: BottomNav</div>
              <div style={{ fontSize: "12px", color: "var(--mu)", marginBottom: "12px" }}>
                Interactive 64px floating pill bar with 4 tabs:
              </div>
              <BottomNav activeTab={navTab} onChangeTab={(t) => setNavTab(t)} />
            </Card>
          </div>
        </section>

        {/* -------------------------------------------------------------------
            SECTION 4: SIGNATURE COMPONENTS SHOWCASE (7 SIGNATURE COMPONENTS)
            ------------------------------------------------------------------- */}
        <section style={{ marginBottom: "40px" }}>
          <SectionLabel style={{ marginBottom: "12px" }}>4. SIGNATURE COMPONENTS TEST SUITE</SectionLabel>

          {/* 1. MomentumGauge & 2. DayRings Combined Showcase */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>
              Signature 1 & 2: MomentumGauge (70/57/44 dots) + DayRings
            </div>
            <Card padding="lg" radius="lg">
              <MomentumGauge
                habitScore={17}
                weeklyMax={35}
                sleepFraction={0.57}
                mindFraction={0.57}
                statusLabel="Consistent Pace"
                subtitle="17 of 35 pts"
              />
              <div style={{ borderTop: "1px solid var(--ln)", marginTop: "14px", paddingTop: "10px" }}>
                <DayRings
                  onSelectDay={(day, idx) => alert(`Day clicked: ${day.dayLabel} (index ${idx})`)}
                />
              </div>
            </Card>
          </div>

          {/* 3. HabitTile (4 States) */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>
              Signature 3: HabitTile (4 Interactive States: Pending, Half, Done, Week Done)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {/* Tile 1: AI (Cycles Pending -> Done -> Half -> Pending) */}
              <HabitTile
                name="AI"
                state={habit1State}
                onToggle={() => setHabit1State(cycleState(habit1State))}
              />

              {/* Tile 2: Study (Half) */}
              <HabitTile
                name="Study"
                state={habit2State}
                streak={2}
                onToggle={() => setHabit2State(cycleState(habit2State))}
              />

              {/* Tile 3: Book Listening (Done) */}
              <HabitTile
                name="Book Listening"
                state={habit3State}
                streak={6}
                onToggle={() => setHabit3State(cycleState(habit3State))}
              />

              {/* Tile 4: Workout (Week Done - 5 of 5) */}
              <HabitTile
                name="Workout"
                isWeekDone={habit4WeekDone}
                streak={8}
                goalDays={5}
                completedThisWeek={5}
                onToggle={() => setHabit4WeekDone(!habit4WeekDone)}
              />

              {/* Tile 5: Video (Spans 2 columns, weekly goal 3 days) */}
              <HabitTile
                name="Video"
                state={habit5State}
                streak={3}
                goalDays={3}
                completedThisWeek={1}
                spanTwo
                subtitle="1 of 3 this week"
                onToggle={() => setHabit5State(cycleState(habit5State))}
              />
            </div>
          </div>

          {/* 4. MoodOrbs */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>
              Signature 4: MoodOrbs (5 Graduated Orbs with Coral Color-Mix & Selection Halo)
            </div>
            <MoodOrbs
              value={moodScore}
              onChange={(s) => setMoodScore(s)}
              onAddFeelings={() => setIsSheetOpen(true)}
            />
          </div>

          {/* 5. SleepDial */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>
              Signature 5: SleepDial (24h Circular Dial with Bedtime Moon, Wake Sun & Steppers)
            </div>
            <SleepDial
              bedtime={bedtime}
              wakeTime={wakeTime}
              onChange={(b, w) => {
                setBedtime(b);
                setWakeTime(w);
              }}
              onSave={() => alert(`Saved sleep: ${bedtime} to ${wakeTime}`)}
            />
          </div>

          {/* 6. TerrainChart */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>
              Signature 6: TerrainChart (Cumulative Curve with 10 pts Milestone & Gradient Area)
            </div>
            <TerrainChart
              currentScore={17}
              currentLabel="Fri 23 · 17 pts"
              milestone={10}
              range={chartRange}
              onRangeChange={(r) => setChartRange(r)}
            />
          </div>

          {/* 7. CalendarGrid */}
          <div style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>
              Signature 7: CalendarGrid (7-Col Month View with Intensity-Filled Circles & Today Ring)
            </div>
            <CalendarGrid
              year={2026}
              month={10}
              todayKey="2026-10-23"
              selectedDate={selectedCalendarDate}
              onSelectDate={(d) => setSelectedCalendarDate(d)}
            />
          </div>
        </section>

        {/* -------------------------------------------------------------------
            SECTION 5: INTEGRITY & AUDIT VERIFICATION PANEL
            ------------------------------------------------------------------- */}
        <section style={{ marginBottom: "40px" }}>
          <SectionLabel style={{ marginBottom: "12px" }}>5. AUDIT & VERIFICATION ATTESTATION</SectionLabel>
          <Card padding="md" radius="default">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: "14px", color: "var(--prt)" }}>
                  ✓ Design System & Tokens
                </div>
                <div style={{ fontSize: "12.5px", color: "var(--mu)", marginTop: "4px" }}>
                  13 core tokens defined in <code>tokens.css</code> and <code>src/index.css</code>. Zero hardcoded hex colors in touched components.
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 800, fontSize: "14px", color: "var(--prt)" }}>
                  ✓ Local Font Bundling
                </div>
                <div style={{ fontSize: "12.5px", color: "var(--mu)", marginTop: "4px" }}>
                  Plus Jakarta Sans & Space Grotesk bundled via npm <code>@fontsource</code>. Zero external Google Fonts CDN links.
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 800, fontSize: "14px", color: "var(--prt)" }}>
                  ✓ Git & Secrets Safety
                </div>
                <div style={{ fontSize: "12.5px", color: "var(--mu)", marginTop: "4px" }}>
                  <code>.env.local</code> untracked from git index and ignored. Fallback JWT secret in <code>worker/index.ts</code> replaced with explicit error.
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 800, fontSize: "14px", color: "var(--prt)" }}>
                  ✓ Clean Storage Slate
                </div>
                <div style={{ fontSize: "12.5px", color: "var(--mu)", marginTop: "4px" }}>
                  Legacy <code>dailyos:*</code> and <code>dailyos_*</code> localStorage keys purged on initialization via <code>src/lib/storage.ts</code>.
                </div>
              </div>
            </div>
          </Card>
        </section>
      </main>

      {/* Interactive Sheet Preview */}
      <Sheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title="What are you feeling?"
        actionLabel="Done"
        onAction={() => setIsSheetOpen(false)}
      >
        <div style={{ padding: "8px 0" }}>
          <div style={{ fontSize: "11px", letterSpacing: "0.14em", fontWeight: 700, color: "var(--mu)" }}>
            POSITIVE FEELINGS
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
            <Pill variant="default">Happy</Pill>
            <Pill variant="tint">Grateful</Pill>
            <Pill variant="default">Proud</Pill>
            <Pill variant="default">Excited</Pill>
          </div>

          <div style={{ fontSize: "11px", letterSpacing: "0.14em", fontWeight: 700, color: "var(--mu)", marginTop: "16px" }}>
            CALM FEELINGS
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
            <Pill variant="default">Relaxed</Pill>
            <Pill variant="default">Content</Pill>
            <Pill variant="tint">Focused</Pill>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
