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

function resolveInitialThemeSync(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  try {
    if ((window as any).AndroidTheme && typeof (window as any).AndroidTheme.getTheme === "function") {
      const nativeTheme = (window as any).AndroidTheme.getTheme();
      if (nativeTheme === "dark" || nativeTheme === "light") {
        localStorage.setItem(THEME_STORAGE_KEY, nativeTheme);
        localStorage.setItem("theme", nativeTheme);
        return nativeTheme;
      }
    }
  } catch {}
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) || localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") {
      return saved;
    }
  } catch {}
  try {
    if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      localStorage.setItem(THEME_STORAGE_KEY, "dark");
      localStorage.setItem("theme", "dark");
      return "dark";
    }
  } catch {}
  try {
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    localStorage.setItem("theme", "light");
  } catch {}
  return "light";
}

// 0ms Real-Time Synchronizer: executes in the exact same tick/frame as UI click
export function fastSyncSystemBars(isDark: boolean) {
  const themeName = isDark ? "dark" : "light";
  const barColor = isDark ? "#0B1112" : "#F2F6F5";

  // 1. Direct synchronous Android JNI call (instant, 0ms)
  let handledByNativeBridge = false;
  try {
    if (typeof window !== "undefined" && (window as any).AndroidTheme?.setTheme) {
      (window as any).AndroidTheme.setTheme(themeName);
      handledByNativeBridge = true;
    }
  } catch (e) {}

  // 2. Fallback Capacitor plugin bridge calls only when JNI bridge is unavailable
  if (!handledByNativeBridge) {
    try {
      AppTheme.setTheme({ theme: themeName }).catch(() => {});
      StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light }).catch(() => {});
      StatusBar.setBackgroundColor({ color: barColor }).catch(() => {});
    } catch (e) {}
  }

  // 3. Web Meta Theme-Color
  if (typeof document !== "undefined") {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", barColor);
    }
  }
}

export async function syncSystemBars(isDark: boolean) {
  fastSyncSystemBars(isDark);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => resolveInitialThemeSync());

  const resolvedTheme: ResolvedTheme = theme === "dark" ? "dark" : "light";

  useEffect(() => {
    if (typeof document === "undefined") return;
    const isDark = resolvedTheme === "dark";
    const bg = isDark ? "#0B1112" : "#F2F6F5";
    const text = isDark ? "#EAF4F2" : "#0E1F1E";
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
    root.style.backgroundColor = bg;
    root.style.color = text;

    const s = document.getElementById("splash-critical-css");
    if (s) {
      s.innerHTML = `html, body, #root { width: 100%; min-height: 100%; margin: 0; padding: 0; background-color: ${bg} !important; color: ${text} !important; }`;
    }
  }, [resolvedTheme]);

  const setTheme = (newTheme: Theme) => {
    const nextResolved: ResolvedTheme = newTheme === "dark" ? "dark" : "light";
    const isDark = nextResolved === "dark";
    const bg = isDark ? "#0B1112" : "#F2F6F5";
    const text = isDark ? "#EAF4F2" : "#0E1F1E";

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
      root.style.backgroundColor = bg;
      root.style.color = text;
    }

    // 2. Update localStorage synchronously
    if (typeof window !== "undefined") {
      localStorage.setItem(THEME_STORAGE_KEY, nextResolved);
      localStorage.setItem("theme", nextResolved);
    }

    // 3. IMMEDIATELY trigger native status bar & nav bar sync (0ms)
    fastSyncSystemBars(isDark);

    // 4. Update React state
    setThemeState(nextResolved);
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
