# Charts Specification

This spec covers all chart and table components in `src/components/charts/` and `src/components/tables/`.

All charts use **Recharts** as the charting library. All charts must support dark and light themes by reading the current theme from the DOM (`document.documentElement.classList.contains("dark")`) or via a `useTheme()` hook passed down / derived from context.

---

## Shared: Theme-Aware Colors

Define a shared color utility in `src/lib/chart-colors.ts`:

```typescript
export function useChartTheme() {
  // Observe the <html> element's class list for "dark"
  // Use useState + MutationObserver or a simple check on render
  const isDark = document.documentElement.classList.contains("dark");

  return {
    isDark,
    gridColor: isDark ? "#334155" : "#e5e7eb",       // slate-700 / gray-200
    axisTickColor: isDark ? "#9ca3af" : "#6b7280",    // gray-400 / gray-500
    tooltipBg: isDark ? "#1e293b" : "#ffffff",        // slate-800 / white
    tooltipBorder: isDark ? "#475569" : "#e5e7eb",    // slate-600 / gray-200
    tooltipText: isDark ? "#f1f5f9" : "#1f2937",      // slate-100 / gray-800
    labelColor: isDark ? "#d1d5db" : "#374151",       // gray-300 / gray-700
  };
}
```

### Shared Color Palette for Bars

Use a consistent 10-color palette for bar charts:

```typescript
export const BAR_COLORS = [
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#06b6d4", // cyan-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#ec4899", // pink-500
  "#6366f1", // indigo-500
  "#14b8a6", // teal-500
  "#f97316", // orange-500
];
```

These colors work on both dark and light backgrounds.

### Shared Chart Card Wrapper

Every chart should be wrapped in a card:

```html
<div class="border border-gray-200 dark:border-slate-700 rounded-lg p-4 bg-white dark:bg-slate-800">
  <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h2>
  {/* chart content */}
</div>
```

---

## 1. `src/components/charts/TopKeywordsChart.tsx` -- Horizontal Bar Chart

### Props

```typescript
interface TopKeywordsChartProps {
  events: Event[];  // source-filtered events
}
```

### Data Transformation

1. Call `extractKeywords(events)` from `text-analysis.ts`.
2. Take the top 25 entries.
3. Map to Recharts data format: `{ keyword: string; count: number }[]`.
4. Memoize with `useMemo` depending on `[events]`.

### Recharts Configuration

```typescript
<ResponsiveContainer width="100%" height={600}>
  <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
    <CartesianGrid strokeDasharray="3 3" stroke={theme.gridColor} horizontal={false} />
    <XAxis type="number" tick={{ fill: theme.axisTickColor, fontSize: 12 }} />
    <YAxis
      type="category"
      dataKey="keyword"
      tick={{ fill: theme.axisTickColor, fontSize: 12 }}
      width={90}
    />
    <Tooltip
      contentStyle={{
        backgroundColor: theme.tooltipBg,
        border: `1px solid ${theme.tooltipBorder}`,
        borderRadius: "8px",
        color: theme.tooltipText,
      }}
    />
    <Bar
      dataKey="count"
      fill="#3b82f6"
      radius={[0, 4, 4, 0]}
      cursor="pointer"
      onClick={(data) => handleKeywordClick(data.keyword)}
    />
  </BarChart>
</ResponsiveContainer>
```

### Click Interaction

- When a bar is clicked, dispatch `{ type: "SET_KEYWORD", payload: keyword }` to FilterContext.
- Use `useFilter()` hook to get `dispatch`.
- Visual feedback: bars should have `cursor: pointer` and a hover opacity effect.

### Chart Title

`"Top 25 Keywords"`

### Responsive

- `ResponsiveContainer` handles width.
- Height fixed at 600px to accommodate 25 bars.
- Left margin of 100px for keyword labels. If labels are long, they may truncate; set `width={90}` on YAxis and allow Recharts to truncate.

### Edge Cases

- If fewer than 25 keywords, show all available.
- If 0 events, show an empty state message inside the card: `"No data available"`.

---

## 2. `src/components/charts/CNCFComponentsChart.tsx` -- Horizontal Bar Chart

### Props

```typescript
interface CNCFComponentsChartProps {
  events: Event[];  // source-filtered events
}
```

### Data Transformation

