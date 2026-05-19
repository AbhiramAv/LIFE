"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Plus, Circle, CheckCircle2, MoreHorizontal,
  Layers, Award, Briefcase, User, Trash2, Calendar,
  AlignLeft, Tag, Flag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Project, Issue, IssueStatus, IssuePriority, ProjectCategory,
  STATUS_CONFIG, STATUS_ORDER, PRIORITY_CONFIG, CATEGORY_CONFIG,
} from "@/lib/types/goals";

const CATEGORY_ICONS: Record<ProjectCategory, React.ElementType> = {
  project: Layers,
  certification: Award,
  career: Briefcase,
  personal: User,
};

const STATUS_ICONS: Record<IssueStatus, React.ElementType> = {
  backlog: Circle,
  todo: Circle,
  in_progress: Circle,
  in_review: Circle,
  done: CheckCircle2,
  cancelled: Circle,
};

// ─── Issue row ────────────────────────────────────────────────────────────────

function IssueRow({
  issue,
  onStatusCycle,
  onClick,
}: {
  issue: Issue;
  onStatusCycle: (id: number, next: IssueStatus) => void;
  onClick: (issue: Issue) => void;
}) {
  const cfg = STATUS_CONFIG[issue.status];
  const pri = PRIORITY_CONFIG[issue.priority];
  const Icon = STATUS_ICONS[issue.status];

  const dueSoon = issue.dueDate
    ? Math.ceil((new Date(issue.dueDate + "T12:00:00").getTime() - Date.now()) / 86400000)
    : null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 group cursor-pointer transition-colors">
      {/* Status cycle button */}
      <button
        onClick={(e) => { e.stopPropagation(); onStatusCycle(issue.id, cfg.next); }}
        className="shrink-0 transition-transform hover:scale-110"
        style={{ color: cfg.color }}
        title={`Status: ${cfg.label} → click to advance`}
      >
        <Icon
          className="h-4 w-4"
          fill={issue.status === "done" ? cfg.color : "none"}
          strokeWidth={issue.status === "done" ? 0 : 2}
        />
      </button>

      {/* Priority dot */}
      <span
        className="h-2 w-2 rounded-full shrink-0"
        style={{ backgroundColor: pri.color }}
        title={`Priority: ${pri.label}`}
      />

      {/* Title */}
      <span
        className={`flex-1 text-sm min-w-0 truncate ${issue.status === "done" || issue.status === "cancelled" ? "line-through text-muted-foreground" : ""}`}
        onClick={() => onClick(issue)}
      >
        {issue.title}
      </span>

      {/* Metadata */}
      <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {issue.label && (
          <Badge variant="outline" className="text-[10px] py-0 h-5">{issue.label}</Badge>
        )}
        {dueSoon !== null && (
          <span className={`text-[11px] font-medium ${dueSoon < 0 ? "text-rose-400" : dueSoon < 7 ? "text-amber-400" : "text-muted-foreground"}`}>
            {dueSoon < 0 ? `${Math.abs(dueSoon)}d overdue` : dueSoon === 0 ? "Due today" : `${dueSoon}d`}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Inline add ───────────────────────────────────────────────────────────────

function InlineAdd({ onAdd }: { onAdd: (title: string) => void }) {
  const [active, setActive] = useState(false);
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  function commit() {
    if (value.trim()) onAdd(value.trim());
    setValue("");
    setActive(false);
  }

  if (!active) {
    return (
      <button
        onClick={() => { setActive(true); setTimeout(() => ref.current?.focus(), 0); }}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <Plus className="h-3.5 w-3.5" /> Add issue
      </button>
    );
  }

  return (
    <div className="px-3 py-1.5">
      <Input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Issue title..."
        className="h-7 text-sm"
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setValue(""); setActive(false); }
        }}
        onBlur={() => { if (!value.trim()) setActive(false); }}
      />
    </div>
  );
}

// ─── Status group ─────────────────────────────────────────────────────────────

