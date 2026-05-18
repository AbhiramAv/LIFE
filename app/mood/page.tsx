"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

const today = new Date().toISOString().split("T")[0];

const SCORE_LABELS: Record<number, string> = {
  1: "1", 2: "2", 3: "3", 4: "4", 5: "5",
  6: "6", 7: "7", 8: "8", 9: "9", 10: "10",
};

function ScoreSlider({
  label,
  value,
  onChange,
  lowLabel,
  highLabel,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  lowLabel: string;
  highLabel: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{label}</Label>
        <span className="text-2xl font-bold tabular-nums w-8 text-right">{value}</span>
      </div>
      <Slider
        min={1}
        max={10}
        step={1}
        value={[value]}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

export default function MoodPage() {
  const [mood, setMood] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [stress, setStress] = useState(5);
  const [notes, setNotes] = useState("");
  const [gratitude, setGratitude] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [existingId, setExistingId] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/mood?date=${today}`)
      .then((r) => r.json())
      .then((entry) => {
        if (entry) {
          setMood(entry.moodScore);
          setEnergy(entry.energyScore);
          setStress(entry.stressScore);
          setNotes(entry.notes ?? "");
          setGratitude(entry.gratitude ?? "");
          setExistingId(entry.id);
        }
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/mood", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today, moodScore: mood, energyScore: energy, stressScore: stress, notes, gratitude }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const displayDate = new Date(today + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div className="max-w-lg mx-auto p-4 pt-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Daily Check-in</h1>
        <p className="text-sm text-muted-foreground">{displayDate}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">How are you feeling?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ScoreSlider label="Mood" value={mood} onChange={setMood} lowLabel="Terrible" highLabel="Fantastic" />
            <ScoreSlider label="Energy" value={energy} onChange={setEnergy} lowLabel="Drained" highLabel="Energized" />
            <ScoreSlider label="Stress" value={stress} onChange={setStress} lowLabel="Calm" highLabel="Overwhelmed" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Reflect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="gratitude">What are you grateful for?</Label>
              <Textarea
                id="gratitude"
                placeholder="Three things, one word each is fine..."
                value={gratitude}
                onChange={(e) => setGratitude(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Anything on your mind..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? "Saving..." : saved ? "Saved!" : existingId ? "Update" : "Save check-in"}
        </Button>
      </form>
    </div>
  );
}