1. Call `matchCNCFComponents(events)` from `text-analysis.ts`.
2. Already sorted by count descending. Take top 30 (or all if fewer).
3. Map to: `{ name: string; count: number }[]`.
4. Memoize with `useMemo`.

### Recharts Configuration

Same layout as TopKeywordsChart (horizontal bar), but:
- `dataKey="name"` for YAxis.
- `dataKey="count"` for Bar.
- Fill color: `"#8b5cf6"` (violet-500) -- distinct from keywords chart.
- Height: `Math.max(400, data.length * 28)` -- scales with number of projects shown.

```typescript
<ResponsiveContainer width="100%" height={Math.max(400, data.length * 28)}>
  <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 120, bottom: 5 }}>
    <CartesianGrid strokeDasharray="3 3" stroke={theme.gridColor} horizontal={false} />
    <XAxis type="number" tick={{ fill: theme.axisTickColor, fontSize: 12 }} />
    <YAxis
      type="category"
      dataKey="name"
      tick={{ fill: theme.axisTickColor, fontSize: 12 }}
      width={110}
    />
    <Tooltip
      contentStyle={{
        backgroundColor: theme.tooltipBg,
        border: `1px solid ${theme.tooltipBorder}`,
        borderRadius: "8px",
        color: theme.tooltipText,
      }}
    />
    <Bar
      dataKey="count"
      fill="#8b5cf6"
      radius={[0, 4, 4, 0]}
      cursor="pointer"
      onClick={(data) => handleComponentClick(data.name)}
    />
  </BarChart>
</ResponsiveContainer>
```

### Click Interaction

- On bar click, dispatch `{ type: "SET_COMPONENT", payload: name }` to FilterContext.

### Chart Title

`"CNCF Project Mentions"`

### Edge Cases

- Projects with 0 matches are already filtered out in `matchCNCFComponents`.
- No project logos/icons -- just bars with text labels.

---

## 3. `src/components/charts/TrendingTopicsChart.tsx` -- Grouped Bar Chart

### Props

```typescript
interface TrendingTopicsChartProps {
  events: Event[];  // source-filtered events
}
```

### Data Transformation

1. Call `matchTrendingTopics(events)` from `text-analysis.ts`.
2. Map to Recharts grouped bar format:
   ```typescript
   { topic: string; main: number; colocated: number; total: number }[]
   ```
   Where `main` = `mainCount`, `colocated` = `colocatedCount`, `total` = `count`.
3. Sort by `total` descending.
4. Memoize.

### Recharts Configuration

A **vertical** grouped bar chart (categories on X axis, counts on Y axis):

```typescript
<ResponsiveContainer width="100%" height={400}>
  <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
    <CartesianGrid strokeDasharray="3 3" stroke={theme.gridColor} vertical={false} />
    <XAxis
      dataKey="topic"
      tick={{ fill: theme.axisTickColor, fontSize: 11 }}
      angle={-35}
      textAnchor="end"
      height={80}
    />
    <YAxis tick={{ fill: theme.axisTickColor, fontSize: 12 }} />
    <Tooltip
      contentStyle={{
        backgroundColor: theme.tooltipBg,
        border: `1px solid ${theme.tooltipBorder}`,
        borderRadius: "8px",
        color: theme.tooltipText,
      }}
    />
    <Legend wrapperStyle={{ color: theme.labelColor }} />
    <Bar dataKey="main" name="KubeCon Main" fill="#3b82f6" radius={[4, 4, 0, 0]} cursor="pointer" />
    <Bar dataKey="colocated" name="Co-located" fill="#f59e0b" radius={[4, 4, 0, 0]} cursor="pointer" />
  </BarChart>
</ResponsiveContainer>
```

### Click Interaction

- On bar click (either "main" or "colocated" bar), dispatch `{ type: "SET_TOPIC", payload: topic }`.
- The topic value is the `topic` field from the data entry (e.g., `"AI / ML"`).

### Chart Title

`"Trending Topics (Main vs Co-located)"`

### Responsive

- X-axis labels are angled (-35 degrees) to prevent overlap.
- On very narrow screens, labels may still overlap -- this is acceptable.
- Bottom margin of 60px accommodates angled labels.

### Edge Cases

- If source filter is set to "main" only, `colocated` values will all be 0 (bars hidden or very small). This is correct behavior -- the data reflects the filtered source.
- Actually, charts receive `sourceFiltered` events, so if source is "main", the `colocatedCount` from `matchTrendingTopics` will be 0. This is expected and visually informative.

