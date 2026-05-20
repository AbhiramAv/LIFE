"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Heart, Target, Activity, DollarSign,
  Layers, Sparkles, Camera, CalendarDays, Menu, X,
  LogOut, Settings, HelpCircle, User,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { createClient } from "@/lib/supabase/client";
import type { User as SBUser } from "@supabase/supabase-js";

export const NAV_LINKS = [
  { href: "/",         label: "Dashboard", icon: LayoutDashboard, color: "#8b5cf6" },
  { href: "/mood",     label: "Mood",       icon: Heart,           color: "#f43f5e" },
  { href: "/habits",   label: "Habits",     icon: Target,          color: "#8b5cf6" },
  { href: "/fitness",  label: "Fitness",    icon: Activity,        color: "#10b981" },
  { href: "/finance",  label: "Finance",    icon: DollarSign,      color: "#f59e0b" },
  { href: "/goals",    label: "Goals",      icon: Layers,          color: "#0ea5e9" },
  { href: "/calendar", label: "Calendar",   icon: CalendarDays,    color: "#6366f1" },
  { href: "/memories", label: "Memories",   icon: Camera,          color: "#d946ef" },
];

function NavLinks({ pathname, collapsed, onLinkClick }: {
  pathname: string; collapsed: boolean; onLinkClick?: () => void;
}) {
  return (
    <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
      {NAV_LINKS.map(({ href, label, icon: Icon, color }) => {
        const active = pathname === href;
        return (
          <Link key={href} href={href} onClick={onLinkClick}
            title={collapsed ? label : undefined}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
              active ? "text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground"
            } ${collapsed ? "justify-center px-2" : ""}`}
            style={active ? { backgroundColor: `${color}18`, borderLeft: `2px solid ${color}` } : {}}>
            <Icon className="h-4 w-4 shrink-0" style={active ? { color } : {}} />
            {!collapsed && <span>{label}</span>}
            {!collapsed && active && <div className="ml-auto h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />}
          </Link>
        );
      })}
    </nav>
  );
}

function UserSection({ collapsed }: { collapsed: boolean }) {
  const [user, setUser]             = useState<SBUser | null>(null);
  const [name, setName]             = useState<string | null>(null);
  const [settingsOpen, setSettings] = useState(false);
  const router   = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        fetch("/api/user/profile").then(r => r.json()).then(p => setName(p?.name ?? null));
      }
    });
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  if (!user) return null;

  const displayName = name || user.email?.split("@")[0] || "Account";
  const initial     = displayName[0].toUpperCase();

  return (
    <div className="border-t border-border shrink-0">
      {/* Settings panel */}
      {settingsOpen && !collapsed && (
        <div className="px-3 py-3 space-y-0.5 border-b border-border bg-muted/30">
          <Link href="/settings"
            onClick={() => setSettings(false)}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <User className="h-3.5 w-3.5" /> Profile &amp; Account
          </Link>
          <div className="flex items-center justify-between px-2.5 py-2">
            <span className="text-xs font-medium text-muted-foreground">Dark mode</span>
            <ThemeToggle size="sm" />
          </div>
          <Link href="/help"
            onClick={() => setSettings(false)}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <HelpCircle className="h-3.5 w-3.5" /> Help &amp; FAQ
          </Link>
          <div className="my-1 h-px bg-border" />
          <button onClick={signOut}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      )}

      {collapsed ? (
        <div className="flex flex-col items-center gap-2 py-3">
          <button onClick={() => setSettings(o => !o)} title="Settings"
            className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors ${settingsOpen ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}>
            <Settings className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button onClick={() => setSettings(o => !o)}
          className="w-full flex items-center gap-3 px-4 py-4 hover:bg-accent/50 transition-colors group">
          <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-base font-bold text-primary shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-semibold leading-tight truncate">{displayName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
          </div>
          <Settings className={`h-4 w-4 shrink-0 transition-colors ${settingsOpen ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
        </button>
      )}
    </div>
  );
}

export function Nav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("nav-collapsed");
    if (stored === "true") setCollapsed(true);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  if (pathname.startsWith("/auth") || pathname.startsWith("/admin")) return null;

  function toggleCollapse() {
    setCollapsed(c => { localStorage.setItem("nav-collapsed", String(!c)); return !c; });
  }

  return (
    <>
      <aside className={`hidden md:flex flex-col shrink-0 border-r border-border bg-sidebar min-h-screen sticky top-0 transition-all duration-200 ${collapsed ? "w-[56px]" : "w-56"}`}>
        <div className={`flex items-center border-b border-border h-14 ${collapsed ? "flex-col justify-center gap-1 px-2 py-2" : "gap-2 px-3"}`}>
          <button onClick={toggleCollapse}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
            title={collapsed ? "Expand" : "Collapse"}>
            <Menu className="h-4 w-4" />
          </button>
          {!collapsed && (
            <>
              <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold tracking-tight leading-none">LIFE</p>
                <p className="text-[10px] text-muted-foreground leading-none mt-0.5">lifetime dashboard</p>
              </div>
            </>
          )}
        </div>
        <NavLinks pathname={pathname} collapsed={collapsed} />
        <UserSection collapsed={collapsed} />
      </aside>

      <button onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 h-9 w-9 flex items-center justify-center rounded-lg bg-background/80 backdrop-blur-sm border border-border text-foreground shadow-sm"
        aria-label="Open menu">
        <Menu className="h-4 w-4" />
      </button>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
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
              <button onClick={() => setMobileOpen(false)}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <NavLinks pathname={pathname} collapsed={false} onLinkClick={() => setMobileOpen(false)} />
            <UserSection collapsed={false} />
          </aside>
        </div>
      )}
    </>
  );
}
