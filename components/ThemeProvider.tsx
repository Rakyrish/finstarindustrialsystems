"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

/**
 * Read the theme that the inline <head> script already applied to <html>.
 * Falls back to system preference if the class isn't set yet (SSR).
 */
function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  // The inline script already added/removed the .dark class
  if (document.documentElement.classList.contains("dark")) return "dark";
  // Double-check localStorage in case the script was blocked
  const saved = localStorage.getItem("finstar-theme") as Theme | null;
  if (saved === "dark" || saved === "light") return saved;
  // Fall back to system preference
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // ① Initialize from the DOM so React state always matches what the user sees
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  // ② Sync DOM + localStorage whenever theme changes.
  //    useLayoutEffect fires synchronously before paint → no flicker.
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try {
      localStorage.setItem("finstar-theme", theme);
    } catch (_) {
      // localStorage may be blocked (private mode etc.)
    }
  }, [theme]);

  // ③ Listen for system-preference changes so the site adapts automatically
  //    when the user hasn't saved a preference yet.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem("finstar-theme");
      // Only follow the system if the user hasn't manually set a preference
      if (!saved) {
        setTheme(e.matches ? "dark" : "light");
      }
    };
    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  function toggleTheme() {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
