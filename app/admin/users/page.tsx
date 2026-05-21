"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Pencil, Trash2, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type UserRow = {
  id: string; email: string; name: string | null; role: string;
  createdAt: string; lastSeen: string;
  habitCount: number; projectCount: number; moodCount: number;
};

const ROLES = ["user", "dev", "admin"];

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-rose-500/15 text-rose-400 border border-rose-500/20",
  dev:   "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  user:  "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Modals ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AddUserModal({ onClose, onAdded }: { onClose: () => void; onAdded: (u: UserRow) => void }) {
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole]         = useState("user");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Failed"); setLoading(false); return; }
    // Re-fetch to get full row with counts
    const users = await fetch("/api/admin/users").then(r => r.json());
    const added = users.find((u: UserRow) => u.id === json.id);
    if (added) onAdded(added);
    onClose();
  }

  return (
    <Modal title="Add user" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Input placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
        <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <Input type="password" placeholder="Password (min 6 chars)" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
        <select
          value={role} onChange={e => setRole(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none"
        >
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {error && <p className="text-xs text-rose-400">{error}</p>}
        <div className="flex gap-2 justify-end pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditUserModal({ user, onClose, onSaved }: { user: UserRow; onClose: () => void; onSaved: (u: UserRow) => void }) {
  const [name, setName]   = useState(user.name ?? "");
  const [email, setEmail] = useState(user.email);
  const [role, setRole]   = useState(user.role);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const body: Record<string, string> = {};
    if (name !== (user.name ?? "")) body.name = name;
    if (email !== user.email) body.email = email;
    if (role !== user.role) body.role = role;
    if (Object.keys(body).length === 0) { onClose(); return; }

    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Failed"); setLoading(false); return; }
    onSaved({ ...user, name: name || null, email, role });
    onClose();
  }

  return (
    <Modal title="Edit user" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Name</label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Email</label>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Role</label>
          <select
            value={role} onChange={e => setRole(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none"
          >
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        {error && <p className="text-xs text-rose-400">{error}</p>}
        <div className="flex gap-2 justify-end pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="h-3.5 w-3.5 mr-1" />Save</>}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteModal({ user, onClose, onDeleted }: { user: UserRow; onClose: () => void; onDeleted: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function confirm() {
    setLoading(true); setError("");
    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json();
      setError(json.error ?? "Failed");
      setLoading(false); return;
    }
    onDeleted();
    onClose();
  }

  return (
    <Modal title="Delete user" onClose={onClose}>
      <p className="text-sm text-muted-foreground">
        Permanently delete <strong className="text-foreground">{user.email}</strong>? This cannot be undone.
      </p>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="destructive" size="sm" onClick={confirm} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Trash2 className="h-3.5 w-3.5 mr-1" />Delete</>}
        </Button>
      </div>
    </Modal>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const [users, setUsers]       = useState<UserRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [editing, setEditing]   = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState<UserRow | null>(null);

  useEffect(() => {
    fetch("/api/admin/users").then(r => r.json()).then(data => {
      setUsers(data);
      setLoading(false);
    });
  }, []);

  const totalHabits   = users.reduce((s, u) => s + u.habitCount,   0);
  const totalProjects = users.reduce((s, u) => s + u.projectCount, 0);
  const totalMood     = users.reduce((s, u) => s + u.moodCount,    0);

  return (
    <div className="space-y-8">
      {showAdd && (
        <AddUserModal
          onClose={() => setShowAdd(false)}
          onAdded={u => setUsers(prev => [...prev, u])}
        />
      )}
      {editing && (
        <EditUserModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={updated => setUsers(prev => prev.map(u => u.id === updated.id ? updated : u))}
        />
      )}
      {deleting && (
        <DeleteModal
          user={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => setUsers(prev => prev.filter(u => u.id !== deleting.id))}
        />
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{users.length} accounts</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add user
        </Button>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total users",    value: users.length,   color: "#8b5cf6" },
          { label: "Habits created", value: totalHabits,    color: "#10b981" },
          { label: "Projects",       value: totalProjects,  color: "#0ea5e9" },
          { label: "Mood entries",   value: totalMood,      color: "#f43f5e" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-2xl font-bold" style={{ color }}>{loading ? "—" : value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              {["User", "Name", "Role", "Habits", "Projects", "Mood", "Last seen", "Joined", ""].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 3 }, (_, i) => (
                <tr key={i}>
                  {Array.from({ length: 9 }, (_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 rounded bg-muted animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground text-xs">No users yet</td>
              </tr>
            ) : users.map(u => (
              <tr key={u.id} className="hover:bg-muted/30 transition-colors group">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-[11px] font-bold text-primary uppercase shrink-0">
                      {(u.name || u.email)[0]}
                    </div>
                    <span className="text-xs font-medium truncate max-w-[140px]">{u.email}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{u.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] ?? ROLE_COLORS.user}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground text-center">{u.habitCount}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground text-center">{u.projectCount}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground text-center">{u.moodCount}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{timeAgo(u.lastSeen)}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditing(u)}
                      className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleting(u)}
                      className="p-1.5 rounded-md hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
