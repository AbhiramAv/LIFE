"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, SmilePlus, Flame, Brain, Wind, Frown } from "lucide-react";

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const today = localToday();

// 5 emoji options per category — each maps to a score value 2,4,6,8,10
const CATEGORIES = [
  {
    key: "moodScore" as const,
    label: "Mood",
    icon: SmilePlus,
    color: "text-rose-400",
    options: [
      { emoji: "😭", label: "Awful",    value: 2  },
      { emoji: "😔", label: "Bad",      value: 4  },
      { emoji: "😐", label: "Okay",     value: 6  },
      { emoji: "😊", label: "Good",     value: 8  },
      { emoji: "🤩", label: "Amazing",  value: 10 },
    ],
  },
  {
    key: "energyScore" as const,
    label: "Energy",
    icon: Flame,
    color: "text-amber-400",
    options: [
      { emoji: "🪫", label: "Dead",      value: 2  },
      { emoji: "😴", label: "Tired",     value: 4  },
      { emoji: "⚡", label: "Decent",    value: 6  },
      { emoji: "💪", label: "Strong",    value: 8  },
      { emoji: "🚀", label: "Explosive", value: 10 },
    ],
  },
  {
    key: "stressScore" as const,
    label: "Stress",
    icon: Brain,
    color: "text-violet-400",
    options: [
      { emoji: "😌", label: "Calm",       value: 2  },
      { emoji: "🙂", label: "Relaxed",    value: 4  },
      { emoji: "😤", label: "Tense",      value: 6  },
      { emoji: "😰", label: "Stressed",   value: 8  },
      { emoji: "🤯", label: "Overwhelmed",value: 10 },
    ],
  },
];

type Scores = { moodScore: number; energyScore: number; stressScore: number };

function EmojiPicker({
  options,
  value,
  onChange,
}: {
  options: { emoji: string; label: string; value: number }[];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1.5 sm:gap-2">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all duration-150 ${
              active
                ? "border-primary bg-primary/10 scale-105 shadow-sm"
                : "border-border bg-muted/40 hover:border-primary/40 hover:bg-muted/80"
            }`}
          >
            <span className="text-xl sm:text-2xl leading-none">{opt.emoji}</span>
            <span className={`text-[10px] font-medium leading-none ${active ? "text-primary" : "text-muted-foreground"}`}>
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function MoodPage() {
  const [scores, setScores] = useState<Scores>({ moodScore: 6, energyScore: 6, stressScore: 6 });
  const [notes, setNotes]         = useState("");
  const [gratitude, setGratitude] = useState("");
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);

  useEffect(() => {
    fetch(`/api/mood?date=${today}`)
      .then((r) => r.json())
      .then((entry) => {
        if (entry) {
          setScores({ moodScore: entry.moodScore, energyScore: entry.energyScore, stressScore: entry.stressScore });
          setNotes(entry.notes ?? "");
          setGratitude(entry.gratitude ?? "");
        }
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today, ...scores, notes, gratitude }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const displayDate = new Date(today + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  // Overall: mood + energy + (invert stress so calm=high). Average → scale to 1-10
  const overallScore = Math.round(
    (scores.moodScore + scores.energyScore + (12 - scores.stressScore)) / 3
  );

  const moodEmoji = CATEGORIES[0].options.find((o) => o.value === scores.moodScore)?.emoji ?? "😐";

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daily Check-in</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{displayDate}</p>
        </div>
        <span className="text-4xl select-none leading-none mt-1">{moodEmoji}</span>
      </div>

      {/* Overall bar */}
      <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-4">
        <div className="flex-1 space-y-1.5">
          <p className="text-xs text-muted-foreground">Overall feeling</p>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-500 via-violet-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${(overallScore / 10) * 100}%` }}
            />
          </div>
        </div>
        <span className="text-2xl font-bold text-primary tabular-nums">{overallScore}</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Emoji pickers */}
        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
          {CATEGORIES.map(({ key, label, icon: Icon, color, options }) => (
            <div key={key} className="px-4 py-4 space-y-3">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-sm font-medium">{label}</span>
              </div>
              <EmojiPicker
                options={options}
                value={scores[key]}
                onChange={(v) => setScores((s) => ({ ...s, [key]: v }))}
              />
            </div>
          ))}
        </div>

        {/* Reflect */}
        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
          <div className="px-4 py-4 space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Wind className="h-4 w-4 text-emerald-400" /> Grateful for
            </Label>
            <Textarea
              placeholder="Three things, one word each is fine..."
              value={gratitude}
              onChange={(e) => setGratitude(e.target.value)}
              rows={2}
              className="resize-none bg-transparent border-0 p-0 shadow-none focus-visible:ring-0 text-sm placeholder:text-muted-foreground/50"
            />
          </div>
          <div className="px-4 py-4 space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Frown className="h-4 w-4 text-rose-400" /> Notes
            </Label>
            <Textarea
              placeholder="Anything on your mind..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none bg-transparent border-0 p-0 shadow-none focus-visible:ring-0 text-sm placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        <Button type="submit" className="w-full gap-2 font-semibold" disabled={saving}>
          {saved ? <><CheckCircle2 className="h-4 w-4" /> Saved!</> : saving ? "Saving..." : "Save check-in"}
        </Button>
      </form>
    </div>
  );
}
