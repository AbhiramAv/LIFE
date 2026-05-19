"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Heart, Target, Activity, DollarSign, Camera, Layers,
  BarChart2, CalendarDays, LayoutDashboard, ChevronDown, X, Plus,
} from "lucide-react";
import { type IssueStatus } from "@/lib/types/goals";

// ─── Types ────────────────────────────────────────────────────────────────────

type AnyIssue = {
  id: number; projectId: number; title: string;
  status: string; projectTitle: string; projectColor: string;
  inSprint: boolean; completedAt: string | null; createdAt: string;
};
type HabitLogDay = { date: string; completed: number };
type WorkoutDay  = { date: string };
type Habit       = { id: number; name: string; biggerGoal: string | null; color: string; targetDaysPerWeek: number };
type HabitLog    = { habitId: number; date: string; completed: boolean; logStatus: string };
type WeekCount   = { habitId: number; doneThisWeek: number };
type PendingDone = { type: "issue" | "habit"; id: number };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return "Still up?";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}
function dateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
const MOOD_EMOJIS: Record<number,string> = {2:"😭",4:"😔",6:"😐",8:"😊",10:"🤩"};
function closestEmoji(v: number) {
  const keys=[2,4,6,8,10];
  return MOOD_EMOJIS[keys.reduce((a,b)=>Math.abs(b-v)<Math.abs(a-v)?b:a)];
}
const GOAL_PALETTE = ["#f43f5e","#f97316","#eab308","#22c55e","#06b6d4","#3b82f6","#a855f7","#ec4899","#14b8a6","#84cc16"];
function biggerGoalColor(goal: string|null, fallback: string) {
  if (!goal) return fallback;
  let h=0; for (const c of goal) h=(h*31+c.charCodeAt(0))>>>0;
  return GOAL_PALETTE[h%GOAL_PALETTE.length];
}

// ─── Hover card wrapper (3D lift + glow) ─────────────────────────────────────

function HoverCard({ color, children, className = "", onClick }: {
  color: string; children: React.ReactNode; className?: string; onClick?: () => void;
}) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderColor: hov ? `${color}55` : `${color}22`,
        boxShadow: hov
          ? `0 12px 32px -6px ${color}35, 0 0 0 1px ${color}30, inset 0 1px 0 ${color}15`
          : `0 2px 8px -2px ${color}12, inset 0 1px 0 rgba(255,255,255,0.04)`,
        transform: hov ? "translateY(-3px)" : "translateY(0)",
        background: hov
          ? `linear-gradient(135deg, ${color}10 0%, transparent 55%)`
          : `linear-gradient(135deg, ${color}05 0%, transparent 55%)`,
        transition: "all 0.22s cubic-bezier(0.4,0,0.2,1)",
      }}
      className={`relative rounded-2xl border bg-card overflow-hidden ${className}`}
    >
      {/* Top accent line */}
      <div className="absolute top-0 inset-x-0 h-[2px] rounded-t-2xl"
        style={{ background: `linear-gradient(90deg, ${color}, ${color}00)` }} />
      {/* Corner glow orb */}
      <div className="absolute -top-6 -right-6 h-16 w-16 rounded-full blur-2xl pointer-events-none"
        style={{ backgroundColor: `${color}25`, opacity: hov ? 1 : 0.5, transition: "opacity 0.22s" }} />
      <div className="relative">{children}</div>
    </div>
  );
}

// ─── Glance grid ─────────────────────────────────────────────────────────────

