"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail]   = useState("");
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);
  const supabase = createClient();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}/auth/reset-password`,
    });
    if (error) { setError(error.message); setLoading(false); return; }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="w-full max-w-sm text-center space-y-3">
        <h2 className="text-lg font-semibold">Check your email</h2>
        <p className="text-sm text-muted-foreground">
          Sent a password reset link to <strong>{email}</strong>.
        </p>
        <Link href="/auth/login" className="text-sm text-foreground hover:underline">Back to login</Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Reset password</h1>
        <p className="text-sm text-muted-foreground">Enter your email and we'll send a reset link</p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <Input
          type="email" placeholder="Email" value={email}
          onChange={e => setEmail(e.target.value)} required autoFocus
        />
        {error && <p className="text-xs text-rose-400">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        <Link href="/auth/login" className="text-foreground hover:underline">← Back to login</Link>
      </p>
    </div>
  );
}