---

## 4. `src/components/charts/TrackDistribution.tsx` -- Vertical Bar Chart

### Props

```typescript
interface TrackDistributionProps {
  events: Event[];  // source-filtered events
}
```

### Data Transformation

1. Count events per `event.type`.
2. **Exclude** types named `"Breaks"` and `"Registration"` (exact match after emoji stripping).
3. Sort descending by count.
4. Map to: `{ track: string; count: number }[]`.
5. Memoize.

### Recharts Configuration

Vertical bar chart (tracks on X, count on Y):

```typescript
<ResponsiveContainer width="100%" height={400}>
  <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 80 }}>
    <CartesianGrid strokeDasharray="3 3" stroke={theme.gridColor} vertical={false} />
    <XAxis
      dataKey="track"
      tick={{ fill: theme.axisTickColor, fontSize: 10 }}
      angle={-45}
      textAnchor="end"
      height={100}
      interval={0}  // show all labels, no skipping
    />
    <YAxis tick={{ fill: theme.axisTickColor, fontSize: 12 }} />
    <Tooltip
      contentStyle={{
        backgroundColor: theme.tooltipBg,
        border: `1px solid ${theme.tooltipBorder}`,
        borderRadius: "8px",
        color: theme.tooltipText,
      }}
    />
    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
      {data.map((entry, index) => (
        <Cell key={entry.track} fill={BAR_COLORS[index % BAR_COLORS.length]} />
      ))}
    </Bar>
  </BarChart>
</ResponsiveContainer>
```

### Click Interaction

- No click-to-filter for this chart (tracks are already visible as tags on session cards).
- Optionally, could set a keyword filter to the track name, but this is not required.

### Chart Title

`"Sessions per Track"`

### Responsive

- Labels angled at -45 degrees.
- `interval={0}` forces all labels to display (there are ~24 tracks at most for main, ~18 for colocated).
- On mobile with many tracks, labels will be small but readable due to angle.

### Edge Cases

- After source filtering, the number of tracks changes (main has different tracks than colocated).
- Some tracks may have only 1 event -- still show them.

---

## 5. `src/components/charts/ExperienceLevelDonut.tsx` -- Doughnut Chart

### Props

```typescript
interface ExperienceLevelDonutProps {
  events: Event[];  // source-filtered events
}
```

### Data Transformation

1. Count events per `event.experienceLevel`.
2. Map to: `{ name: string; value: number }[]`.
3. Expected segments: `"Beginner"`, `"Intermediate"`, `"Advanced"`, `"Any"`, `"Not specified"`.
4. Filter out segments with `value === 0`.
5. Memoize.

### Color Palette for Levels

```typescript
const LEVEL_COLORS: Record<string, string> = {
  "Beginner": "#10b981",      // emerald-500
  "Intermediate": "#3b82f6",  // blue-500
  "Advanced": "#8b5cf6",      // violet-500
  "Any": "#f59e0b",           // amber-500
  "Not specified": "#6b7280", // gray-500
};
```

### Recharts Configuration

```typescript
<ResponsiveContainer width="100%" height={350}>
  <PieChart>
    <Pie
      data={data}
      cx="50%"
      cy="50%"
      innerRadius={70}
      outerRadius={120}
      paddingAngle={3}
      dataKey="value"
      nameKey="name"
      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
      labelLine={true}
    >
      {data.map((entry) => (
        <Cell key={entry.name} fill={LEVEL_COLORS[entry.name] || "#6b7280"} />
      ))}
    </Pie>
    <Tooltip
      contentStyle={{
        backgroundColor: theme.tooltipBg,
        border: `1px solid ${theme.tooltipBorder}`,
        borderRadius: "8px",
        color: theme.tooltipText,
      }}
      formatter={(value: number, name: string) => [`${value} sessions`, name]}
    />
    <Legend
      wrapperStyle={{ color: theme.labelColor }}
    />
  </PieChart>
</ResponsiveContainer>
```

### Label Rendering

- Each segment shows `"Name XX%"` as an external label.
- Use Recharts' built-in `label` prop with a custom render function.
- Label text color should adapt to theme: use `theme.labelColor`.

