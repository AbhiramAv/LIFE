import { Layers, GitBranch, Award, Briefcase } from "lucide-react";

const categories = [
  { icon: Layers,     label: "Projects",       description: "Active work & side projects",   color: "text-sky-400",     bg: "bg-sky-500/10",     border: "border-sky-500/20"     },
  { icon: Award,      label: "Certifications", description: "Courses & credentials",          color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20"   },
  { icon: Briefcase,  label: "Career",         description: "Milestones & growth",            color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  { icon: GitBranch,  label: "Personal Goals", description: "Everything else you're chasing", color: "text-violet-400",  bg: "bg-violet-500/10",  border: "border-violet-500/20"  },
];

export default function GoalsPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Goals</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Projects, certifications, career milestones — your Jira</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {categories.map(({ icon: Icon, label, description, color, bg, border }) => (
          <div
            key={label}
            className={`rounded-xl border ${border} bg-card p-5 space-y-3 opacity-60`}
          >
            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
              <Icon className={`h-4.5 w-4.5 ${color}`} />
            </div>
            <div>
              <p className="font-semibold text-sm">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-2">
        <p className="text-sm font-medium">Ticketing system coming in Phase 2</p>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Create goals, break them into tasks, track status — Linear-style, connected to your mood and habit data.
        </p>
      </div>
    </div>
  );
}