function GlanceGrid({ mood, doneToday, totalHabits, workouts, allIssues }: {
  mood: { moodScore: number } | null;
  doneToday: number; totalHabits: number;
  workouts: WorkoutDay[]; allIssues: AnyIssue[];
}) {
  const today = localToday();
  const workedOut = workouts.some((w) => w.date === today);
  const completedTickets = allIssues.filter((i) => i.status === "done").length;

  const cards = [
    {
      href: "/mood", label: "Mood", icon: Heart, color: "#f43f5e",
      value: mood ? `${closestEmoji(mood.moodScore)} ${mood.moodScore}/10` : "—",
      sub: mood ? "today's check-in" : "not logged yet",
    },
    {
      href: "/habits", label: "Habits", icon: Target, color: "#8b5cf6",
      value: totalHabits === 0 ? "—" : `${doneToday}/${totalHabits}`,
      sub: totalHabits === 0 ? "no habits yet" : "done today",
    },
    {
      href: "/fitness", label: "Fitness", icon: Activity, color: "#10b981",
      value: workedOut ? "✓ Active" : "Rest day",
      sub: workedOut ? "workout logged" : "no session today",
    },
    {
      href: "/finance", label: "Finance", icon: DollarSign, color: "#f59e0b",
      value: "→", sub: "view finances",
    },
    {
      href: "/goals", label: "Goals", icon: Layers, color: "#0ea5e9",
      value: completedTickets > 0 ? `${completedTickets}` : "→",
      sub: completedTickets > 0 ? "tickets completed" : "view goals",
    },
    {
      href: "/calendar", label: "Calendar", icon: CalendarDays, color: "#6366f1",
      value: "→", sub: "upcoming events",
    },
    {
      href: "/memories", label: "Memories", icon: Camera, color: "#d946ef",
      value: "→", sub: "view memories",
    },
  ] as const;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map(({ href, label, icon: Icon, color, value, sub }) => (
        <Link key={href} href={href}>
          <HoverCard color={color} className="p-4 cursor-pointer">
            <div className="flex flex-col gap-2.5">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${color}18`, boxShadow: `inset 0 0 0 1px ${color}28` }}>
                <Icon className="h-4.5 w-4.5" style={{ color }} />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
                <p className="text-lg font-bold leading-tight mt-0.5">{value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{sub}</p>
              </div>
            </div>
          </HoverCard>
        </Link>
      ))}
    </div>
  );
}

// ─── Done confirmation modal ──────────────────────────────────────────────────

function DoneModal({ pending, onConfirm, onCancel }: {
  pending: PendingDone;
  onConfirm: (choice: "completed" | "cancelled") => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-card border border-border rounded-2xl p-5 shadow-2xl space-y-3 w-64"
        style={{ boxShadow: "0 24px 60px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)" }}>
        <p className="text-sm font-semibold text-center">
          {pending.type === "habit" ? "How'd it go?" : "Mark ticket as…"}
        </p>
        <div className="flex gap-2">
          <button onClick={() => onConfirm("completed")}
            className="flex-1 text-xs font-semibold py-2.5 rounded-xl border transition-all hover:-translate-y-0.5"
            style={{ backgroundColor:"#10b98115", color:"#10b981", borderColor:"#10b98135" }}>
            ✓ {pending.type === "habit" ? "Done" : "Completed"}
          </button>
          <button onClick={() => onConfirm("cancelled")}
            className="flex-1 text-xs font-semibold py-2.5 rounded-xl border transition-all hover:-translate-y-0.5"
            style={{ backgroundColor:"#f43f5e15", color:"#f43f5e", borderColor:"#f43f5e35" }}>
            ✕ {pending.type === "habit" ? "Skipped" : "Cancelled"}
          </button>
        </div>
        <button onClick={onCancel} className="w-full text-xs text-muted-foreground hover:text-foreground text-center transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Collapsible section ──────────────────────────────────────────────────────

function CollapsibleSection({ id, title, icon, children }: {
  id: string; title: string; icon: React.ReactNode; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const v = localStorage.getItem(`section-${id}`);
    if (v !== null) setOpen(v === "true");
  }, [id]);
  function toggle() { setOpen((o) => { localStorage.setItem(`section-${id}`, String(!o)); return !o; }); }

  return (
    <div className="space-y-3">
      <button onClick={toggle}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-xl hover:bg-muted/50 transition-colors -mx-3 group">
        {icon}
        <span className="text-sm font-semibold">{title}</span>
        <span className="ml-auto flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">{open ? "collapse" : "expand"}</span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "" : "-rotate-90"}`} />
        </span>
      </button>
      {open && <div className="space-y-3">{children}</div>}
    </div>
  );
}

// ─── Sprint drawer ────────────────────────────────────────────────────────────

