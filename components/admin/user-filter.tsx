"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

type UserOption = { id: string; email: string; name: string | null };

function UserFilterInner() {
  const [users, setUsers] = useState<UserOption[]>([]);
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();
  const selected    = searchParams.get("userId") ?? "";

  useEffect(() => {
    fetch("/api/admin/users").then(r => r.json()).then(setUsers);
  }, []);

  function pick(userId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (userId) params.set("userId", userId);
    else params.delete("userId");
    router.push(`${pathname}?${params.toString()}`);
  }

  const label = users.find(u => u.id === selected);

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-muted-foreground">Viewing</span>
      <select
        value={selected}
        onChange={e => pick(e.target.value)}
        className="text-xs rounded-lg border border-border bg-background px-2.5 py-1.5 focus:outline-none cursor-pointer"
      >
        <option value="">All users</option>
        {users.map(u => (
          <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
        ))}
      </select>
      {selected && (
        <button
          onClick={() => pick("")}
          className="text-xs leading-none text-muted-foreground hover:text-foreground transition-colors"
          title="Clear filter"
        >
          ×
        </button>
      )}
    </div>
  );
}

export function UserFilter() {
  return <Suspense><UserFilterInner /></Suspense>;
}
