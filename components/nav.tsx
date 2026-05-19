"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Heart, Target, Activity,
  DollarSign, Layers, Moon, Sun, Sparkles, Camera, CalendarDays,
} from "lucide-react";

const links = [
  { href: "/",          label: "Dashboard", icon: LayoutDashboard, color: "text-violet-400" },
  { href: "/mood",      label: "Mood",       icon: Heart,           color: "text-rose-400"   },
  { href: "/habits",    label: "Habits",     icon: Target,          color: "text-violet-400" },
  { href: "/fitness",   label: "Fitness",    icon: Activity,        color: "text-emerald-400"},
  { href: "/finance",   label: "Finance",    icon: DollarSign,      color: "text-amber-400"  },
  { href: "/goals",     label: "Goals",      icon: Layers,          color: "text-sky-400"    },
  { href: "/calendar",  label: "Calendar",   icon: CalendarDays,    color: "text-indigo-400" },
  { href: "/memories",  label: "Memories",   icon: Camera,          color: "text-fuchsia-400"},
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-8 w-8" />;
  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

export function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-border bg-sidebar min-h-screen sticky top-0">
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-border">
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold tracking-tight leading-none">LIFE</p>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">lifetime dashboard</p>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {links.map(({ href, label, icon: Icon, color }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 transition-colors ${active ? "text-primary" : color}`} />
                {label}
                {active && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile bottom bar — show first 6 links */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/90 backdrop-blur-xl">
        <div className="flex items-center justify-around px-1 py-1">
          {links.slice(0, 6).map(({ href, label, icon: Icon, color }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-all ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all ${active ? "bg-primary/15" : ""}`}>
                  <Icon className={`h-4 w-4 transition-colors ${active ? "text-primary" : color}`} />
                </div>
                <span className="text-[9px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
