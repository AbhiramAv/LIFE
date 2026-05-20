"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Check } from "lucide-react";

type Profile = { id: string; email: string; name: string | null; role: string; createdAt: string };

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName]       = useState("");
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
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

  const initials = (name || profile?.email || "?")[0].toUpperCase();

  return (
    <div className="max-w-lg mx-auto px-4 py-10 space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your profile and preferences</p>
      </div>

      {/* Avatar + identity */}
      <div className="flex items-center gap-5">
        <div className="h-20 w-20 rounded-2xl bg-primary/20 flex items-center justify-center text-3xl font-bold text-primary shrink-0">
          {initials}
        </div>
        <div>
          <p className="text-xl font-bold">{name || profile?.email?.split("@")[0] || "—"}</p>
          <p className="text-sm text-muted-foreground">{profile?.email}</p>
          <span className="mt-1 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary capitalize">
            {profile?.role}
          </span>
        </div>
      </div>

      {/* Profile form */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <p className="text-sm font-semibold">Profile</p>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Display name</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              className="text-base"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</label>
            <Input value={profile?.email ?? ""} disabled className="text-base opacity-60" />
            <p className="text-[11px] text-muted-foreground">Email cannot be changed here</p>
          </div>
          <Button type="submit" disabled={saving || !name.trim()} className="gap-2">
            {saved ? <><Check className="h-3.5 w-3.5" /> Saved</> : saving ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </div>

      {/* Appearance */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <p className="text-sm font-semibold">Appearance</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Dark mode</p>
            <p className="text-xs text-muted-foreground mt-0.5">Toggle between light and dark theme</p>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Account info */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-3">
        <p className="text-sm font-semibold">Account</p>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Member since {profile ? new Date(profile.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}</p>
        </div>
      </div>
    </div>
  );
}
