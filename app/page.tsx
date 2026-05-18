import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Heart, Target, Activity, DollarSign } from "lucide-react";

const domains = [
  { href: "/mood", label: "Mood", icon: Heart, description: "Daily check-in", color: "text-pink-500" },
  { href: "/habits", label: "Habits", icon: Target, description: "Track your streaks", color: "text-indigo-500" },
  { href: "/fitness", label: "Fitness", icon: Activity, description: "Log workouts", color: "text-green-500" },
  { href: "/finance", label: "Finance", icon: DollarSign, description: "Track spending", color: "text-yellow-500" },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

export default function DashboardPage() {
  const displayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  return (
    <div className="max-w-2xl mx-auto p-4 pt-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Good {getGreeting()}</h1>
        <p className="text-muted-foreground">{displayDate}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {domains.map(({ href, label, icon: Icon, description, color }) => (
          <Link key={href} href={href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardHeader className="pb-2">
                <Icon className={`h-6 w-6 ${color}`} />
              </CardHeader>
              <CardContent>
                <p className="font-semibold">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
