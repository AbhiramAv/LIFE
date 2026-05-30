# Fitness Tabs Redesign — Progress & Muscles

Date: 2026-05-30  
Status: Approved

---

## Problem

**Progress tab:** Exercise selection is a native `<select>` dropdown — users must scroll through a flat alphabetical list of all logged exercises. No category context, no visual grouping.

**Muscles tab:** Each muscle row shows raw total volume (e.g. `1440kg`) alongside set count and "X days ago". The volume number is confusing — it's sets × reps × weight, which means nothing without context. Layout is a flat sorted list with no recovery signal hierarchy.

---

## Progress Tab — Exercise Picker Redesign

### Design

Replace the `<select>` with a chip-based picker grouped by category.

**Structure:**
- All logged exercises rendered as tappable chips
- Grouped under labelled category headers: Push · Pull · Legs · Core · Other
- Active exercise chip is highlighted (primary color background)
- Category header uses the existing `CAT_COLOR` per category
- No search needed — the logged exercise set is small (typically <20)

**Behavior:**
- On mount, auto-select the first logged exercise (same as today)
- Tapping a chip sets `selectedId` and triggers the chart/summary load
- If no exercises logged, show the existing empty state

**Data:** No API change needed. `/api/fitness/exercises?logged=true` already returns `{ id, name, category, muscleGroups, equipmentType }`.

---

## Muscles Tab — Combined Redesign

### Design

Three layers stacked vertically:

#### 1. Recovery Overview Grid (top)
- 4-column compact tile grid showing all muscles with data in the window
- Each tile: muscle name + "Today / Yesterday / Xd ago" label
- Border + background color driven by freshness:
  - Green (`#10b981`) — trained today or yesterday
  - Amber (`#f59e0b`) — 2–4 days ago
  - Red (`#f43f5e`) — 5+ days ago
- Muscles with no data in the window: shown as grayed-out tiles (opacity 0.45), label "—"
- Purpose: one-glance full-body recovery status

#### 2. "Needs Training" section
- Muscles where `daysAgo >= 5` (red freshness threshold)
- Section header: red dot + "Needs Training" label
- Sorted by `daysAgo` descending (most stale first)

#### 3. "Well Trained" section
- Muscles where `daysAgo < 5`
- Section header: green dot + "Well Trained" label
- Sorted by `daysAgo` ascending (most recent first)

#### Each muscle row (both sections)
- Colored left dot (by `CAT_COLOR[category]`)
- Muscle name + category label
- Freshness badge (right-aligned, color-coded)
- Three stats row:
  - **Sets** — raw set count
  - **Avg load** — `Math.round(volume / sets)` kg — replaces confusing raw volume
  - **Volume** — total kg, shown in muted color as secondary info
- Thin color bar showing sets relative to `maxSets` (existing pattern)

### API change
The muscles API response already returns `{ muscle, category, sets, volume, sessions, lastTrained }`. No backend change needed — `avgLoad` is computed client-side as `Math.round(volume / sets)`.

---

## Implementation Scope

Files to change:
- `app/fitness/page.tsx` — `ProgressTab` component (lines ~1944–1960) and `MusclesTab` component (lines ~2039–2088)

No API changes required for either feature.

---

## Out of Scope

- Clicking a muscle row to drill into per-muscle progress chart (future)
- Search within the progress exercise picker (not needed given small logged set)
- Sorting/filtering the muscles grid (time window toggle already covers this)
