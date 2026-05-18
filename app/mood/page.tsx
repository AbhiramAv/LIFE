"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { CheckCircle2, Flame, Brain, SmilePlus, Wind, Frown } from "lucide-react";

const today = new Date().toISOString().split("T")[0];

const SCORE_CONFIG = [
  { key: "moodScore"   as const, label: "Mood",   icon: SmilePlus, color: "text-rose-400",   low: "Awful",    high: "Fantastic"   },
  { key: "energyScore" as const, label: "Energy", icon: Flame,     color: "text-amber-400",  low: "Drained",  high: "Energized"   },
  { key: "stressScore" as const, label: "Stress", icon: Brain,     color: "text-violet-400", low: "Calm",     high: "Overwhelmed" },
];

function getEmoji(score: number) {
  if (score <= 2) return "😞";
  if (score <= 4) return "😕";
  if (score <= 6) return "😐";
  if (score <= 8) return "😊";
  return "😄";
}

type Scores = { moodScore: number; energyScore: number; stressScore: number };

export default function MoodPage() {
  const [scores, setScores] = useState<Scores>({ moodScore: 5, energyScore: 5, stressScore: 5 });
  const [notes, setNotes]       = useState("");
  const [gratitude, setGratitude] = useState("");
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

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

  const overallScore = Math.round(
    (scores.moodScore + scores.energyScore + (10 - scores.stressScore)) / 3
  );

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daily Check-in</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{displayDate}</p>
        </div>
        <span className="text-4xl select-none">{getEmoji(scores.moodScore)}</span>
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
        {/* Sliders */}
        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
          {SCORE_CONFIG.map(({ key, label, icon: Icon, color, low, high }) => (
            <div key={key} className="px-4 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${color}`} />
                  <span className="text-sm font-medium">{label}</span>
                </div>
                <span className="text-xl font-bold tabular-nums w-7 text-right">{scores[key]}</span>
              </div>
              <Slider
                min={1} max={10} step={1}
                value={[scores[key]]}
                onValueChange={(v) =>
                  setScores((s) => ({ ...s, [key]: Array.isArray(v) ? v[0] : v }))
                }
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{low}</span><span>{high}</span>
              </div>
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
