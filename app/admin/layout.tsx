"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Target, Heart, Activity, Layers, MessageCircle,
  LogOut, Settings, HelpCircle, Menu, Users, Zap, Megaphone,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/admin",         label: "Overview", icon: LayoutDashboard, color: "#8b5cf6" },
  { href: "/admin/users",   label: "Users",    icon: Users,           color: "#f59e0b" },
  { href: "/admin/habits",  label: "Habits",   icon: Target,          color: "#10b981" },
  { href: "/admin/mood",    label: "Mood",      icon: Heart,           color: "#f43f5e" },
  { href: "/admin/fitness", label: "Fitness",  icon: Activity,        color: "#0ea5e9" },
  { href: "/admin/goals",   label: "Goals",    icon: Layers,          color: "#6366f1" },
  { href: "/admin/activity",      label: "Activity",      icon: Zap,           color: "#06b6d4" },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone,     color: "#f97316" },
  { href: "/admin/help",          label: "Support",       icon: MessageCircle, color: "#d946ef" },
];

function AdminUserSection({ collapsed }: { collapsed: boolean }) {
  const [email, setEmail]           = useState<string | null>(null);
  const [settingsOpen, setSettings] = useState(false);
  const router   = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  const initial = (email ?? "A")[0].toUpperCase();

  return (
    <div className="border-t border-border shrink-0">
      {settingsOpen && !collapsed && (
        <div className="px-3 py-3 space-y-0.5 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between px-2.5 py-2">
            <span className="text-xs font-medium text-muted-foreground">Dark mode</span>
            <ThemeToggle size="sm" />
          </div>
          <Link href="/admin/help"
            onClick={() => setSettings(false)}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <HelpCircle className="h-3.5 w-3.5" /> Support inbox
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
            <p className="text-sm font-semibold leading-tight">Admin</p>
            <p className="text-[11px] text-muted-foreground truncate">{email}</p>
          </div>
          <Settings className={`h-4 w-4 shrink-0 transition-colors ${settingsOpen ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`} />
        </button>
      )}
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("admin-nav-collapsed");
    if (stored === "true") setCollapsed(true);
  }, []);

  function toggleCollapse() {
    setCollapsed(c => { localStorage.setItem("admin-nav-collapsed", String(!c)); return !c; });
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside className={`hidden md:flex flex-col shrink-0 border-r border-border bg-sidebar min-h-screen sticky top-0 transition-all duration-200 ${collapsed ? "w-[56px]" : "w-56"}`}>
        {/* Header */}
        <div className={`flex items-center border-b border-border h-14 ${collapsed ? "flex-col justify-center gap-1 px-2 py-2" : "gap-2 px-3"}`}>
          <button onClick={toggleCollapse}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
            title={collapsed ? "Expand" : "Collapse"}>
            <Menu className="h-4 w-4" />
          </button>
          {!collapsed && <Logo size={28} subtitle="admin panel" />}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon, color }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href}
                title={collapsed ? label : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
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

        <AdminUserSection collapsed={collapsed} />
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
