import React, { createContext, useContext, useEffect, useState } from "react";
import { registerPlugin } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "dailyos_theme";

const AppTheme = registerPlugin<{
  setTheme: (options: { theme: string }) => Promise<void>;
}>("AppTheme");

// 0ms Real-Time Synchronizer: executes in the exact same tick/frame as UI click
export function fastSyncSystemBars(isDark: boolean) {
  const themeName = isDark ? "dark" : "light";
  const barColor = isDark ? "#0B1112" : "#F2F6F5";

  // 1. Direct synchronous Android JNI call (instant, 0ms)
  try {
    if (typeof window !== "undefined" && (window as any).AndroidTheme?.setTheme) {
      (window as any).AndroidTheme.setTheme(themeName);
    }
  } catch (e) {}

  // 2. Parallel non-blocking Capacitor plugin bridge calls
  try {
    AppTheme.setTheme({ theme: themeName }).catch(() => {});
    StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => {});
    StatusBar.setBackgroundColor({ color: barColor }).catch(() => {});
  } catch (e) {}

  // 3. Web Meta Theme-Color
  if (typeof document !== "undefined") {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", barColor);
    }
  }
}

// Fallback async system bars sync for mounting / life-cycle
export async function syncSystemBars(isDark: boolean) {
  fastSyncSystemBars(isDark);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === "light" || saved === "dark") {
        return saved as Theme;
      }
      localStorage.setItem(THEME_STORAGE_KEY, "light");
      return "light"; // Default to light theme per brand spec
    }
    return "light";
  });

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  const resolvedTheme: ResolvedTheme =
    theme === "system" ? (systemIsDark ? "dark" : "light") : theme;

  useEffect(() => {
    if (typeof document === "undefined") return;
    const isDark = resolvedTheme === "dark";
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      root.classList.remove("light");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
      root.setAttribute("data-theme", "light");
    }

    fastSyncSystemBars(isDark);
    const t1 = setTimeout(() => fastSyncSystemBars(isDark), 40);
    const t2 = setTimeout(() => fastSyncSystemBars(isDark), 150);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [resolvedTheme]);

  const setTheme = (newTheme: Theme) => {
    const nextResolved: ResolvedTheme =
      newTheme === "system" ? (systemIsDark ? "dark" : "light") : newTheme;
    const isDark = nextResolved === "dark";

    // 1. IMMEDIATELY update DOM root classes synchronously on click (0ms)
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      if (isDark) {
        root.classList.add("dark");
        root.classList.remove("light");
        root.setAttribute("data-theme", "dark");
      } else {
        root.classList.remove("dark");
        root.classList.add("light");
        root.setAttribute("data-theme", "light");
      }
    }

    // 2. IMMEDIATELY trigger native status bar & nav bar sync (0ms)
    fastSyncSystemBars(isDark);

    // 3. Update localStorage synchronously
    if (typeof window !== "undefined") {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      localStorage.setItem("theme", newTheme);
    }

    // 4. Update React state
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    const nextTheme: ResolvedTheme = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: "light" as Theme,
      resolvedTheme: "light" as ResolvedTheme,
      toggleTheme: () => {},
      setTheme: () => {},
    };
  }
  return context;
}
