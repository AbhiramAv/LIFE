"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPasswordPage() {
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [error, setError]         = useState("");
  const [loading, setLoading]     = useState(false);
  const router  = useRouter();
  const supabase = createClient();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords don't match"); return; }
    setLoading(true); setError("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/auth/login");
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">New password</h1>
        <p className="text-sm text-muted-foreground">Choose a strong password</p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <Input
          type="password" placeholder="New password (min 6 characters)" value={password}
          onChange={e => setPassword(e.target.value)} required minLength={6} autoFocus
        />
        <Input
          type="password" placeholder="Confirm password" value={confirm}
          onChange={e => setConfirm(e.target.value)} required
        />
        {error && <p className="text-xs text-rose-400">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Updating…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}
