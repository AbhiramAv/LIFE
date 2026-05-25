"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Check, User, Palette, Shield, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = { id: string; email: string; name: string | null; role: string; createdAt: string };

function Section({ icon: Icon, title, children }: {
  icon: React.ElementType; title: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/20">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <p className="text-sm font-medium text-muted-foreground w-32 shrink-0">{label}</p>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName]       = useState("");
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const router  = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetch("/api/user/profile").then(r => r.json()).then((p: Profile) => {
      setProfile(p);
      setName(p?.name ?? "");
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  const displayName = name || profile?.email?.split("@")[0] || "—";
  const initials    = displayName[0].toUpperCase();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Page header */}
      <div className="pb-2">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your profile and preferences</p>
      </div>

      {/* Profile section */}
      <Section icon={User} title="Profile">
        {/* Avatar identity */}
        <div className="flex items-center gap-4 px-5 py-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold leading-tight truncate">{displayName}</p>
            <p className="text-sm text-muted-foreground truncate">{profile?.email}</p>
          </div>
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-primary/15 text-primary capitalize shrink-0">
            {profile?.role ?? "user"}
          </span>
        </div>

        {/* Name field */}
        <form onSubmit={save} className="flex items-center gap-3 px-5 py-4">
          <p className="text-sm font-medium text-muted-foreground w-32 shrink-0">Display name</p>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            className="flex-1 h-8 text-sm"
          />
          <Button type="submit" size="sm" disabled={saving || !name.trim()} className="shrink-0 h-8 px-3 gap-1.5">
            {saved ? <><Check className="h-3.5 w-3.5" /> Saved</> : saving ? "Saving…" : "Save"}
          </Button>
        </form>

        {/* Email field (read-only) */}
        <Row label="Email">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm truncate">{profile?.email ?? "—"}</p>
            <p className="text-xs text-muted-foreground shrink-0">Cannot be changed</p>
          </div>
        </Row>

        {/* Member since */}
        <Row label="Member since">
          <p className="text-sm text-muted-foreground">
            {profile
              ? new Date(profile.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
              : "—"}
          </p>
        </Row>
      </Section>

      {/* Appearance section */}
      <Section icon={Palette} title="Appearance">
        <div className="flex items-center gap-4 px-5 py-4">
          <p className="text-sm font-medium text-muted-foreground w-32 shrink-0">Theme</p>
          <div className="flex-1">
            <p className="text-sm font-medium">Dark mode</p>
            <p className="text-xs text-muted-foreground">Toggle light and dark theme</p>
          </div>
          <ThemeToggle />
        </div>
      </Section>

      {/* Account section */}
      <Section icon={Shield} title="Account">
        <div className="flex items-center gap-4 px-5 py-4">
          <p className="text-sm font-medium text-muted-foreground w-32 shrink-0">Role</p>
          <p className="text-sm capitalize">{profile?.role ?? "—"}</p>
        </div>
        <div className="px-5 py-4">
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-sm font-medium text-rose-500 hover:text-rose-400 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>
      </Section>
    </div>
  );
}
