import { Dumbbell, TrendingUp, Calendar, Zap } from "lucide-react";

const features = [
  { icon: Dumbbell,   label: "Workout Logger",      description: "Exercises, sets, reps, weight",       color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { icon: TrendingUp, label: "Progressive Overload", description: "Strength gains over time",            color: "text-sky-400",     bg: "bg-sky-500/10"     },
  { icon: Calendar,   label: "Muscle Frequency",    description: "Heatmap of muscles trained per week",  color: "text-violet-400",  bg: "bg-violet-500/10"  },
  { icon: Zap,        label: "Apple Health Sync",   description: "Import sleep, steps, heart rate",      color: "text-amber-400",   bg: "bg-amber-500/10"   },
];

export default function FitnessPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Fitness</h1>
        <p className="text-sm text-muted-foreground mt-0.5">131 exercises seeded · workout logging coming in Phase 2</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {features.map(({ icon: Icon, label, description, color, bg }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-5 space-y-3 opacity-60">
            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
              <Icon className={`h-[18px] w-[18px] ${color}`} />
            </div>
            <div>
              <p className="font-semibold text-sm">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-dashed border-emerald-500/20 p-8 text-center space-y-2">
        <p className="text-sm font-medium">Workout logging · Phase 2</p>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Session → exercises → sets with weight and reps. Muscle heatmap and progressive overload charts included.
        </p>
      </div>
    </div>
  );
}
