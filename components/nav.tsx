"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, DollarSign, Heart, Target, LayoutDashboard } from "lucide-react";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/mood", label: "Mood", icon: Heart },
  { href: "/habits", label: "Habits", icon: Target },
  { href: "/fitness", label: "Fitness", icon: Activity },
  { href: "/finance", label: "Finance", icon: DollarSign },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:static md:border-t-0 md:border-r md:h-screen md:w-56 md:flex-shrink-0">
      <div className="flex h-16 items-center justify-around px-2 md:flex-col md:h-full md:items-start md:justify-start md:gap-1 md:px-3 md:py-6">
        <div className="hidden md:block mb-6 px-2">
          <h1 className="text-xl font-bold tracking-tight">LIFE</h1>
          <p className="text-xs text-muted-foreground">your lifetime dashboard</p>
        </div>
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-2 text-xs transition-colors md:flex-row md:gap-3 md:w-full md:text-sm md:px-3 md:py-2.5 ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5 md:h-4 md:w-4 shrink-0" />
              <span className="md:block">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