Custom label renderer:
```typescript
const renderLabel = ({ name, percent, x, y, midAngle }: any) => {
  return (
    <text
      x={x}
      y={y}
      fill={theme.labelColor}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={12}
    >
      {`${name} ${(percent * 100).toFixed(0)}%`}
    </text>
  );
};
```

### Click Interaction

- No click-to-filter for this chart. Experience level is informational only.

### Chart Title

`"Experience Level Distribution"`

### Responsive

- `ResponsiveContainer` handles width.
- On mobile, labels may overlap. Reduce `outerRadius` to 90 and `innerRadius` to 50 on screens < 640px. Use `window.innerWidth` or a media query hook.

### Edge Cases

- If all events have the same level, show a single full ring.
- `"Not specified"` may dominate if many events lack this field.

---

## 6. `src/components/tables/BigramTable.tsx` -- Sortable Bigram Table

### Props

```typescript
interface BigramTableProps {
  events: Event[];  // source-filtered events
}
```

### Data Transformation

1. Call `extractBigrams(events)` from `text-analysis.ts`.
2. Take top 30 entries.
3. Memoize.

### Table Structure

| Column | Data Key | Sortable | Default Sort |
|--------|----------|----------|--------------|
| Rank   | (computed from position) | No | -- |
| Bigram | `term`   | Yes (alphabetical) | -- |
| Count  | `count`  | Yes (numeric) | Descending (default) |

### Sorting

- State: `const [sortKey, setSortKey] = useState<"term" | "count">("count")`.
- State: `const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")`.
- Clicking a header toggles sort direction if same key, or sets the key with default direction.
- Default direction: "count" defaults to "desc", "term" defaults to "asc".
- Re-compute rank after sorting (rank is always sequential 1, 2, 3...).

### Visual Design

```html
<div class="border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 overflow-hidden">
  <h2 class="text-lg font-semibold p-4 text-gray-900 dark:text-gray-100">Top Bigram Phrases</h2>
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
          <th class="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400 w-16">#</th>
          <th class="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-200"
              onClick={() => handleSort("term")}>
            Bigram {sortIndicator("term")}
          </th>
          <th class="px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-200 w-24"
              onClick={() => handleSort("count")}>
            Count {sortIndicator("count")}
          </th>
        </tr>
      </thead>
      <tbody>
        {sortedData.map((entry, i) => (
          <tr class="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
            <td class="px-4 py-2 text-gray-500 dark:text-gray-500">{i + 1}</td>
            <td class="px-4 py-2 text-gray-900 dark:text-gray-100">{entry.term}</td>
            <td class="px-4 py-2 text-right text-gray-900 dark:text-gray-100 font-mono">{entry.count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
```

### Sort Indicator

Show a small arrow next to the active sort column header:
- Ascending: `"arrow-up"` or unicode `"\u2191"`
- Descending: `"arrow-down"` or unicode `"\u2193"`
- Inactive column: no indicator or a faint double arrow `"\u2195"`.

### Responsive

- `overflow-x-auto` on the table container ensures horizontal scroll on very narrow screens.
- Table widths: rank column narrow (`w-16`), bigram flexible, count narrow (`w-24`).

### Edge Cases

- If fewer than 30 bigrams, show all.
- If 0 events, show empty table with a message row.

### FilterContext Interaction

- No click-to-filter on bigrams. This is a read-only analytical table.

---

## 7. `src/components/tables/SpeakerLeaderboard.tsx` -- Sortable Speaker Table

### Props

```typescript
interface SpeakerLeaderboardProps {
  events: Event[];  // source-filtered events
}
```

### Data Transformation

1. Iterate all events. For each event, for each speaker:
   - Key by speaker `name`.
   - Accumulate: increment `sessionCount`, add `event.type` to a set of tracks, store the speaker's `company`.
2. Convert to `SpeakerEntry[]`.
3. Sort by `sessionCount` descending by default.
4. Take top 30.
5. Memoize.

**Algorithm pseudocode**:
```typescript
const speakerMap = new Map<string, {
  company: string;
  sessionCount: number;
  tracks: Set<string>;
}>();

for (const event of events) {
  for (const speaker of event.speakers) {
    const existing = speakerMap.get(speaker.name);
    if (existing) {
      existing.sessionCount++;
      existing.tracks.add(event.type);
      // Keep the most common company (first seen is fine)
    } else {
      speakerMap.set(speaker.name, {
        company: speaker.company,
        sessionCount: 1,
        tracks: new Set([event.type]),
      });
    }
  }
}

const entries: SpeakerEntry[] = Array.from(speakerMap.entries()).map(
  ([name, data]) => ({
    name,
    company: data.company,
    sessionCount: data.sessionCount,
    tracks: Array.from(data.tracks),
  })
);
```

