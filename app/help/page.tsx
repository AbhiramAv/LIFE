"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const FAQS = [
  {
    q: "How do I track my daily habits?",
    a: "Go to the Habits page and create a habit with a name, color, and target frequency (daily or weekly). Each day, check in from the dashboard — the habit carousel lets you mark habits as done or skipped. Your streak and completion rate update automatically.",
  },
  {
    q: "How do I log my mood for today?",
    a: "Visit the Mood page and use the sliders to rate your mood, energy, and stress on a 1–10 scale. You can also add notes or a gratitude entry. The dashboard shows an alert in the evening if you haven't checked in yet.",
  },
  {
    q: "What is the Sprint Board on the dashboard?",
    a: "The Sprint Board is a Kanban-style board showing tickets you've planned for the current week. You can drag tickets between Todo, In Progress, and Done. Use 'Plan sprint →' to pick tickets from your project backlog.",
  },
  {
    q: "How do I add a workout session?",
    a: "Go to Fitness → Log workout. Select a date, add exercises with sets, reps, and weight. You can browse from the exercise library or add custom exercises. Sessions appear in the activity calendar on your dashboard.",
  },
  {
    q: "How do I create a project and add tickets?",
    a: "Go to Goals and click 'New project'. Give it a title, category, and color. Inside the project, add tickets with title, description, priority, and due date. You can also bulk-import tickets from a structured markdown outline.",
  },
  {
    q: "What's the difference between Habits and Goals?",
    a: "Habits are recurring behaviors you track daily or weekly (e.g. 'Read 30 min'). Goals are outcome-based projects broken into tickets (e.g. 'Launch side project' → design, build, deploy tickets). Both feed into the analytics on your dashboard.",
  },
  {
    q: "How do I import tickets in bulk?",
    a: "In Goals, click 'Import'. Paste a structured markdown outline where ### headings become ticket titles. The importer extracts priority from bold tags like **Priority: High**. You can preview before confirming the import.",
  },
  {
    q: "Can I change the color of my habits or projects?",
    a: "Yes. On the Habits page, hover a habit and click the pencil icon to edit it — you can change the name, color, bigger goal, and frequency. On the Goals page, open a project and click the pencil icon next to the title.",
  },
  {
    q: "How does the Finance tracker work?",
    a: "Go to Finance and add accounts (checking, savings, credit, investment). Then log transactions with amount, category, and description. The dashboard tracks net worth and spending by category.",
  },
  {
    q: "How do I reset my password?",
    a: "On the login page, click 'Forgot password?' and enter your email. You'll receive a reset link. Click it to set a new password. If you signed up with Google, password reset is managed through your Google account.",
  },
  {
    q: "How do I change my display name?",
    a: "Click the gear icon at the bottom of the sidebar to open your settings, then choose 'Profile & Account'. You can update your display name there — it shows in the sidebar and throughout the app.",
  },
  {
    q: "Is my data private?",
    a: "Yes. Your data is stored securely and only accessible to you. Each account has strict data isolation — no other user can see your habits, mood entries, or projects. We never share your personal data.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 py-4 text-left text-sm font-medium hover:text-foreground transition-colors">
        <span>{q}</span>
        {open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>
      {open && (
        <p className="pb-4 text-sm text-muted-foreground leading-relaxed">{a}</p>
      )}
    </div>
  );
}

export default function HelpPage() {
  const [subject, setSubject]   = useState("");
  const [message, setMessage]   = useState("");
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true); setError("");

    try {
      // Get or create the support thread
      const threadRes = await fetch("/api/support/thread");
      const thread    = await threadRes.json();

      // Send message with subject prepended if provided
      const content = subject.trim()
        ? `**${subject.trim()}**\n\n${message.trim()}`
        : message.trim();

      await fetch(`/api/support/${thread.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      setSent(true);
      setSubject(""); setMessage("");
    } catch {
      setError("Failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-12">
      {/* Hero */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Help &amp; FAQ</h1>
        <p className="text-muted-foreground">Everything you need to get the most out of LIFE.</p>
      </div>

      {/* FAQ */}
      <div className="space-y-1">
        <h2 className="text-lg font-semibold mb-4">Frequently asked questions</h2>
        <div className="rounded-xl border border-border bg-card px-5">
          {FAQS.map(faq => <FAQItem key={faq.q} {...faq} />)}
        </div>
      </div>

      {/* Contact form */}
      <div id="contact" className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Still need help?</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Send us a message and we'll get back to you — you can also chat live using the button in the bottom right.
        </p>

        {sent ? (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-4 py-3">
            Message sent! We'll reply in your chat — look for the bubble in the bottom right.
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <Input
              placeholder="Subject (optional)"
              value={subject}
              onChange={e => setSubject(e.target.value)}
            />
            <Textarea
              placeholder="Describe your issue or question…"
              value={message}
              onChange={e => setMessage(e.target.value)}
              required
              className="min-h-[120px] resize-none"
            />
            {error && <p className="text-xs text-rose-400">{error}</p>}
            <Button type="submit" disabled={sending || !message.trim()} className="gap-2">
              <Send className="h-3.5 w-3.5" />
              {sending ? "Sending…" : "Send message"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
