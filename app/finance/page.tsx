import { FileText, PieChart, TrendingUp, CreditCard } from "lucide-react";

const features = [
  { icon: FileText,   label: "CSV Import",     description: "Upload bank statements",         color: "text-amber-400",  bg: "bg-amber-500/10"  },
  { icon: PieChart,   label: "Spend Breakdown", description: "Monthly by category",           color: "text-rose-400",   bg: "bg-rose-500/10"   },
  { icon: TrendingUp, label: "Net Worth",       description: "Snapshot history over time",    color: "text-emerald-400",bg: "bg-emerald-500/10"},
  { icon: CreditCard, label: "Subscriptions",  description: "Recurring charges tracker",      color: "text-sky-400",    bg: "bg-sky-500/10"    },
];

export default function FinancePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Finance</h1>
        <p className="text-sm text-muted-foreground mt-0.5">CSV import · spending breakdown · net worth tracking</p>
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
      <div className="rounded-xl border border-dashed border-amber-500/20 p-8 text-center space-y-2">
        <p className="text-sm font-medium">Finance tracking · Phase 2</p>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Upload your bank CSV and the app categorises transactions, shows monthly breakdowns, and tracks net worth.
        </p>
      </div>
    </div>
  );
}