### Table Structure

| Column | Data Key | Sortable | Default Sort |
|--------|----------|----------|--------------|
| Rank   | (computed) | No | -- |
| Name   | `name` | Yes (alphabetical) | -- |
| Company | `company` | Yes (alphabetical) | -- |
| Sessions | `sessionCount` | Yes (numeric) | Descending (default) |
| Tracks | `tracks.length` | Yes (numeric) | -- |

### Sorting

Same pattern as BigramTable:
- `sortKey`: `"name" | "company" | "sessionCount" | "tracks"`
- `sortDir`: `"asc" | "desc"`
- For "tracks", sort by `tracks.length`.

### Visual Design

Same table styling as BigramTable, with these columns:

```html
<thead>
  <tr>
    <th class="w-12">#</th>
    <th class="cursor-pointer" onClick={...}>Name</th>
    <th class="cursor-pointer" onClick={...}>Company</th>
    <th class="cursor-pointer w-24 text-right" onClick={...}>Sessions</th>
    <th class="cursor-pointer w-20 text-right" onClick={...}>Tracks</th>
  </tr>
</thead>
<tbody>
  {data.map((entry, i) => (
    <tr class="hover:bg-gray-50 dark:hover:bg-slate-700/30 cursor-pointer"
        onClick={() => handleSpeakerClick(entry.name)}>
      <td>{i + 1}</td>
      <td class="font-medium text-blue-600 dark:text-blue-400">{entry.name}</td>
      <td class="text-gray-600 dark:text-gray-400">{entry.company}</td>
      <td class="text-right font-mono">{entry.sessionCount}</td>
      <td class="text-right font-mono">{entry.tracks.length}</td>
    </tr>
  ))}
</tbody>
```

### Click Interaction

- Clicking a **speaker name** (the entire row is clickable) dispatches `{ type: "SET_SPEAKER", payload: name }` to FilterContext.
- The name column is styled as a link (blue text) to indicate clickability.

### Tooltip on Tracks

- Optionally, hovering over the tracks count shows a tooltip with the list of track names. Use the `title` attribute for simplicity:
  ```html
  <td title={entry.tracks.join(", ")}>{entry.tracks.length}</td>
  ```

### Chart Title

`"Speaker Leaderboard"`

### Responsive

- Same overflow handling as BigramTable.
- On mobile, the company column can be hidden: `class="hidden sm:table-cell"`.

### Edge Cases

- Speakers with the same name but different companies: treated as the same speaker (keyed by name). This is a known limitation. First-seen company is used.
- Speakers with no company (title has no comma): `company` will be the full title string. This is acceptable.
- Events with 0 speakers contribute nothing to the leaderboard.

---

## Chart Placement Summary

All charts/tables are wrapped in the card wrapper described at the top. They are placed in a responsive grid in `App.tsx`:

```
Desktop (lg and up):
  Row 1: TopKeywordsChart | CNCFComponentsChart
  Row 2: TrendingTopicsChart | TrackDistribution
  Row 3: ExperienceLevelDonut | (empty or spans full)
  Row 4: BigramTable | SpeakerLeaderboard
  Row 5: SessionList (full width)

Mobile:
  All components stack vertically in single column.
```

Grid classes: `grid grid-cols-1 lg:grid-cols-2 gap-6`.

For `ExperienceLevelDonut`, if it is alone in a row, it can either span the full width with `lg:col-span-2` centered, or sit in the left column. Recommend `lg:col-span-1` to keep it as a manageable doughnut size, leaving the right column empty.

---

## Performance Considerations

- All data transformations (keyword extraction, bigram generation, component matching, topic matching, speaker aggregation) must be wrapped in `useMemo` with `[events]` as the dependency.
- These computations iterate over hundreds of events with string operations. They are fast enough for 880 events but should not re-run on every render.
- Recharts `ResponsiveContainer` handles resize events internally.
- Do NOT re-run text analysis when keyword/component/topic/search filters change -- charts use `sourceFiltered` events, which only change when the source toggle changes.
