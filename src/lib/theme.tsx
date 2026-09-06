import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";

/**
 * Dual theme, light-first (DESIGN-SYSTEM v2 / AM-1 + AM-5).
 * - default: light (vanilla bakery)
 * - persisted in localStorage ("cookiepilot-theme")
 * - toggle button carries aria-pressed (pressed = dark active)
 * - <html data-theme> drives the token sheet in styles.css
 */
export type Theme = "light" | "dark";

const KEY = "cookiepilot-theme";

export function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* storage unavailable */
  }
  return "light";
}

function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
}

const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({ theme: "light", toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* storage unavailable */
    }
  }, [theme]);

  const toggle = useCallback(() => setTheme((t) => (t === "light" ? "dark" : "light")), []);

  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