function SprintDrawer({ open, onClose, sprintIds, onToggle }: {
  open: boolean; onClose: () => void;
  sprintIds: Set<number>; onToggle: (id: number, inSprint: boolean) => void;
}) {
  const [allIssues, setAllIssues] = useState<AnyIssue[]|null>(null);
  const [loading, setLoading] = useState(false);
  const [activeProject, setActiveProject] = useState<string|null>(null);

  useEffect(() => {
    if (open && !allIssues) {
      setLoading(true);
      fetch("/api/issues").then(r=>r.json()).then(data => {
        setAllIssues(Array.isArray(data) ? data : []);
        setLoading(false);
      });
    }
  }, [open, allIssues]);

  const backlog = useMemo(
    () => allIssues?.filter(i => !sprintIds.has(i.id) && !["done","cancelled","skipped"].includes(i.status)) ?? [],
    [allIssues, sprintIds]
  );
  const inSprint = useMemo(() => allIssues?.filter(i => sprintIds.has(i.id)) ?? [], [allIssues, sprintIds]);

  // projects ordered by first appearance
  const projects = useMemo(() => {
    const seen = new Map<string,{color:string;issues:AnyIssue[]}>();
    backlog.forEach(i => {
      if (!seen.has(i.projectTitle)) seen.set(i.projectTitle, {color:i.projectColor,issues:[]});
      seen.get(i.projectTitle)!.issues.push(i);
    });
    return Array.from(seen.entries()).map(([name,v]) => ({name,...v}));
  }, [backlog]);

  // auto-select first project when list loads
  useEffect(() => {
    if (projects.length > 0 && (activeProject === null || !projects.find(p => p.name === activeProject))) {
      setActiveProject(projects[0].name);
    }
  }, [projects, activeProject]);

  const activeTickets = useMemo(
    () => projects.find(p => p.name === activeProject)?.issues ?? [],
    [projects, activeProject]
  );

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <aside className="relative w-[520px] max-w-full bg-card border-l border-border flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-semibold text-sm">Plan this week</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{inSprint.length} ticket{inSprint.length!==1?"s":""} in sprint</p>
          </div>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* ── Left: project folder tabs + tickets ── */}
          <div className="flex flex-col flex-1 overflow-hidden border-r border-border">

            {/* Folder tab strip */}
            <div className="flex overflow-x-auto shrink-0 px-3 pt-3 gap-1 scrollbar-none">
              {loading && <p className="text-xs text-muted-foreground px-1 py-2">Loading…</p>}
              {!loading && projects.length === 0 && (
                <p className="text-xs text-muted-foreground italic px-1 py-2">All tickets are in the sprint.</p>
              )}
              {projects.map(({ name, color }) => {
                const active = name === activeProject;
                return (
                  <button
                    key={name}
                    onClick={() => setActiveProject(name)}
                    style={{
                      borderTopColor: active ? color : "transparent",
                      borderTopWidth: 2,
                      color: active ? color : undefined,
                      backgroundColor: active ? `${color}12` : undefined,
                      boxShadow: active ? `inset 0 -2px 0 ${color}30` : undefined,
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-medium whitespace-nowrap border border-b-0 transition-all shrink-0 ${
                      active
                        ? "border-border"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted border-transparent"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full shrink-0" style={{backgroundColor:color}} />
                    {name}
                  </button>
                );
              })}
            </div>

            {/* Divider that aligns under active tab */}
            <div className="h-px bg-border shrink-0 mx-3" />

            {/* Ticket list for active project */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
              {activeTickets.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No tickets in backlog for this project.</p>
              )}
              {activeTickets.map(issue => {
                const C = issue.projectColor;
                return (
                  <button
                    key={issue.id}
                    onClick={() => onToggle(issue.id, true)}
                    style={{
                      borderTopColor: `${C}25`,
                      borderRightColor: `${C}25`,
                      borderBottomColor: `${C}25`,
                      borderLeftColor: C,
                      borderLeftWidth: 3,
                    }}
                    className="group w-full text-left text-xs px-3 py-2.5 rounded-xl border bg-background hover:bg-muted flex items-center gap-2.5 transition-all hover:translate-y-[-1px] hover:shadow-sm"
                  >
                    <span className="flex-1 leading-snug">{issue.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                      style={{backgroundColor:`${C}20`,color:C}}>{issue.status}</span>
                    <Plus className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{color:C}} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Right: this week ── */}
          <div className="w-[200px] shrink-0 flex flex-col overflow-hidden">
            <div className="px-4 pt-4 pb-2 shrink-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">This week</p>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">
              {inSprint.length === 0 && (
                <p className="text-xs text-muted-foreground italic">← add tickets</p>
              )}
              {inSprint.map(issue => (
                <div key={issue.id}
                  style={{
                    borderTopColor: `${issue.projectColor}35`,
                    borderRightColor: `${issue.projectColor}35`,
                    borderBottomColor: `${issue.projectColor}35`,
                    borderLeftColor: issue.projectColor,
                    borderLeftWidth: 3,
                    backgroundColor: `${issue.projectColor}0d`,
                  }}
                  className="flex items-start gap-2 px-2.5 py-2 rounded-xl text-xs border group">
                  <span className="flex-1 leading-snug break-words min-w-0">{issue.title}</span>
                  <button onClick={() => onToggle(issue.id, false)}
                    className="text-muted-foreground hover:text-rose-400 transition-colors shrink-0 mt-0.5 opacity-0 group-hover:opacity-100">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      </aside>
    </div>
  );
}

// ─── Board ────────────────────────────────────────────────────────────────────

const DONE_STATUSES = ["done","cancelled","skipped"];
const STATUS_TAG: Record<string,{label:string;color:string}> = {
  done:{label:"done",color:"#10b981"}, cancelled:{label:"cancelled",color:"#f43f5e"},
  skipped:{label:"skipped",color:"#f59e0b"}, completed:{label:"done",color:"#10b981"}, missed:{label:"missed",color:"#6b7280"},
};
type DragInfo = { type: "issue"|"habit"; id: number };

function IssueCard({ issue, onDragStart, onDragEnd }: {
  issue: AnyIssue; onDragStart:()=>void; onDragEnd:()=>void;
}) {
  const isDone = DONE_STATUSES.includes(issue.status);
  const tag = isDone ? STATUS_TAG[issue.status] : null;
  const C = issue.projectColor;
  const [hov, setHov] = useState(false);

  return (
    <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        borderTopColor: hov ? `${C}55` : `${C}28`,
        borderRightColor: hov ? `${C}55` : `${C}28`,
        borderBottomColor: hov ? `${C}55` : `${C}28`,
        borderLeftColor: C, borderLeftWidth: 3,
        boxShadow: hov ? `0 8px 24px -4px ${C}28, 0 0 0 1px ${C}20` : `0 1px 4px ${C}10`,
        transform: hov ? "translateY(-2px)" : "translateY(0)",
        background: hov ? `linear-gradient(135deg, ${C}08, transparent)` : undefined,
        transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
      }}
      className="rounded-xl border bg-card p-3 space-y-2.5 cursor-grab active:cursor-grabbing select-none"
    >
      <p className={`text-xs font-medium leading-snug ${isDone ? "line-through text-muted-foreground" : ""}`}>{issue.title}</p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full truncate max-w-[110px]"
          style={{backgroundColor:`${C}20`,color:C}}>{issue.projectTitle}</span>
        {tag && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
          style={{backgroundColor:`${tag.color}20`,color:tag.color}}>{tag.label}</span>}
      </div>
    </div>
  );
}

function HabitCard({ habit, weekDone, alreadyDoneToday, onRequestDone, onDragStart, onDragEnd }: {
  habit: Habit; weekDone: number; alreadyDoneToday: boolean;
  onRequestDone:()=>void; onDragStart:()=>void; onDragEnd:()=>void;
}) {
  const remaining = habit.targetDaysPerWeek - weekDone;
  const doneForWeek = remaining <= 0;
  const C = biggerGoalColor(habit.biggerGoal, habit.color);
  const [hov, setHov] = useState(false);

  return (
    <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        borderTopColor: hov ? `${C}55` : `${C}28`,
        borderRightColor: hov ? `${C}55` : `${C}28`,
        borderBottomColor: hov ? `${C}55` : `${C}28`,
        borderLeftColor: C, borderLeftWidth: 3,
        boxShadow: hov ? `0 8px 24px -4px ${C}28, 0 0 0 1px ${C}20` : `0 1px 4px ${C}10`,
        transform: hov ? "translateY(-2px)" : "translateY(0)",
        background: hov ? `linear-gradient(135deg, ${C}08, transparent)` : undefined,
        transition: "all 0.2s cubic-bezier(0.4,0,0.2,1)",
      }}
      className="rounded-xl border bg-card p-3 space-y-2.5 cursor-grab active:cursor-grabbing select-none"
    >
      <p className={`text-xs font-medium leading-snug ${doneForWeek ? "line-through text-muted-foreground" : ""}`}>
        {habit.biggerGoal ?? habit.name}
      </p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
          style={{backgroundColor:`${C}20`,color:C}}>{habit.name}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {doneForWeek ? (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{backgroundColor:"#10b98120",color:"#10b981"}}>done ✓</span>
          ) : alreadyDoneToday ? (
            <span className="text-[10px] text-muted-foreground">✓ today · {remaining}× left</span>
          ) : (
            <span className="text-[10px] text-muted-foreground">{remaining}× left</span>
          )}
        </div>
      </div>
    </div>
  );
}

type BoardCard = {kind:"issue";issue:AnyIssue} | {kind:"habit";habit:Habit};
const COL_STATUS: Record<string,string> = {todo:"todo",in_progress:"in_progress",done:"done"};

function KanbanColumn({ title, color, columnKey, cards, weekCounts, todayLogs, onRequestDone, onStatusChange, dragging, setDragging }: {
  title:string; color:string; columnKey:string; cards:BoardCard[];
  weekCounts:Record<number,number>; todayLogs:HabitLog[];
  onRequestDone:(p:PendingDone)=>void; onStatusChange:(id:number,s:string)=>void;
  dragging:DragInfo|null; setDragging:(d:DragInfo|null)=>void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const today = localToday();

  return (
    <div
      style={{
        backgroundColor: dragOver ? `${color}10` : `${color}04`,
        borderColor: dragOver ? `${color}40` : `${color}18`,
        boxShadow: dragOver ? `inset 0 0 0 2px ${color}30` : undefined,
        transition: "all 0.15s ease",
      }}
      className="space-y-2 min-w-0 rounded-2xl border p-2"
      onDragOver={e=>{e.preventDefault();setDragOver(true);}}
      onDragLeave={()=>setDragOver(false)}
      onDrop={()=>{
        setDragOver(false);
        if (!dragging) return;
        if (dragging.type==="issue" && columnKey==="done") onRequestDone({type:"issue",id:dragging.id});
        else if (dragging.type==="issue") onStatusChange(dragging.id, COL_STATUS[columnKey]??"todo");
        else if (dragging.type==="habit" && columnKey==="done") onRequestDone({type:"habit",id:dragging.id});
        setDragging(null);
      }}
    >
      <div className="flex items-center gap-2 pb-1.5 px-1 border-b" style={{borderColor:`${color}25`}}>
        <div className="h-2 w-2 rounded-full shrink-0" style={{backgroundColor:color}} />
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
        <span className="ml-auto text-xs font-medium" style={{color:`${color}cc`}}>{cards.length}</span>
      </div>
      <div className="space-y-2 pt-1">
        {cards.map(card => {
          if (card.kind==="issue") return (
            <IssueCard key={`i-${card.issue.id}`} issue={card.issue}
              onDragStart={()=>setDragging({type:"issue",id:card.issue.id})}
              onDragEnd={()=>setDragging(null)}
            />
          );
          const weekDone = weekCounts[card.habit.id]??0;
          const alreadyDoneToday = todayLogs.some(l=>l.habitId===card.habit.id&&l.completed&&l.date===today);
          return (
            <HabitCard key={`h-${card.habit.id}`} habit={card.habit}
              weekDone={weekDone} alreadyDoneToday={alreadyDoneToday}
              onRequestDone={()=>onRequestDone({type:"habit",id:card.habit.id})}
              onDragStart={()=>setDragging({type:"habit",id:card.habit.id})}
              onDragEnd={()=>setDragging(null)}
            />
          );
        })}
        {cards.length===0 && (
          <div className="rounded-xl border border-dashed p-5 text-center" style={{borderColor:`${color}20`}}>
            <p className="text-xs text-muted-foreground">Empty</p>
          </div>
        )}
      </div>
    </div>
  );
}

function BoardContent({ habits, weekCounts, todayLogs, sprintIssues, onRequestDone, onStatusChange, onPlanSprint }: {
  habits:Habit[]; weekCounts:Record<number,number>; todayLogs:HabitLog[];
  sprintIssues:AnyIssue[]; onRequestDone:(p:PendingDone)=>void;
  onStatusChange:(id:number,s:string)=>void; onPlanSprint:()=>void;
}) {
  const [dragging, setDragging] = useState<DragInfo|null>(null);
  const todoHabits   = habits.filter(h=>(weekCounts[h.id]??0)<h.targetDaysPerWeek);
  const doneHabits   = habits.filter(h=>(weekCounts[h.id]??0)>=h.targetDaysPerWeek);
  const todoCards:BoardCard[]  = [...todoHabits.map(h=>({kind:"habit" as const,habit:h})), ...sprintIssues.filter(i=>["backlog","todo"].includes(i.status)).map(i=>({kind:"issue" as const,issue:i}))];
  const inProgCards:BoardCard[] = sprintIssues.filter(i=>["in_progress","in_review"].includes(i.status)).map(i=>({kind:"issue" as const,issue:i}));
  const doneCards:BoardCard[]  = [...doneHabits.map(h=>({kind:"habit" as const,habit:h})), ...sprintIssues.filter(i=>DONE_STATUSES.includes(i.status)).map(i=>({kind:"issue" as const,issue:i}))];
  const colProps = {weekCounts,todayLogs,onRequestDone,onStatusChange,dragging,setDragging};
  const isEmpty = sprintIssues.length===0 && habits.length===0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{sprintIssues.length} tickets · {habits.length} habits</p>
        <button onClick={onPlanSprint} className="text-xs font-medium text-primary hover:underline">Plan sprint →</button>
      </div>
      {isEmpty ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center space-y-2">
          <p className="text-sm font-medium">Board is empty</p>
          <p className="text-xs text-muted-foreground">Add habits or <button onClick={onPlanSprint} className="text-primary hover:underline">plan your sprint →</button></p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KanbanColumn title="Todo"        color="#6366f1" columnKey="todo"        cards={todoCards}    {...colProps} />
          <KanbanColumn title="In Progress" color="#f59e0b" columnKey="in_progress" cards={inProgCards}  {...colProps} />
          <KanbanColumn title="Done"        color="#10b981" columnKey="done"        cards={doneCards}    {...colProps} />
        </div>
      )}
    </div>
  );
}

// ─── Analytics ────────────────────────────────────────────────────────────────

function ActivityCalendar({ habitLogs, workouts, totalHabits }: {
  habitLogs:HabitLogDay[]; workouts:WorkoutDay[]; totalHabits:number;
}) {
  const today = dateStr(new Date());
  const habitMap = useMemo(()=>Object.fromEntries(habitLogs.map(l=>[l.date,l.completed])),[habitLogs]);
  const workoutSet = useMemo(()=>new Set(workouts.map(w=>w.date)),[workouts]);
  const weeks = useMemo(()=>{
    const start=new Date(); start.setDate(start.getDate()-364); start.setDate(start.getDate()-start.getDay());
    const grid:string[][]=[], cur=new Date(start), end=new Date(); end.setDate(end.getDate()-end.getDay()+6);
    while(cur<=end){const week:string[]=[];for(let d=0;d<7;d++){week.push(dateStr(new Date(cur)));cur.setDate(cur.getDate()+1);}grid.push(week);}
    return grid;
  },[]);
  const LEVELS=["bg-muted/50","bg-violet-900/50","bg-violet-700/60","bg-violet-500/70","bg-violet-400"];
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <div className="flex gap-[3px] min-w-max">
          {weeks.map((week,wi)=>(
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map(date=>{
                const isFuture=date>today, completed=habitMap[date]??0, isWorkout=workoutSet.has(date);
                let level=0;
                if(!isFuture&&totalHabits>0&&completed>0){const r=completed/totalHabits;level=r>=.75?4:r>=.5?3:r>=.25?2:1;}
                return <div key={date} title={`${date}${completed?` · ${completed} habits`:""}${isWorkout?" · workout":""}`}
                  className={`h-[11px] w-[11px] rounded-[2px] ${isFuture?"bg-muted/20":LEVELS[level]} ${isWorkout?"ring-1 ring-emerald-400/70":""}`}/>;
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground">Less</span>
        {LEVELS.map((cls,i)=><div key={i} className={`h-2.5 w-2.5 rounded-[2px] ${cls}`}/>)}
        <span className="text-[10px] text-muted-foreground">More</span>
        <div className="ml-2 h-2.5 w-2.5 rounded-[2px] bg-muted/50 ring-1 ring-emerald-400/70"/>
        <span className="text-[10px] text-muted-foreground">Workout</span>
      </div>
    </div>
  );
}

function TicketStats({ allIssues }: { allIssues: AnyIssue[] }) {
  const total=allIssues.length, completed=allIssues.filter(i=>i.status==="done").length, cancelled=allIssues.filter(i=>i.status==="cancelled").length, active=total-completed-cancelled;
  if (total===0) return <p className="text-xs text-muted-foreground italic">No tickets yet.</p>;
  const data=[{label:"Active",count:active,color:"#6366f1"},{label:"Completed",count:completed,color:"#10b981"},{label:"Cancelled",count:cancelled,color:"#f43f5e"}];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {data.map(({label,count,color})=>(
          <HoverCard key={label} color={color} className="p-3 text-center">
            <p className="text-xl font-bold" style={{color}}>{count}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
          </HoverCard>
        ))}
      </div>
      <div className="h-2 w-full rounded-full overflow-hidden flex gap-0.5">
        {data.map(({count,color})=>total>0&&count>0&&(
          <div key={color} className="h-full rounded-full transition-all" style={{width:`${(count/total)*100}%`,backgroundColor:color}}/>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">{total} total · {Math.round((completed/total)*100)}% completion rate</p>
    </div>
  );
}

function AnalyticsContent({ habitLogs, workouts, sprintIssues, allIssues, totalHabits }: {
  habitLogs:HabitLogDay[]; workouts:WorkoutDay[]; sprintIssues:AnyIssue[]; allIssues:AnyIssue[]; totalHabits:number;
}) {
  const last30 = useMemo(()=>{
    const map=Object.fromEntries(habitLogs.map(l=>[l.date,l.completed]));
    return Array.from({length:30},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(29-i));const date=dateStr(d);return{date:`${d.getMonth()+1}/${d.getDate()}`,pct:totalHabits>0?Math.round(((map[date]??0)/totalHabits)*100):0};});
  },[habitLogs,totalHabits]);
  const tasksByWeek = useMemo(()=>{
    const done=sprintIssues.filter(i=>i.status==="done"&&i.completedAt), map:Record<string,number>={};
    done.forEach(i=>{const d=new Date(i.completedAt!),sun=new Date(d);sun.setDate(d.getDate()-d.getDay());const key=`${sun.getMonth()+1}/${sun.getDate()}`;map[key]=(map[key]??0)+1;});
    return Object.entries(map).slice(-8).map(([week,count])=>({week,count}));
  },[sprintIssues]);

  return (
    <div className="space-y-6">
      <div><p className="text-xs text-muted-foreground mb-2">Habit completion · past year</p><ActivityCalendar habitLogs={habitLogs} workouts={workouts} totalHabits={totalHabits}/></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <p className="text-xs text-muted-foreground mb-2">Habit % · last 30 days</p>
          {totalHabits===0?<p className="text-xs text-muted-foreground italic">No habits yet.</p>:(
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={last30}><XAxis dataKey="date" tick={{fontSize:9}} interval={6}/><YAxis domain={[0,100]} tick={{fontSize:9}} unit="%" width={30}/><Tooltip formatter={v=>[`${v}%`,"Completion"]}/><Line type="monotone" dataKey="pct" stroke="#8b5cf6" dot={false} strokeWidth={2}/></LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-2">Tickets completed · by week</p>
          {tasksByWeek.length===0?<p className="text-xs text-muted-foreground italic">No completed tickets yet.</p>:(
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={tasksByWeek}><XAxis dataKey="week" tick={{fontSize:9}}/><YAxis tick={{fontSize:9}} width={20} allowDecimals={false}/><Tooltip/><Bar dataKey="count" fill="#6366f1" radius={[3,3,0,0]}/></BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
      <div><p className="text-xs text-muted-foreground mb-2">Ticket overview · all time</p><TicketStats allIssues={allIssues}/></div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const today = localToday();
  const [mood, setMood]               = useState<{moodScore:number}|null>(null);
  const [habits, setHabits]           = useState<Habit[]>([]);
  const [todayLogs, setTodayLogs]     = useState<HabitLog[]>([]);
  const [weekCounts, setWeekCounts]   = useState<Record<number,number>>({});
  const [sprintIssues, setSprintIssues] = useState<AnyIssue[]>([]);
  const [allIssues, setAllIssues]     = useState<AnyIssue[]>([]);
  const [habitLogs, setHabitLogs]     = useState<HabitLogDay[]>([]);
  const [workouts, setWorkouts]       = useState<WorkoutDay[]>([]);
  const [loading, setLoading]         = useState(true);
  const [sprintOpen, setSprintOpen]   = useState(false);
  const [pendingDone, setPendingDone] = useState<PendingDone|null>(null);
  const sprintIds = useMemo(()=>new Set(sprintIssues.map(i=>i.id)),[sprintIssues]);

  useEffect(()=>{
    async function load(){
      try{
        const safe=(r:Response)=>r.ok?r.json():Promise.resolve(null);
        const [moodData,habitsData,sprintData,logsData,workoutsData,weekData,allIssuesData]=await Promise.all([
          fetch(`/api/mood?date=${today}`).then(safe),
          fetch("/api/habits").then(safe),
          fetch("/api/issues?sprint=true").then(safe),
          fetch("/api/habits/logs").then(safe),
          fetch("/api/fitness/sessions").then(safe),
          fetch("/api/habits/logs/week").then(safe),
          fetch("/api/issues?all=true").then(safe),
        ]);
        setMood(moodData?.moodScore?moodData:null);
        const h:Habit[]=Array.isArray(habitsData)?habitsData:[];
        setHabits(h);
        setSprintIssues(Array.isArray(sprintData)?sprintData:[]);
        setAllIssues(Array.isArray(allIssuesData)?allIssuesData:[]);
        setHabitLogs(Array.isArray(logsData)?logsData:[]);
        setWorkouts(Array.isArray(workoutsData)?workoutsData:[]);
        const wc:Record<number,number>={};
        (Array.isArray(weekData)?weekData:[]).forEach((r:WeekCount)=>{wc[r.habitId]=r.doneThisWeek;});
        setWeekCounts(wc);
        if(h.length>0){
          const logs=await Promise.all(h.map((hb:Habit)=>fetch(`/api/habits/${hb.id}/log`).then(safe)));
          setTodayLogs(logs.flat().filter((l:HabitLog|null)=>l?.date===today) as HabitLog[]);
        }
      }catch(err){console.error("Dashboard load error:",err);}
      finally{setLoading(false);}
    }
    load();
  },[today]);

  async function changeIssueStatus(id:number,status:string){
    await fetch(`/api/issues/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status})});
    setSprintIssues(p=>p.map(i=>i.id===id?{...i,status}:i));
    setAllIssues(p=>p.map(i=>i.id===id?{...i,status}:i));
  }
  async function markHabitDone(habitId:number,logStatus:"completed"|"skipped"){
    const completed=logStatus==="completed";
    await fetch(`/api/habits/${habitId}/log`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({date:today,completed,logStatus})});
    if(completed) setWeekCounts(p=>({...p,[habitId]:(p[habitId]??0)+1}));
    setTodayLogs(p=>{const exists=p.find(l=>l.habitId===habitId&&l.date===today);const entry:HabitLog={habitId,date:today,completed,logStatus};return exists?p.map(l=>l.habitId===habitId&&l.date===today?entry:l):[...p,entry];});
  }
  function confirmDone(choice:"completed"|"cancelled"){
    if(!pendingDone) return;
    if(pendingDone.type==="issue") changeIssueStatus(pendingDone.id,choice==="completed"?"done":"cancelled");
    else markHabitDone(pendingDone.id,choice==="completed"?"completed":"skipped");
    setPendingDone(null);
  }
  async function toggleSprint(id:number,inSprint:boolean){
    await fetch(`/api/issues/${id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({inSprint})});
    if(inSprint){const data=await fetch("/api/issues").then(r=>r.json());const issue=(Array.isArray(data)?data:[]).find((i:AnyIssue)=>i.id===id);if(issue)setSprintIssues(p=>[...p,{...issue,inSprint:true}]);}
    else setSprintIssues(p=>p.filter(i=>i.id!==id));
  }

  const now=new Date(), startOfYear=new Date(now.getFullYear(),0,0);
  const dayOfYear=Math.floor((now.getTime()-startOfYear.getTime())/86400000);
  const daysLeft=365-dayOfYear;
  const doneToday=todayLogs.filter(l=>l.completed).length;

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 md:pl-6">

        {/* Hero */}
        <div className="space-y-3 pt-10 md:pt-0">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{getGreeting()}</h1>
              <p className="text-muted-foreground mt-1">
                {now.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-2xl font-bold text-primary">{daysLeft}</p>
              <p className="text-xs text-muted-foreground">days left in {now.getFullYear()}</p>
            </div>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
              style={{width:`${(dayOfYear/365)*100}%`}}/>
          </div>
          <p className="text-xs text-muted-foreground">Day {dayOfYear} of 365 — {Math.round((dayOfYear/365)*100)}% through the year</p>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({length:7}).map((_,i)=><div key={i} className="h-24 rounded-2xl bg-muted animate-pulse"/>)}
            </div>
            <div className="h-64 rounded-2xl bg-muted animate-pulse"/>
          </div>
        ) : (
          <>
            {/* Glance grid — replaces both the strip and the bottom tiles */}
            <GlanceGrid mood={mood} doneToday={doneToday} totalHabits={habits.length} workouts={workouts} allIssues={allIssues}/>

            {/* Board */}
            <CollapsibleSection id="board" title="Board" icon={<LayoutDashboard className="h-4 w-4 text-violet-400"/>}>
              <BoardContent
                habits={habits} weekCounts={weekCounts} todayLogs={todayLogs}
                sprintIssues={sprintIssues} onRequestDone={setPendingDone}
                onStatusChange={changeIssueStatus} onPlanSprint={()=>setSprintOpen(true)}
              />
            </CollapsibleSection>

            <div className="border-t border-border"/>

            {/* Analytics */}
            <CollapsibleSection id="analytics" title="Analytics" icon={<BarChart2 className="h-4 w-4 text-indigo-400"/>}>
              <AnalyticsContent habitLogs={habitLogs} workouts={workouts} sprintIssues={sprintIssues} allIssues={allIssues} totalHabits={habits.length}/>
            </CollapsibleSection>
          </>
        )}
      </div>

      <SprintDrawer open={sprintOpen} onClose={()=>setSprintOpen(false)} sprintIds={sprintIds} onToggle={toggleSprint}/>
      {pendingDone && <DoneModal pending={pendingDone} onConfirm={confirmDone} onCancel={()=>setPendingDone(null)}/>}
    </>
  );
}
