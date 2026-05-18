import Link from "next/link";
import { Heart, Target, Activity, DollarSign, Layers, ArrowRight, Camera, MapPin } from "lucide-react";

const domains = [
  {
    href: "/mood",
    label: "Mood",
    icon: Heart,
    description: "Daily check-in",
    gradient: "from-rose-500/20 via-rose-500/5 to-transparent",
    border: "border-rose-500/20 hover:border-rose-500/40",
    iconBg: "bg-rose-500/15 text-rose-400",
  },
  {
    href: "/habits",
    label: "Habits",
    icon: Target,
    description: "Streaks & routines",
    gradient: "from-violet-500/20 via-violet-500/5 to-transparent",
    border: "border-violet-500/20 hover:border-violet-500/40",
    iconBg: "bg-violet-500/15 text-violet-400",
  },
  {
    href: "/fitness",
    label: "Fitness",
    icon: Activity,
    description: "Workouts & strength",
    gradient: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    border: "border-emerald-500/20 hover:border-emerald-500/40",
    iconBg: "bg-emerald-500/15 text-emerald-400",
  },
  {
    href: "/finance",
    label: "Finance",
    icon: DollarSign,
    description: "Spending & investments",
    gradient: "from-amber-500/20 via-amber-500/5 to-transparent",
    border: "border-amber-500/20 hover:border-amber-500/40",
    iconBg: "bg-amber-500/15 text-amber-400",
  },
  {
    href: "/goals",
    label: "Goals",
    icon: Layers,
    description: "Projects & milestones",
    gradient: "from-sky-500/20 via-sky-500/5 to-transparent",
    border: "border-sky-500/20 hover:border-sky-500/40",
    iconBg: "bg-sky-500/15 text-sky-400",
  },
  {
    href: "/memories",
    label: "Memories",
    icon: Camera,
    description: "Places, trips & photos",
    gradient: "from-fuchsia-500/20 via-fuchsia-500/5 to-transparent",
    border: "border-fuchsia-500/20 hover:border-fuchsia-500/40",
    iconBg: "bg-fuchsia-500/15 text-fuchsia-400",
  },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return "Still up?";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

export default function DashboardPage() {
  const now = new Date();
  const displayDate = now.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
  const daysLeft = 365 - dayOfYear;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

      {/* Hero header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{getGreeting()}</h1>
            <p className="text-muted-foreground mt-1">{displayDate}</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-2xl font-bold text-primary">{daysLeft}</p>
            <p className="text-xs text-muted-foreground">days left in {now.getFullYear()}</p>
          </div>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
            style={{ width: `${(dayOfYear / 365) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">Day {dayOfYear} of 365 — {Math.round((dayOfYear / 365) * 100)}% of the year</p>
      </div>

      {/* Domain cards */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Your domains</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {domains.map(({ href, label, icon: Icon, description, gradient, border, iconBg }) => (
            <Link key={href} href={href} className="group">
              <div className={`relative overflow-hidden rounded-xl border bg-card p-4 h-full transition-all duration-200 ${border} hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} pointer-events-none`} />
                <div className="relative space-y-3">
                  <div className={`inline-flex items-center justify-center h-9 w-9 rounded-lg ${iconBg}`}>
                    <Icon className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-150" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Lookback placeholder */}
      <div className="rounded-xl border border-dashed border-border p-5 flex items-center gap-4">
        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">Lookback · coming soon</p>
          <p className="text-xs text-muted-foreground">On this day last year — mood, workouts, where you were, what you spent</p>
        </div>
      </div>
    </div>
  );
}
