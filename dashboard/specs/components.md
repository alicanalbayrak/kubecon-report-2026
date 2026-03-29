# Components Specification

This spec covers all non-chart components in `src/components/`.

---

## 1. `src/components/Layout.tsx` -- Theme Wrapper and Page Shell

### Props

```typescript
interface LayoutProps {
  children: React.ReactNode;
}
```

### Behavior

- Wraps the entire application.
- Manages dark/light theme state.
- On mount:
  1. Check `localStorage.getItem("theme")`.
  2. If `"dark"` or `"light"`, use that value.
  3. If absent, check `window.matchMedia("(prefers-color-scheme: dark)").matches`. If true, default to dark; otherwise light.
- When theme state is `"dark"`, add class `"dark"` to the `<html>` element (`document.documentElement.classList`). When `"light"`, remove it.
- Persist to `localStorage.setItem("theme", value)` on every toggle.
- Listen for system preference changes via `matchMedia.addEventListener("change", ...)` -- only if no manual override in localStorage.

### Theme Toggle Button

- Positioned in the top-right of the page header.
- When dark mode: show a **sun icon** (click to switch to light).
- When light mode: show a **moon icon** (click to switch to dark).
- Use inline SVG icons (no icon library dependency). Simple sun (circle + rays) and moon (crescent) paths.
- Button styling: `p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors`.

### Page Structure

```html
<div class="min-h-screen bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 transition-colors">
  <header class="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-gray-200 dark:border-slate-700">
    <div class="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
      <h1 class="text-lg font-bold">KubeCon EU 2026 Dashboard</h1>
      <ThemeToggleButton />
    </div>
  </header>
  <main class="max-w-7xl mx-auto px-4 py-6">
    {children}
  </main>
</div>
```

### Responsive

- Full-width on mobile, max-w-7xl centered on desktop.
- Header is sticky with backdrop blur.
- Padding adjusts: `px-4` on mobile, same on desktop (the max-width constraint handles larger screens).

### Dark/Light Theme Colors Reference

These are used throughout the app:
- **Page background**: `bg-white` / `dark:bg-slate-900`
- **Card background**: `bg-gray-50` / `dark:bg-slate-800`
- **Card border**: `border-gray-200` / `dark:border-slate-700`
- **Primary text**: `text-gray-900` / `dark:text-gray-100`
- **Secondary text**: `text-gray-600` / `dark:text-gray-400`
- **Accent/link**: `text-blue-600` / `dark:text-blue-400`
- **Chart grid lines**: `#e5e7eb` / `#334155` (gray-200 / slate-700)
- **Chart axis text**: `#6b7280` / `#9ca3af` (gray-500 / gray-400)

---

## 2. `src/components/HeroBanner.tsx` -- Conference Info + Stats

### Props

```typescript
interface HeroBannerProps {
  conferenceInfo: ConferenceInfo;
  stats: DashboardStats;
}
```

### Visual Design

