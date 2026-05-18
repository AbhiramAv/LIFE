import { Camera, MapPin, Plane, Image } from "lucide-react";

const placeholders = [
  { icon: Plane,   label: "Trips",      description: "Countries, cities, dates", color: "text-sky-400",     bg: "bg-sky-500/10"     },
  { icon: MapPin,  label: "Places",     description: "Memorable locations",       color: "text-rose-400",    bg: "bg-rose-500/10"    },
  { icon: Camera,  label: "Photos",     description: "Upload with metadata",       color: "text-violet-400",  bg: "bg-violet-500/10"  },
  { icon: Image,   label: "Moments",    description: "Any memory worth keeping",   color: "text-amber-400",   bg: "bg-amber-500/10"   },
];

export default function MemoriesPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Memories</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Trips, photos, places — your life in time and space</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {placeholders.map(({ icon: Icon, label, description, color, bg }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-5 space-y-3 opacity-60">
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
        <p className="text-sm font-medium">Photo & trip storage coming in Phase 3</p>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Upload photos with location and date metadata. They'll connect to your mood, fitness, and finance data for the same day.
        </p>
      </div>
    </div>
  );
}
