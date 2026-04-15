import { useState, useEffect } from "react";

export const useTheme = () => {
  const [isDark, setIsDark] = useState(() => {
    // Initialize with system preference or saved theme
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved) {
        return saved === "dark";
      }
      // Check system preference as fallback
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return true;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    // Ensure theme is properly applied on mount
    const saved = localStorage.getItem("theme");
    if (saved) {
      const shouldBeDark = saved === "dark";
      if (shouldBeDark !== isDark) {
        setIsDark(shouldBeDark);
      }
    }
  }, []);

  const toggle = () => setIsDark((prev) => !prev);

  return { isDark, toggle };
};
