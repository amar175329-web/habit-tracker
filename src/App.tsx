import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { App as CapApp } from "@capacitor/app";
import { ThemeProvider } from "./lib/theme";
import { queryClient as qc } from "./lib/queryClient";
import { initDatabase, purgeLegacyStorage, clearAllData, db, type MoodLog } from "./lib/db";
import { BottomNav as BottomNavPrimitive } from "./components/primitives/BottomNav";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Pages
import Today from "./pages/Today";
import Calendar from "./pages/Calendar";
import DayDetail from "./pages/DayDetail";
import Insights from "./pages/Insights";
import Timeline from "./pages/Timeline";
import Mind from "./pages/Mind";
import ReflectionsListPage from "./pages/ReflectionsList";
import ReflectionReader from "./pages/ReflectionReader";
import WriteToday from "./pages/WriteToday";
import SleepPage from "./pages/SleepPage";
import Settings from "./pages/Settings";
import NewHabit from "./pages/NewHabit";
import IconPicker from "./pages/IconPicker";
import DataBackup from "./pages/DataBackup";
import ExportPage from "./pages/Export";

function AppNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  // Hidden on subpages like write-today, sleep, settings, design-check, etc.
  const hiddenPaths = [
    "/write-today",
    "/sleep",
    "/settings",
    "/new-habit",
    "/icon-picker",
    "/data-backup",
    "/export",
  ];

  const shouldHide = hiddenPaths.some((p) => location.pathname.startsWith(p)) || location.pathname.startsWith("/reflection/");

  if (shouldHide) return null;

  // Active tab derivation
  let currentTab = "today";
  if (location.pathname === "/calendar") currentTab = "cal";
  else if (location.pathname === "/insights") currentTab = "insights";
  else if (location.pathname === "/mind" || location.pathname === "/reflections") currentTab = "mind";
  else if (location.pathname === "/" || location.pathname.startsWith("/day/")) currentTab = "today";

  const handleTabChange = (tabId: string) => {
    if (tabId === "today") navigate("/");
    else if (tabId === "cal") navigate("/calendar");
    else if (tabId === "insights") navigate("/insights");
    else if (tabId === "mind") navigate("/mind");
  };

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        pointerEvents: "none",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: "430px", padding: "0 18px calc(18px + env(safe-area-inset-bottom, 0px))", pointerEvents: "auto", boxSizing: "border-box" }}>
        <BottomNavPrimitive activeTab={currentTab} onChangeTab={handleTabChange} fixed={false} />
      </div>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    // Fresh client purge: wipe ALL data across all Dexie tables completely for 100% clean slate
    const PURGE_KEY = "habittracker_fresh_clean_v8";
    if (typeof window !== "undefined" && window.localStorage && !window.localStorage.getItem(PURGE_KEY)) {
      clearAllData().then(() => {
        window.localStorage.setItem(PURGE_KEY, "true");
      });
    }

    // Purge stale local storage and initialize Dexie store on startup
    purgeLegacyStorage();
    // Clean up any legacy unconfirmed auto-seeded default mood logs
    db.mood_logs.filter((m: MoodLog) => !m.changeCount || m.changeCount === 0).delete().catch(() => {});
    initDatabase().catch(() => {});

    // Hardware back-button listener for Android
    try {
      const handler = CapApp.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          CapApp.exitApp();
        }
      });
      return () => {
        handler.then((h) => h.remove());
      };
    } catch {
      // Ignored if not on native device
    }
  }, []);

  return (
    <QueryClientProvider client={qc}>
      <ThemeProvider>
        <BrowserRouter>
          <ErrorBoundary fallbackTitle="Application Error">
            <AppNavigation />
            <Routes>
              {/* Core bottom-tab screens */}
              <Route path="/" element={<Today />} />
              <Route path="/day/:date" element={<Today />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/day-detail/:date" element={<DayDetail />} />
              <Route path="/insights" element={<Insights />} />
              <Route path="/mind" element={<Mind />} />

              {/* Subpages & Flow screens */}
              <Route path="/timeline" element={<Timeline />} />
              <Route path="/reflections" element={<ReflectionsListPage />} />
              <Route path="/reflection/:date" element={<ReflectionReader />} />
              <Route path="/write-today" element={<WriteToday />} />
              <Route path="/sleep" element={<SleepPage />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/new-habit" element={<NewHabit />} />
              <Route path="/icon-picker" element={<IconPicker />} />
              <Route path="/data-backup" element={<DataBackup />} />
              <Route path="/export" element={<ExportPage />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
