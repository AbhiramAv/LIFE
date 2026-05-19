"use client";

import { usePathname } from "next/navigation";
import { NAV_LINKS } from "./nav";

export function RouteAccentBar() {
  const pathname = usePathname();
  const link =
    NAV_LINKS.find((l) =>
      l.href === "/" ? pathname === "/" : pathname === l.href || pathname.startsWith(l.href + "/")
    ) ?? NAV_LINKS[0];

  return (
    <div
      className="h-[3px] w-full shrink-0"
      style={{ background: `linear-gradient(90deg, ${link.color} 0%, transparent 70%)` }}
    />
  );
}