- Full-width section at the top of the page, below the header.
- Gradient background: `bg-gradient-to-r from-blue-600 to-purple-600` (same in dark mode, it's a colored banner).
- White text on the gradient.
- Conference title: large, bold (`text-2xl md:text-3xl font-bold text-white`).
- Subtitle: dates + location (`text-blue-100`).
- Below the title, a stats bar with 4 metric cards in a horizontal row.

### Stats Bar

Four stats displayed as a row of cards:

| Stat | Label | Icon suggestion |
|------|-------|-----------------|
| `stats.totalSessions` | Sessions | Calendar icon |
| `stats.uniqueSpeakers` | Speakers | Person icon |
| `stats.trackCount` | Tracks | Grid icon |
| `stats.slidesCount` | Slides | Document icon |

Each stat card:
```html
<div class="bg-white/10 backdrop-blur rounded-lg px-4 py-3 text-center">
  <div class="text-2xl font-bold text-white">{value}</div>
  <div class="text-sm text-blue-100">{label}</div>
</div>
```

### Responsive

- Stats row: `grid grid-cols-2 md:grid-cols-4 gap-3` -- 2 columns on mobile, 4 on desktop.
- Title size reduces on mobile via responsive text classes.

### FilterContext Interaction

- Stats are computed from **source-filtered** events only (not keyword/search filtered).
- The parent (`App.tsx`) should call `computeStats(sourceFilteredEvents)` and pass the result.
- When the source toggle changes, the stats update automatically.

### Edge Cases

- All numbers should be formatted with `toLocaleString()` for readability (e.g., 1,234).

---

## 3. `src/components/SourceToggle.tsx` -- Three-Way Source Filter

### Props

```typescript
interface SourceToggleProps {
  // No props -- reads and writes to FilterContext directly
}
```

### Visual Design

A segmented control / pill toggle with three options:

```
[ All  |  KubeCon Main  |  Co-located ]
```

- Container: `inline-flex rounded-lg bg-gray-100 dark:bg-slate-800 p-1`.
- Each segment: `px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-colors`.
- Active segment: `bg-white dark:bg-slate-600 text-gray-900 dark:text-white shadow-sm`.
- Inactive segment: `text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200`.

### Behavior

- Reads `filters.source` from `useFilter()`.
- On click, dispatches `{ type: "SET_SOURCE", payload: "all" | "main" | "colocated" }`.
- Exactly one segment is active at all times.

### Responsive

- On very small screens (< 360px), text can shrink. Use `text-xs sm:text-sm`.
- The toggle should be centered or left-aligned within its container section.

### Placement

- Rendered just below the HeroBanner, above the charts grid.
- Sits in a row alongside the SearchBar.

---

## 4. `src/components/SearchBar.tsx` -- Full-Text Search Input

### Props

```typescript
interface SearchBarProps {
  // No props -- reads and writes to FilterContext directly
}
```

### Visual Design

```html
<div class="relative flex-1 max-w-md">
  <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
  <input
    type="text"
    placeholder="Search sessions, speakers..."
    class="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-300 dark:border-slate-600
           bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100
           placeholder-gray-400 dark:placeholder-gray-500
           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  />
  {hasValue && <ClearButton class="absolute right-3 top-1/2 -translate-y-1/2" />}
</div>
```

- Search icon (magnifying glass SVG) on the left.
- Clear button (X icon) on the right, only visible when input has text.

### Behavior

- **Debounced**: Use a 300ms debounce before dispatching to FilterContext.
- Maintains local state for the input value (immediate updates for responsive typing).
- After 300ms of no typing, dispatches `{ type: "SET_SEARCH", payload: value }`.
- Clear button sets local value to `""` and immediately dispatches `{ type: "SET_SEARCH", payload: "" }`.
- When `filters.search` is cleared externally (e.g., "Clear All"), sync local input value back to `""`. Use a `useEffect` watching `filters.search`.

### Debounce Implementation

```typescript
const [localValue, setLocalValue] = useState("");
const { filters, dispatch } = useFilter();

useEffect(() => {
  const timer = setTimeout(() => {
    dispatch({ type: "SET_SEARCH", payload: localValue });
  }, 300);
  return () => clearTimeout(timer);
}, [localValue]);

// Sync external clears
useEffect(() => {
  if (filters.search === "" && localValue !== "") {
    setLocalValue("");
  }
}, [filters.search]);
```

### Responsive

- `flex-1 max-w-md` -- grows to fill available space, maxes out at `md` width.
- On mobile, takes full width below the SourceToggle (see App layout).

---

## 5. `src/components/FilterContext.tsx` -- Active Filter Display

This is the **visual component** that displays active filter chips. The context provider itself lives in `src/lib/filters.ts`.

### Props

```typescript
interface ActiveFiltersProps {
  // No props -- reads from FilterContext
}
```

### Visual Design

- Only renders if there are active filters (keyword, component, topic, speaker, or search).
- Horizontal row of chips with a "Clear all" button at the end.

```html
<div class="flex flex-wrap items-center gap-2">
  {activeFilters.map(filter => (
    <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm
                 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
      {filter.label}
      <button onClick={filter.onClear} class="hover:text-blue-600 dark:hover:text-blue-100">
        <XIcon class="w-3.5 h-3.5" />
      </button>
    </span>
  ))}
  <button onClick={clearAll} class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline">
    Clear all
  </button>
</div>
```

### Behavior

- Reads `activeFilters` from `useFilter()`.
- Each chip's X button calls the chip's `onClear` callback.
- "Clear all" dispatches `{ type: "CLEAR_ALL" }`.
- When no filters are active, the component renders nothing (returns `null`).

### Chip Label Format

- Keyword: `"Keyword: {value}"`
- Component: `"Component: {value}"`
- Topic: `"Topic: {value}"`
- Speaker: `"Speaker: {value}"`
- Search: `"Search: {value}"`

### Responsive

- `flex-wrap` ensures chips wrap on narrow screens.
- Sits between the search/toggle row and the charts.

---

## 6. `src/components/SessionList.tsx` -- Filterable Session Cards

**Note**: Despite being listed in the plan under `tables/`, this component renders cards, not a table.

### File location: `src/components/tables/SessionList.tsx`

### Props

```typescript
interface SessionListProps {
  events: Event[];   // already filtered by all active filters
}
```

### Visual Design

- Header row showing count: `"N sessions found"` (or `"N session found"` if 1).
- Cards in a vertical list with spacing.

#### Session Card

```html
<div class="border border-gray-200 dark:border-slate-700 rounded-lg p-4
            bg-white dark:bg-slate-800 hover:shadow-md transition-shadow cursor-pointer">
  <div class="flex items-start justify-between gap-3">
    <div class="flex-1">
      <h3 class="font-semibold text-gray-900 dark:text-gray-100">{event.cleanTitle}</h3>
      <div class="flex flex-wrap gap-2 mt-1.5">
        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                     bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
          {event.type}
        </span>
        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                     bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
          {event.experienceLevel}
        </span>
        {event.source === "colocated" && (
          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                       bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300">
            Co-located
          </span>
        )}
      </div>
    </div>
    <ChevronIcon class="w-5 h-5 text-gray-400 transition-transform"
                 expanded={isExpanded} />
  </div>
  <div class="mt-2 text-sm text-gray-600 dark:text-gray-400">
    <span>{event.dateTime}</span>
    {event.venue && <> &middot; {event.venue}</>}
  </div>
  <div class="mt-1 text-sm text-gray-600 dark:text-gray-400">
    {event.speakerNames.join(", ")}
  </div>

  {isExpanded && (
    <div class="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
      <p class="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
        {event.description || "No description available."}
      </p>
      {event.files.length > 0 && (
        <div class="mt-2">
          <span class="text-sm font-medium">Slides:</span>
          {event.files.map(f => (
            <a href={f.url} target="_blank" class="text-sm text-blue-600 dark:text-blue-400 hover:underline ml-2">
              {f.filename}
            </a>
          ))}
        </div>
      )}
      <a href={event.url} target="_blank" class="inline-block mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline">
        View on sched.com &rarr;
      </a>
    </div>
  )}
</div>
```

### Behavior

- Each card is **click-to-expand**: clicking the card toggles the expanded state for that card.
- Only one card can be expanded at a time (accordion behavior), OR multiple can be open (simpler; use this approach -- independent toggle per card).
- Track expanded state with `useState<Set<string>>` keyed by `event.id`.

### Pagination

- Show 20 sessions per page.
- Simple pagination controls at the bottom: Previous / Next buttons, "Page X of Y" label.
- When filters change, reset to page 1.
- State: `const [page, setPage] = useState(1)`. Slice events: `events.slice((page - 1) * 20, page * 20)`.

```html
<div class="flex items-center justify-between mt-4">
  <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
          class="px-3 py-1.5 rounded border text-sm disabled:opacity-50">
    Previous
  </button>
  <span class="text-sm text-gray-600 dark:text-gray-400">
    Page {page} of {totalPages}
  </span>
  <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
          class="px-3 py-1.5 rounded border text-sm disabled:opacity-50">
    Next
  </button>
</div>
```

### Edge Cases

- **0 results**: Show a message: `"No sessions match the current filters."` with a subtle icon.
- **Empty description**: Show `"No description available."` in the expanded view.
- **No speakers**: Show nothing for the speaker line (some administrative events have no speakers).
- **Long titles**: Allow wrapping; do not truncate.
- **Reset page on filter change**: `useEffect(() => setPage(1), [events.length])` -- or better, depend on a stable hash of the filter state.

### Responsive

- Cards take full width on all screen sizes.
- On mobile, tags stack vertically if needed (`flex-wrap` handles this).
- Pagination controls remain at the bottom.

### FilterContext Interaction

- This component receives the **fully filtered** event list as a prop (filtered by source + keyword + component + topic + speaker + search).
- The parent (`App.tsx`) applies all filters and passes the result.

---

## App.tsx Layout Skeleton

For reference, here is how these components compose in `App.tsx`:

```typescript
function App() {
  const [data, setData] = useState<{ events: Event[]; conferenceInfo: ConferenceInfo } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAllEvents()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;
  if (!data) return null;

  return (
    <FilterProvider>
      <Layout>
        <AppContent data={data} />
      </Layout>
    </FilterProvider>
  );
}

function AppContent({ data }: { data: { events: Event[]; conferenceInfo: ConferenceInfo } }) {
  const { filters } = useFilter();
  const filteredEvents = useFilteredEvents(data.events);

  // Source-only filtered events for stats
  const sourceFiltered = useMemo(() => {
    if (filters.source === "all") return data.events;
    return data.events.filter(e => e.source === filters.source);
  }, [data.events, filters.source]);

  const stats = useMemo(() => computeStats(sourceFiltered), [sourceFiltered]);

  return (
    <>
      <HeroBanner conferenceInfo={data.conferenceInfo} stats={stats} />

      <div class="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-6">
        <SourceToggle />
        <SearchBar />
      </div>

      <ActiveFilters />  {/* the chip display component */}

      {/* Charts Grid */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <TopKeywordsChart events={sourceFiltered} />
        <CNCFComponentsChart events={sourceFiltered} />
        <TrendingTopicsChart events={sourceFiltered} />
        <TrackDistribution events={sourceFiltered} />
        <ExperienceLevelDonut events={sourceFiltered} />
      </div>

      {/* Tables */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <BigramTable events={sourceFiltered} />
        <SpeakerLeaderboard events={sourceFiltered} />
      </div>

      {/* Session List -- fully filtered */}
      <SessionList events={filteredEvents} />
    </>
  );
}
```

**Important**: Charts and tables receive `sourceFiltered` events (filtered only by the source toggle), NOT the fully filtered events. This way, charts always show the full picture for the selected source. The session list is the only component that reflects ALL active filters (keyword, component, topic, speaker, search).

### Loading State

Show a centered spinner with text `"Loading conference data..."`:
```html
<div class="flex items-center justify-center min-h-screen">
  <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  <span class="ml-3 text-gray-600 dark:text-gray-400">Loading conference data...</span>
</div>
```

### Error State

```html
<div class="flex items-center justify-center min-h-screen">
  <div class="text-center">
    <p class="text-red-600 dark:text-red-400 font-medium">Failed to load data</p>
    <p class="text-gray-500 mt-1">{message}</p>
    <button onClick={() => window.location.reload()} class="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg">
      Retry
    </button>
  </div>
</div>
```
