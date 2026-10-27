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

// Synchronize status bar and navigation bar to native Android & web metadata
export async function syncSystemBars(isDark: boolean) {
  const themeName = isDark ? "dark" : "light";
  const barColor = isDark ? "#0B1112" : "#F2F6F5";

  // 1. Direct Android JavascriptInterface (0ms synchronous)
  try {
    if (typeof window !== "undefined" && (window as any).AndroidTheme?.setTheme) {
      (window as any).AndroidTheme.setTheme(themeName);
    }
  } catch (e) {}

  // 2. Native Custom Capacitor Plugin (Direct Bridge call)
  try {
    await AppTheme.setTheme({ theme: themeName });
  } catch (e) {}

  // 3. Native Capacitor StatusBar Plugin
  try {
    if (isDark) {
      // Dark mode: white/light icons on dark background (#0B1112)
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: "#0B1112" });
    } else {
      // Light mode: dark icons on white background (#F2F6F5)
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: "#F2F6F5" });
    }
  } catch (e) {
    // Plugin not available in regular web browser
  }

  // 4. Re-assert via Native Bridge so MainActivity.applyTheme has final authority
  try {
    await AppTheme.setTheme({ theme: themeName });
  } catch (e) {}
  try {
    if (typeof window !== "undefined" && (window as any).AndroidTheme?.setTheme) {
      (window as any).AndroidTheme.setTheme(themeName);
    }
  } catch (e) {}

  // 5. Web Meta Theme-Color
  if (typeof document !== "undefined") {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", barColor);
    }
  }
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

    syncSystemBars(isDark);
    const t1 = setTimeout(() => syncSystemBars(isDark), 80);
    const t2 = setTimeout(() => syncSystemBars(isDark), 300);
    const t3 = setTimeout(() => syncSystemBars(isDark), 800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [resolvedTheme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    }
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
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