function StatusGroup({
  status,
  issues,
  onStatusCycle,
  onIssueClick,
  onAdd,
}: {
  status: IssueStatus;
  issues: Issue[];
  onStatusCycle: (id: number, next: IssueStatus) => void;
  onIssueClick: (issue: Issue) => void;
  onAdd: (title: string, status: IssueStatus) => void;
}) {
  const [open, setOpen] = useState(status !== "done" && status !== "cancelled");
  const cfg = STATUS_CONFIG[status];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full px-3 py-2.5 hover:bg-muted/40 transition-colors"
      >
        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
        <span className="text-xs font-semibold">{cfg.label}</span>
        <span className="text-xs text-muted-foreground ml-1">{issues.length}</span>
        <svg
          className={`h-3.5 w-3.5 text-muted-foreground ml-auto transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-border">
          {issues.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground/60 italic">No issues</p>
          )}
          {issues.map((issue) => (
            <IssueRow
              key={issue.id}
              issue={issue}
              onStatusCycle={onStatusCycle}
              onClick={onIssueClick}
            />
          ))}
          <InlineAdd onAdd={(title) => onAdd(title, status)} />
        </div>
      )}
    </div>
  );
}

// ─── Issue detail dialog ───────────────────────────────────────────────────────

function IssueDetailDialog({
  issue,
  onClose,
  onUpdate,
  onDelete,
}: {
  issue: Issue | null;
  onClose: () => void;
  onUpdate: (id: number, patch: Partial<Issue>) => void;
  onDelete: (id: number) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<IssuePriority>("none");
  const [label, setLabel] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (issue) {
      setTitle(issue.title);
      setDescription(issue.description ?? "");
      setPriority(issue.priority);
      setLabel(issue.label ?? "");
      setDueDate(issue.dueDate ?? "");
    }
  }, [issue]);

  if (!issue) return null;

  async function save(field: Partial<Issue>) {
    if (!issue) return;
    setSaving(true);
    await fetch(`/api/issues/${issue.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(field),
    });
    onUpdate(issue.id, field);
    setSaving(false);
  }

  async function handleDelete() {
    if (!issue) return;
    await fetch(`/api/issues/${issue.id}`, { method: "DELETE" });
    onDelete(issue.id);
    onClose();
  }

  const statusCfg = STATUS_CONFIG[issue.status];

  return (
    <Dialog open={!!issue} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="sr-only">Issue detail</DialogTitle>
        </DialogHeader>

        {/* Status badge + delete */}
        <div className="flex items-center justify-between mb-1">
          <span
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full"
            style={{ backgroundColor: `${statusCfg.color}22`, color: statusCfg.color }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusCfg.color }} />
            {statusCfg.label}
          </span>
          <button
            onClick={handleDelete}
            className="text-muted-foreground hover:text-rose-400 transition-colors p-1 rounded"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Title */}
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => { if (title.trim() && title !== issue.title) save({ title: title.trim() }); }}
          className="text-base font-semibold border-none px-0 focus-visible:ring-0 shadow-none"
          placeholder="Issue title..."
        />

        {/* Description */}
        <div className="flex items-start gap-2 mt-1">
          <AlignLeft className="h-4 w-4 text-muted-foreground mt-1.5 shrink-0" />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => { if (description !== (issue.description ?? "")) save({ description: description || null }); }}
            placeholder="Add a description..."
            className="resize-none border-none px-0 focus-visible:ring-0 shadow-none text-sm min-h-[80px]"
          />
        </div>

        {/* Metadata row */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Flag className="h-3.5 w-3.5" /> Priority
            </div>
            <Select
              value={priority}
              onValueChange={(v) => { setPriority(v as IssuePriority); save({ priority: v as IssuePriority }); }}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PRIORITY_CONFIG) as IssuePriority[]).map((p) => (
                  <SelectItem key={p} value={p} className="text-xs">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PRIORITY_CONFIG[p].color }} />
                      {PRIORITY_CONFIG[p].label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" /> Due date
            </div>
            <Input
              type="date"
              value={dueDate}
              className="h-8 text-xs"
              onChange={(e) => setDueDate(e.target.value)}
              onBlur={() => save({ dueDate: dueDate || null })}
            />
          </div>
        </div>

        <div className="space-y-1 mt-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Tag className="h-3.5 w-3.5" /> Label
          </div>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => save({ label: label || null })}
            placeholder="e.g. bug, feature, docs..."
            className="h-8 text-xs"
          />
        </div>

        {saving && <p className="text-xs text-muted-foreground mt-1">Saving...</p>}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/projects/${id}`).then((r) => r.json()),
      fetch(`/api/projects/${id}/issues`).then((r) => r.json()),
    ]).then(([proj, iss]) => {
      setProject(proj);
      setIssues(iss);
      setLoading(false);
    });
  }, [id]);

  async function cycleStatus(issueId: number, next: IssueStatus) {
    await fetch(`/api/issues/${issueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, status: next } : i))
    );
    if (selectedIssue?.id === issueId) {
      setSelectedIssue((prev) => prev ? { ...prev, status: next } : prev);
    }
  }

  async function addIssue(title: string, status: IssueStatus) {
    const res = await fetch(`/api/projects/${id}/issues`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, status }),
    });
    const issue = await res.json();
    setIssues((prev) => [...prev, issue]);
  }

  function updateIssue(issueId: number, patch: Partial<Issue>) {
    setIssues((prev) => prev.map((i) => (i.id === issueId ? { ...i, ...patch } : i)));
  }

  function deleteIssue(issueId: number) {
    setIssues((prev) => prev.filter((i) => i.id !== issueId));
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center space-y-2">
        <p className="font-medium">Project not found</p>
        <Link href="/goals" className="text-sm text-muted-foreground hover:text-foreground">← Back to goals</Link>
      </div>
    );
  }

  const Icon = CATEGORY_ICONS[project.category];
  const totalIssues = issues.length;
  const doneIssues = issues.filter((i) => i.status === "done").length;
  const progress = totalIssues > 0 ? Math.round((doneIssues / totalIssues) * 100) : 0;
  const daysLeft = project.targetDate
    ? Math.ceil((new Date(project.targetDate + "T12:00:00").getTime() - Date.now()) / 86400000)
    : null;

  const grouped = STATUS_ORDER.reduce<Record<IssueStatus, Issue[]>>(
    (acc, s) => { acc[s] = issues.filter((i) => i.status === s); return acc; },
    {} as Record<IssueStatus, Issue[]>
  );

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Back */}
        <Link
          href="/goals"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Goals
        </Link>

        {/* Project header */}
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${project.color}22`, color: project.color }}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold tracking-tight">{project.title}</h1>
              <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                <span className="text-xs text-muted-foreground">{CATEGORY_CONFIG[project.category].label}</span>
                {daysLeft !== null && (
                  <span className={`text-xs font-medium ${daysLeft < 7 ? "text-rose-400" : daysLeft < 30 ? "text-amber-400" : "text-muted-foreground"}`}>
                    {daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? "Due today" : `${Math.abs(daysLeft)}d overdue`}
                  </span>
                )}
                {project.status !== "active" && (
                  <Badge variant="secondary" className="text-[10px] capitalize">{project.status}</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-1.5">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, backgroundColor: project.color }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{doneIssues}/{totalIssues} done</span>
              <span className="text-xs font-semibold" style={{ color: project.color }}>{progress}%</span>
            </div>
          </div>
        </div>

        {/* Issue groups */}
        <div className="space-y-2">
          {STATUS_ORDER.map((status) => (
            <StatusGroup
              key={status}
              status={status}
              issues={grouped[status]}
              onStatusCycle={cycleStatus}
              onIssueClick={setSelectedIssue}
              onAdd={addIssue}
            />
          ))}
        </div>
      </div>

      {/* Issue detail dialog */}
      <IssueDetailDialog
        issue={selectedIssue}
        onClose={() => setSelectedIssue(null)}
        onUpdate={updateIssue}
        onDelete={deleteIssue}
      />
    </>
  );
}
