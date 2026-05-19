"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Heart, Target, Activity, DollarSign,
  Layers, Moon, Sun, Sparkles, Camera, CalendarDays,
  PanelLeftClose, PanelLeftOpen, Menu, X,
} from "lucide-react";

export const NAV_LINKS = [
  { href: "/",         label: "Dashboard", icon: LayoutDashboard, color: "#8b5cf6", tw: "text-violet-400"  },
  { href: "/mood",     label: "Mood",       icon: Heart,           color: "#f43f5e", tw: "text-rose-400"    },
  { href: "/habits",   label: "Habits",     icon: Target,          color: "#8b5cf6", tw: "text-violet-400"  },
  { href: "/fitness",  label: "Fitness",    icon: Activity,        color: "#10b981", tw: "text-emerald-400" },
  { href: "/finance",  label: "Finance",    icon: DollarSign,      color: "#f59e0b", tw: "text-amber-400"   },
  { href: "/goals",    label: "Goals",      icon: Layers,          color: "#0ea5e9", tw: "text-sky-400"     },
  { href: "/calendar", label: "Calendar",   icon: CalendarDays,    color: "#6366f1", tw: "text-indigo-400"  },
  { href: "/memories", label: "Memories",   icon: Camera,          color: "#d946ef", tw: "text-fuchsia-400" },
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

function NavLinks({ pathname, collapsed, onLinkClick }: {
  pathname: string;
  collapsed: boolean;
  onLinkClick?: () => void;
}) {
  return (
    <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
      {NAV_LINKS.map(({ href, label, icon: Icon, color, tw }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            onClick={onLinkClick}
            title={collapsed ? label : undefined}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              active ? "text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
            } ${collapsed ? "justify-center px-2" : ""}`}
            style={active ? { backgroundColor: `${color}18`, borderLeft: `2px solid ${color}` } : {}}
          >
            <Icon
              className={`h-4 w-4 shrink-0 transition-colors ${active ? "" : tw}`}
              style={active ? { color } : {}}
            />
            {!collapsed && <span>{label}</span>}
            {!collapsed && active && (
              <div className="ml-auto h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function Nav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Restore collapse state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("nav-collapsed");
    if (stored === "true") setCollapsed(true);
  }, []);

  function toggleCollapse() {
    setCollapsed((c) => {
      localStorage.setItem("nav-collapsed", String(!c));
      return !c;
    });
  }

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex flex-col shrink-0 border-r border-border bg-sidebar min-h-screen sticky top-0 transition-all duration-200 ${
          collapsed ? "w-[56px]" : "w-56"
        }`}
      >
        {/* Logo */}
        <div className={`flex items-center gap-2.5 px-3 py-5 border-b border-border ${collapsed ? "justify-center" : "px-4"}`}>
          <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-sm font-bold tracking-tight leading-none">LIFE</p>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">lifetime dashboard</p>
            </div>
          )}
        </div>

        <NavLinks pathname={pathname} collapsed={collapsed} />

        {/* Bottom bar */}
        <div className={`px-2 py-3 border-t border-border flex items-center ${collapsed ? "justify-center" : "justify-between px-3"}`}>
          {!collapsed && <ThemeToggle />}
          <button
            onClick={toggleCollapse}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
          {collapsed && <div className="mt-2"><ThemeToggle /></div>}
        </div>
      </aside>

      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 h-9 w-9 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm border border-border text-foreground shadow-sm"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* Mobile overlay drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside className="relative w-64 bg-sidebar border-r border-border flex flex-col min-h-full shadow-2xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
                  <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-sm font-bold tracking-tight leading-none">LIFE</p>
                  <p className="text-[10px] text-muted-foreground leading-none mt-0.5">lifetime dashboard</p>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <NavLinks pathname={pathname} collapsed={false} onLinkClick={() => setMobileOpen(false)} />

            <div className="px-3 py-3 border-t border-border">
              <ThemeToggle />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
