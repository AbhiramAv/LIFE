"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { X, Megaphone } from "lucide-react";

type Announcement = { id: number; content: string };

export function AnnouncementBanner() {
  const pathname = usePathname();
  const [items, setItems]       = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const skip = pathname.startsWith("/admin") || pathname.startsWith("/auth");

  useEffect(() => {
    if (skip) return;
    fetch("/api/announcements")
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setItems(data); })
      .catch(() => {});
  }, [skip]);

  if (skip) return null;

  const visible = items.filter(a => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-1 px-4 pt-3">
      {visible.map(a => (
        <div key={a.id} className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-2.5 text-sm text-amber-200">
          <Megaphone className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
          <p className="flex-1 leading-snug">{a.content}</p>
          <button
            onClick={() => setDismissed(prev => new Set([...prev, a.id]))}
            className="text-amber-400/60 hover:text-amber-400 transition-colors shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
