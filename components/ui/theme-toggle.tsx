"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ size = "md" }: { size?: "sm" | "md" }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className={size === "sm" ? "h-5 w-9" : "h-7 w-12"} />;

  const isDark = resolvedTheme === "dark";
  const sm = size === "sm";

  return (
    <button
      role="switch"
      aria-checked={isDark}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`relative inline-flex shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        sm ? "h-5 w-9" : "h-7 w-12"
      } ${isDark ? "bg-primary" : "bg-input"}`}
    >
      <span
        className={`pointer-events-none flex items-center justify-center rounded-full bg-background shadow-md ring-0 transition-transform duration-300 ease-in-out ${
          sm ? "h-4 w-4" : "h-5 w-5"
        } ${isDark ? (sm ? "translate-x-4" : "translate-x-5") : "translate-x-0"}`}
      >
        {isDark
          ? <Moon className={sm ? "h-2.5 w-2.5 text-primary" : "h-3 w-3 text-primary"} />
          : <Sun  className={sm ? "h-2.5 w-2.5 text-muted-foreground" : "h-3 w-3 text-muted-foreground"} />
        }
      </span>
    </button>
  );
}
