import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "medsetu-theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(theme: Theme): "light" | "dark" {
  return theme === "system" ? getSystemTheme() : theme;
}

export function ThemeProvider({ children, defaultTheme = "system" }: { children: ReactNode; defaultTheme?: Theme }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    return (localStorage.getItem(STORAGE_KEY) as Theme) || defaultTheme;
  });
  const [resolved, setResolved] = useState<"light" | "dark">(() => resolveTheme(theme));

  const apply = useCallback((next: Theme) => {
    const resolved = resolveTheme(next);
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
    setResolved(resolved);
  }, []);

  useEffect(() => {
    apply(theme);
  }, [apply, theme]);

  useEffect(() => {
    const listener = (e: MediaQueryListEvent) => {
      if (theme === "system") {
        apply("system");
      }
    };
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, [apply, theme]);

  const setTheme = useCallback((next: Theme) => {
    localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
    apply(next);
  }, [apply]);

  const toggle = useCallback(() => {
    const next = resolved === "dark" ? "light" : "dark";
    setTheme(next);
  }, [resolved, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
