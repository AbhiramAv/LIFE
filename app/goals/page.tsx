"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, X, ArrowRight, Layers, Award, Briefcase, User, Trash2, Upload } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Project, ProjectCategory, ProjectStatus,
  CATEGORY_CONFIG, PROJECT_COLORS,
} from "@/lib/types/goals";

const CATEGORY_ICONS: Record<ProjectCategory, React.ElementType> = {
  project:      Layers,
  certification: Award,
  career:       Briefcase,
  personal:     User,
};

function NewProjectForm({ onCreated }: { onCreated: (p: Project) => void }) {
  const [title, setTitle]       = useState("");
  const [category, setCategory] = useState<ProjectCategory>("project");
  const [color, setColor]       = useState(PROJECT_COLORS[0]);
  const [targetDate, setTargetDate] = useState("");
  const [saving, setSaving]     = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), category, color, targetDate: targetDate || null }),
    });
    const p = await res.json();
    onCreated({ ...p, totalIssues: 0, doneIssues: 0 });
    setTitle(""); setSaving(false);
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-border bg-card p-4 space-y-4">
      <p className="text-sm font-semibold">New project</p>

      <Input
        placeholder="Project title..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoFocus
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Category</p>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(CATEGORY_CONFIG) as ProjectCategory[]).map((cat) => {
              const Icon = CATEGORY_ICONS[cat];
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    category === cat
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {CATEGORY_CONFIG[cat].label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Color</p>
          <div className="flex flex-wrap gap-1.5">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="h-6 w-6 rounded-full transition-all"
                style={{
                  backgroundColor: c,
                  transform: color === c ? "scale(1.25)" : "scale(1)",
                  boxShadow: color === c ? `0 0 0 2px var(--background), 0 0 0 3.5px ${c}` : "none",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Target date (optional)</p>
        <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
      </div>

      <Button type="submit" size="sm" className="w-full" disabled={saving || !title.trim()}>
        {saving ? "Creating..." : "Create project"}
      </Button>
    </form>
  );
}

function ProjectCard({ project, onDeleted }: { project: Project; onDeleted: (id: number) => void }) {
  const [deleting, setDeleting] = useState(false);
  const progress = project.totalIssues > 0
    ? Math.round((project.doneIssues / project.totalIssues) * 100)
    : 0;
  const Icon = CATEGORY_ICONS[project.category];
  const daysLeft = project.targetDate
    ? Math.ceil((new Date(project.targetDate + "T12:00:00").getTime() - Date.now()) / 86400000)
    : null;

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${project.title}" and all its tasks?`)) return;
    setDeleting(true);
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    onDeleted(project.id);
  }

  return (
    <Link href={`/goals/${project.id}`} className="group block">
      <div className="rounded-xl border border-border bg-card p-4 space-y-3 hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${project.color}22`, color: project.color }}
            >
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{project.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {CATEGORY_CONFIG[project.category].label}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="h-7 w-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-rose-500/15 hover:text-rose-400 text-muted-foreground/40 transition-all"
              title="Delete project"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <ArrowRight className="h-4 w-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all mt-0.5" />
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-1.5">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, backgroundColor: project.color }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              {project.doneIssues}/{project.totalIssues} tasks
            </span>
            {daysLeft !== null && (
              <span className={`text-[11px] font-medium ${daysLeft < 7 ? "text-rose-400" : daysLeft < 30 ? "text-amber-400" : "text-muted-foreground"}`}>
                {daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? "Due today" : `${Math.abs(daysLeft)}d overdue`}
              </span>
            )}
          </div>
        </div>

        {/* Status badge */}
        {project.status !== "active" && (
          <Badge variant="secondary" className="text-[10px] capitalize">{project.status}</Badge>
        )}
      </div>
    </Link>
  );
}

function parseImport(raw: string): { goal: string; tasks: { title: string; priority?: string }[] } | null {
  raw = raw.trim();
  if (!raw) return null;
  // Try JSON
  try {
    const parsed = JSON.parse(raw);
    if (parsed.goal && Array.isArray(parsed.tasks) && parsed.tasks.length > 0) return parsed;
  } catch {}
  // Flexible text/markdown: handles # headings, *, -, numbered lists
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  // Title: first # heading, or very first line
  const headingLine = lines.find((l) => /^#{1,3}\s/.test(l));
  const goal = (headingLine ?? lines[0]).replace(/^#{1,3}\s*/, "").trim();
  // Tasks: - bullets, * bullets, numbered (1. / 1)) — skip heading lines
  const tasks = lines
    .filter((l) => /^[-*]\s/.test(l) || /^\d+[.)]\s/.test(l))
    .map((l) => ({
      title: l
        .replace(/^[-*]\s*(\[[ x]?\]\s*)?/, "")
        .replace(/^\d+[.)]\s*/, "")
        .replace(/\*\*/g, "")
        .trim(),
    }))
    .filter((t) => t.title.length > 0);
  return tasks.length > 0 ? { goal, tasks } : null;
}

function ImportModal({ onImported, onClose }: { onImported: (p: Project) => void; onClose: () => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const preview = text.trim() ? parseImport(text) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!preview) { setError("Could not detect a goal title + task list. See accepted formats below."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/goals/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preview),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Server error — try again."); setSaving(false); return; }
      onImported({ ...data.project, totalIssues: data.issues.length, doneIssues: 0 });
      onClose();
    } catch {
      setError("Network error — check your connection.");
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Import project</p>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <Textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setError(""); }}
          placeholder={"Paste AI output, markdown, or JSON. Accepted formats:\n\n# Project name\n- Task one\n- Task two\n1. Task three\n\nor {\"goal\":\"...\",\"tasks\":[{\"title\":\"...\"}]}"}
          className="font-mono text-xs min-h-[160px]"
          autoFocus
        />

        {/* Live parse preview */}
        {text.trim() && (
          <div className={`rounded-lg px-3 py-2.5 text-xs space-y-0.5 border ${preview ? "bg-emerald-500/8 border-emerald-500/20" : "bg-rose-500/8 border-rose-500/20"}`}>
            {preview ? (
              <>
                <p className="font-semibold text-emerald-400">✓ Ready to import</p>
                <p className="text-muted-foreground">Goal: <span className="text-foreground font-medium">{preview.goal}</span></p>
                <p className="text-muted-foreground">{preview.tasks.length} ticket{preview.tasks.length !== 1 ? "s" : ""} detected</p>
              </>
            ) : (
              <p className="text-rose-400">Could not detect a goal + tasks. Use <code className="bg-muted px-1 rounded"># Title</code> and <code className="bg-muted px-1 rounded">- tasks</code> or numbered lists.</p>
            )}
          </div>
        )}

        {error && <p className="text-xs text-rose-400">{error}</p>}
        <Button type="submit" size="sm" className="w-full" disabled={saving || !preview}>
          {saving ? "Importing..." : `Create project${preview ? ` (${preview.tasks.length} tickets)` : ""}`}
        </Button>
      </form>
    </div>
  );
}

export default function GoalsPage() {
  const [projects, setProjects]   = useState<Project[]>([]);
  const [showForm, setShowForm]   = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    fetch("/api/projects").then((r) => r.json()).then((data) => {
      setProjects(data);
      setLoading(false);
    });
  }, []);

  function removeProject(id: number) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }

  const active    = projects.filter((p) => p.status === "active");
  const completed = projects.filter((p) => p.status === "completed");

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Goals</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {active.length} active · {completed.length} completed
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { setShowImport((s) => !s); setShowForm(false); }}>
            <Upload className="h-4 w-4 mr-1" />Import
          </Button>
          <Button size="sm" onClick={() => { setShowForm((s) => !s); setShowImport(false); }} variant={showForm ? "secondary" : "default"}>
            {showForm ? <><X className="h-4 w-4 mr-1" />Cancel</> : <><Plus className="h-4 w-4 mr-1" />New project</>}
          </Button>
        </div>
      </div>

      {showImport && (
        <ImportModal
          onImported={(p) => { setProjects((prev) => [p, ...prev]); setShowImport(false); }}
          onClose={() => setShowImport(false)}
        />
      )}

      {showForm && <NewProjectForm onCreated={(p) => { setProjects((prev) => [p, ...prev]); setShowForm(false); }} />}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center space-y-2">
          <p className="text-sm font-medium">No projects yet</p>
          <p className="text-xs text-muted-foreground">Create your first project to start tracking tasks</p>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Active</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {active.map((p) => <ProjectCard key={p.id} project={p} onDeleted={removeProject} />)}
              </div>
            </div>
          )}
          {completed.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Completed</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {completed.map((p) => <ProjectCard key={p.id} project={p} onDeleted={removeProject} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
