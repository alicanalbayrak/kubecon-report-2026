# Data Layer Specification

This spec covers all files in `src/lib/`: types, data loading, text analysis, and filter state management.

---

## 1. `src/lib/types.ts` -- TypeScript Interfaces

### Raw JSON Shape (matches `index.json` files exactly)

```typescript
/** A single file attachment on an event */
export interface RawFile {
  url: string;
  filename: string;
  local_path: string;
}

/** A speaker entry as it appears in the JSON */
export interface RawSpeaker {
  name: string;
  title: string;  // job title + company, e.g. "Senior SRE, STACKIT"
  bio: string;
}

/** A single event as it appears nested under a type in the JSON */
export interface RawEvent {
  url: string;
  title: string;
  description: string;
  date_time: string;        // e.g. "Tuesday March 24, 2026 11:15 - 12:30CET"
  venue: string;
  speakers: RawSpeaker[];
  type: string;             // e.g. "AI + ML" or "Agentics Day: MCP + Agents" (may have emoji prefix like "lightning-bolt")
  experience_level: string; // "Beginner" | "Intermediate" | "Advanced" | "Any" | ""
  files: RawFile[];
  start_date: string;       // ISO-ish: "2026-03-24T11:15:00+0100"
  end_date: string;         // ISO-ish: "2026-03-24T12:30:00+0100"
}

/** A type/track grouping in the JSON */
export interface RawTypeGroup {
  event_count: number;
  events: RawEvent[];
}

/** Root shape of each index.json file */
export interface RawConferenceData {
  conference: string;
  dates: string;
  location: string;
  base_url: string;
  types: Record<string, RawTypeGroup>;
}
```

### Flattened/Enriched Event Type (used internally throughout the app)

```typescript
export type Source = "main" | "colocated";

export type ExperienceLevel = "Beginner" | "Intermediate" | "Advanced" | "Any" | "Not specified";

/** Speaker with extracted company */
export interface Speaker {
  name: string;
  title: string;       // full original title string
  company: string;     // extracted from title -- everything after the last comma, trimmed
  bio: string;
}

/** Flattened, enriched event used everywhere in the app */
export interface Event {
  id: string;              // deterministic: slugified url or hash of url
  url: string;
  title: string;
  cleanTitle: string;      // title with emoji prefixes stripped (remove leading emoji + whitespace patterns)
  description: string;
  dateTime: string;        // original date_time string
  startDate: Date;         // parsed from start_date
  endDate: Date;           // parsed from end_date
  venue: string;
  speakers: Speaker[];
  speakerNames: string[];  // pre-extracted for search convenience
  speakerCount: number;
  type: string;            // track/type name, cleaned (emoji prefix stripped)
  experienceLevel: ExperienceLevel;
  files: RawFile[];
  fileCount: number;
  source: Source;
  conferenceName: string;  // from root conference field
}

/** Conference metadata for display in hero banner */
export interface ConferenceInfo {
  mainConference: string;
  colocatedConference: string;
  dates: string;            // combined: "March 22-27, 2026"
  location: string;
}

/** Aggregate stats */
export interface DashboardStats {
  totalSessions: number;
  uniqueSpeakers: number;
  trackCount: number;
  slidesCount: number;      // total files across all events
}

/** Keyword/bigram result */
export interface FrequencyEntry {
  term: string;
  count: number;
}

/** CNCF component match result */
export interface ComponentMatch {
  name: string;       // canonical display name, e.g. "OpenTelemetry"
  count: number;
  matchingEventIds: string[];
}

/** Topic bucket result */
export interface TopicMatch {
  topic: string;
  count: number;
  mainCount: number;
  colocatedCount: number;
  matchingEventIds: string[];
}

/** Speaker leaderboard entry */
export interface SpeakerEntry {
  name: string;
  company: string;
  sessionCount: number;
  tracks: string[];   // unique track names they appear in
}
```

---

## 2. `src/lib/data-loader.ts` -- Fetch, Merge, Flatten

### Exports

```typescript
export async function loadAllEvents(): Promise<{
  events: Event[];
  conferenceInfo: ConferenceInfo;
}>
```

### Algorithm

1. **Fetch both JSON files in parallel**:
   - `fetch("/data/kubecon-main.json")` -- main conference
   - `fetch("/data/colocated-events.json")` -- co-located events
   - Use `Promise.all`. If either fetch fails, throw a descriptive error.

2. **Parse as `RawConferenceData`** via `.json()`.

3. **Flatten** each file's `types` object into an array of `Event`:
   - Iterate `Object.entries(data.types)`.
   - For each `[typeName, typeGroup]`, iterate `typeGroup.events`.
   - For each `RawEvent`, produce an `Event`:

     ```
     id = generateId(rawEvent.url)  // use btoa(url) or a simple hash; must be stable and unique
     cleanTitle = stripEmoji(rawEvent.title)  // regex: replace /^[\p{Emoji}\p{Emoji_Presentation}\s]+/u with ""
                                              // also strip known prefixes like "Tutorial: ", "Lightning Talk: "
     speakers = rawEvent.speakers.map(s => ({
       ...s,
       company: extractCompany(s.title)  // split by last comma, trim; if no comma, use full string
     }))
     speakerNames = speakers.map(s => s.name)
     speakerCount = speakers.length
     type = stripEmoji(typeName)  // the key from types, not the event's type field; strip emoji prefix
     experienceLevel = rawEvent.experience_level === "" ? "Not specified" : rawEvent.experience_level
     startDate = new Date(rawEvent.start_date)
     endDate = new Date(rawEvent.end_date)
     fileCount = rawEvent.files.length
     source = "main" or "colocated" depending on which file
     conferenceName = data.conference
     ```

4. **Tag source**: Events from `kubecon-main.json` get `source: "main"`, from `colocated-events.json` get `source: "colocated"`.

5. **Build ConferenceInfo**:
   ```
   {
     mainConference: mainData.conference,       // "KubeCon + CloudNativeCon Europe 2026"
     colocatedConference: colocatedData.conference,  // "CNCF-hosted Co-located Events Europe 2026"
     dates: "March 22-27, 2026",                // hardcoded combined range
     location: mainData.location                // "Amsterdam, Netherlands"
   }
   ```

6. **Return** `{ events, conferenceInfo }`.

### Helper: `stripEmoji(text: string): string`

Remove leading emoji characters and common unicode symbols. Use regex:
```typescript
function stripEmoji(text: string): string {
  return text
    .replace(/^[\u{1F4DA}\u{1F4A1}\u{26A1}\u{1F3AC}\u{1F30D}\u{2615}\u{1F3AF}\u{1F527}\u{1F4CB}\u{2B50}\u{1F680}\u{1F4E2}\u{1F6E0}\u{FE0F}\u{200D}\u{20E3}]+\s*/u, '')
    .replace(/^[^\w\s]*\s*/, '')
    .trim();
}
```

Alternatively, a simpler approach: strip any non-alphanumeric prefix characters:
```typescript
function stripEmoji(text: string): string {
  return text.replace(/^[^a-zA-Z0-9]+/, '').trim();
}
```

Use the simpler approach. Note: some type names have emoji prefixes like the lightning bolt symbol for "Lightning Talks". The raw JSON `type` field may contain these. Strip them for display and matching but keep the original `title` available too.

### Helper: `extractCompany(speakerTitle: string): string`

```typescript
function extractCompany(title: string): string {
  const lastComma = title.lastIndexOf(",");
  if (lastComma === -1) return title.trim();
  return title.substring(lastComma + 1).trim();
}
```

### Edge Cases

- **Empty descriptions**: Some events (especially welcome/opening remarks) have `description: ""`. This is valid. Text analysis should handle empty strings gracefully.
- **Missing experience level**: Map `""` to `"Not specified"`.
- **Emoji in type names**: The JSON keys under `types` do NOT have emoji prefixes (e.g., key is `"Tutorials"` not `"Tutorials"`), but the `type` field within events DOES (e.g., `"Tutorials"`). Use the **key name** as the canonical type, not the event's `type` field.
- **Date parsing**: The `start_date`/`end_date` fields look like `"2026-03-24T11:15:00+0100"`. The `+0100` offset (no colon) may not parse in all browsers. If `new Date()` returns Invalid Date, try inserting a colon: `+01:00`.
- **Duplicate speakers**: The same speaker name may appear in multiple events. For leaderboard aggregation, match by exact name string (case-sensitive).
- **Administrative tracks to skip in charts**: `"Breaks"`, `"Registration"`. Do NOT skip them during data loading -- skip only when rendering track distribution chart.

---

## 3. `src/lib/text-analysis.ts` -- Text Analysis Utilities

### 3.1 `extractKeywords(events: Event[]): FrequencyEntry[]`

**Algorithm**:
1. For each event, concatenate `cleanTitle + " " + description`.
2. Lowercase the entire string.
3. Remove punctuation: replace `/[^a-z0-9\s-]/g` with space.
4. Split on whitespace into tokens.
5. Filter out tokens with length < 3.
6. Filter out stop words (see list below).
7. Count frequency of each remaining token across ALL events.
8. Sort descending by count.
9. Return as `FrequencyEntry[]`.

**Stop Word List** (must be exactly this list):
```typescript
const STOP_WORDS = new Set([
  // English common stop words
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "had",
  "her", "was", "one", "our", "out", "has", "have", "been", "some", "them",
  "than", "its", "over", "also", "that", "with", "this", "from", "will",
  "what", "when", "who", "how", "each", "she", "which", "their", "there",
  "would", "make", "like", "into", "could", "time", "very", "your", "about",
  "more", "these", "other", "just", "most", "much", "then", "such", "only",
  "being", "those", "both", "same", "through", "where", "does", "should",
  "between", "before", "after", "during", "without", "again", "because",
  "while", "here", "they", "were", "well", "need", "using", "used", "use",

  // Conference-specific stop words
  "session", "talk", "kubecon", "cncf", "speaker", "learn", "attendees",
  "conference", "event", "join", "day", "europe", "presentation", "discuss",
  "explore", "look", "way", "new", "work", "different", "come", "many",
  "help", "real", "world", "part", "first", "get", "take", "see",
  "provide", "show", "want", "build", "based", "including", "across",
  "ensure", "enable", "understand", "often", "may", "even", "still",
  "right", "best", "high", "two", "set", "run", "end", "key",
  "lets", "let", "yet", "read", "whether", "going", "able", "back",

  // Common technical filler words
  "open", "source", "project", "tool", "tools", "approach", "solution",
  "solutions", "practice", "practices", "system", "systems", "within",
  "applications", "application", "development", "developer", "developers",
  "challenges", "challenge", "design", "implement", "implementation",
  "introduction", "overview", "deep", "dive", "hands"
]);
```

### 3.2 `extractBigrams(events: Event[]): FrequencyEntry[]`

**Algorithm**:
1. For each event, concatenate `cleanTitle + " " + description`.
2. Lowercase.
3. Remove punctuation: replace `/[^a-z0-9\s]/g` with space.
4. Split on whitespace, filter empty tokens.
5. Generate bigrams with sliding window: `tokens[i] + " " + tokens[i+1]`.
6. **Filter out** any bigram where EITHER token is in `STOP_WORDS` or has length < 3.
7. Count frequency across all events.
8. Sort descending by count.
9. Return as `FrequencyEntry[]`.

**Edge cases**:
- Events with empty description: only title contributes tokens; may produce 0 or 1 bigrams.
- Very short titles with no description produce no bigrams -- skip gracefully.

### 3.3 `matchCNCFComponents(events: Event[]): ComponentMatch[]`

**Curated CNCF project list** with canonical names and matching patterns:

```typescript
const CNCF_PROJECTS: Array<{ name: string; patterns: string[] }> = [
  { name: "Kubernetes", patterns: ["kubernetes", "k8s"] },
  { name: "Istio", patterns: ["istio"] },
  { name: "Cilium", patterns: ["cilium"] },
  { name: "eBPF", patterns: ["ebpf"] },
  { name: "Envoy", patterns: ["envoy"] },
  { name: "Argo", patterns: ["argo", "argocd", "argo cd", "argo workflows", "argo rollouts"] },
  { name: "Flux", patterns: ["flux", "fluxcd"] },
  { name: "Kueue", patterns: ["kueue"] },
  { name: "Kyverno", patterns: ["kyverno"] },
  { name: "OPA", patterns: ["opa", "open policy agent"] },
  { name: "Falco", patterns: ["falco"] },
  { name: "Prometheus", patterns: ["prometheus"] },
  { name: "OpenTelemetry", patterns: ["opentelemetry", "otel"] },
  { name: "Backstage", patterns: ["backstage"] },
  { name: "Crossplane", patterns: ["crossplane"] },
  { name: "Knative", patterns: ["knative"] },
  { name: "NATS", patterns: ["nats"] },
  { name: "containerd", patterns: ["containerd"] },
  { name: "etcd", patterns: ["etcd"] },
  { name: "CoreDNS", patterns: ["coredns", "core dns"] },
  { name: "Linkerd", patterns: ["linkerd"] },
  { name: "Keycloak", patterns: ["keycloak"] },
  { name: "Helm", patterns: ["helm"] },
  { name: "Gateway API", patterns: ["gateway api"] },
  { name: "gRPC", patterns: ["grpc"] },
  { name: "Fluentd", patterns: ["fluentd"] },
  { name: "Fluent Bit", patterns: ["fluent bit", "fluent-bit", "fluentbit"] },
  { name: "Jaeger", patterns: ["jaeger"] },
  { name: "Thanos", patterns: ["thanos"] },
  { name: "Cortex", patterns: ["cortex"] },
  { name: "KubeVirt", patterns: ["kubevirt"] },
  { name: "Vitess", patterns: ["vitess"] },
  { name: "Dapr", patterns: ["dapr"] },
  { name: "OpenKruise", patterns: ["openkruise", "kruise"] },
  { name: "Keda", patterns: ["keda"] },
  { name: "Cert-Manager", patterns: ["cert-manager", "cert manager", "certmanager"] },
  { name: "Spiffe/Spire", patterns: ["spiffe", "spire"] },
  { name: "Harbor", patterns: ["harbor"] },
  { name: "Notary", patterns: ["notary"] },
  { name: "TUF", patterns: ["tuf", "the update framework"] },
  { name: "in-toto", patterns: ["in-toto", "intoto"] },
  { name: "Sigstore", patterns: ["sigstore", "cosign"] },
  { name: "Tekton", patterns: ["tekton"] },
  { name: "KubeEdge", patterns: ["kubeedge"] },
  { name: "Volcano", patterns: ["volcano"] },
  { name: "OpenTofu", patterns: ["opentofu", "tofu"] },
  { name: "Kubeflow", patterns: ["kubeflow"] },
  { name: "WasmEdge", patterns: ["wasmedge"] },
  { name: "Spin", patterns: ["spin"] },
  { name: "WebAssembly", patterns: ["webassembly", "wasm", "wasi"] },
  { name: "Grafana", patterns: ["grafana"] },
  { name: "MCP", patterns: ["mcp", "model context protocol"] },
];
```

**Algorithm**:
1. For each project, iterate all events.
2. For each event, concatenate `cleanTitle + " " + description`, lowercase.
3. Check if ANY of the project's patterns appear as a **word boundary match** in the text. Use regex: `new RegExp("\\b" + escapeRegex(pattern) + "\\b", "i")`.
4. If match, add the event's `id` to the project's `matchingEventIds` set.
5. After all events, `count = matchingEventIds.size`.
6. Filter out projects with count === 0.
7. Sort descending by count.
8. Return as `ComponentMatch[]`.

**Important**: Use word boundary matching to avoid false positives (e.g., "spin" should not match "spinning" -- actually it will with `\b`, which is fine since "spin" in context likely refers to the Fermyon Spin project; but be aware "helm" will match "help" -- no it won't, `\bhelm\b` is fine). Escape special regex characters in patterns.

**Edge case**: "NATS" is short and could match in unrelated contexts. Accept the minor false positive risk; the curated list is designed to minimize this.

**Edge case for "Spin"**: The word "spin" could appear in general English. Accept this; in the KubeCon context it almost always refers to the Fermyon project.

### 3.4 `matchTrendingTopics(events: Event[]): TopicMatch[]`

**Topic buckets with ALL keyword patterns**:

```typescript
const TOPIC_BUCKETS: Array<{ topic: string; keywords: string[] }> = [
  {
    topic: "AI / ML",
    keywords: ["ai", "ml", "llm", "gpu", "inference", "training", "model",
               "agent", "mcp", "kubeflow", "machine learning", "deep learning",
               "neural", "artificial intelligence", "genai", "generative"]
  },
  {
    topic: "Platform Engineering",
    keywords: ["platform", "idp", "developer experience", "golden path",
               "backstage", "internal developer", "self-service", "portal"]
  },
  {
    topic: "Security",
    keywords: ["security", "supply chain", "sbom", "vulnerability", "zero trust",
               "policy", "falco", "sigstore", "cosign", "admission", "rbac",
               "runtime security", "image signing", "software bill"]
  },
  {
    topic: "Observability",
    keywords: ["observability", "tracing", "metrics", "logging", "opentelemetry",
               "prometheus", "grafana", "jaeger", "traces", "spans",
               "instrumentation", "telemetry"]
  },
  {
    topic: "FinOps",
    keywords: ["cost", "finops", "optimization", "resource", "rightsizing",
               "efficiency", "cloud spend", "cost optimization"]
  },
  {
    topic: "Networking",
    keywords: ["service mesh", "gateway api", "cilium", "ebpf", "envoy",
               "ingress", "networking", "network policy", "load balancing",
               "proxy", "traffic management"]
  },
  {
    topic: "Edge / IoT",
    keywords: ["edge", "iot", "5g", "telco", "mec", "edge computing",
               "telecommunications"]
  },
  {
    topic: "GitOps",
    keywords: ["gitops", "argo", "flux", "reconciliation", "declarative",
               "continuous delivery"]
  },
  {
    topic: "Wasm",
    keywords: ["wasm", "webassembly", "wasi", "spin", "fermyon", "wasmedge",
               "wasmcloud"]
  }
];
```

**Algorithm**:
1. For each topic bucket, iterate all events.
2. For each event, concatenate `cleanTitle + " " + description`, lowercase.
3. Check if ANY keyword in the bucket appears in the text (use `\b` word boundary regex, case-insensitive).
4. If match, count the event. Also track whether event is `source === "main"` or `source === "colocated"` for the side-by-side breakdown.
5. A single event can match multiple topic buckets.
6. Return as `TopicMatch[]`, sorted descending by total count.

---

## 4. `src/lib/filters.ts` -- Filter State Management with React Context

### Filter State Shape

```typescript
export interface FilterState {
  source: "all" | "main" | "colocated";
  keyword: string | null;       // a single keyword to filter by
  component: string | null;     // a CNCF component name to filter by
  topic: string | null;         // a trending topic name to filter by
  speaker: string | null;       // a speaker name to filter by
  search: string;               // free-text search string (can be "")
}

export const initialFilterState: FilterState = {
  source: "all",
  keyword: null,
  component: null,
  topic: null,
  speaker: null,
  search: "",
};
```

### Filter Actions

```typescript
export type FilterAction =
  | { type: "SET_SOURCE"; payload: "all" | "main" | "colocated" }
  | { type: "SET_KEYWORD"; payload: string | null }
  | { type: "SET_COMPONENT"; payload: string | null }
  | { type: "SET_TOPIC"; payload: string | null }
  | { type: "SET_SPEAKER"; payload: string | null }
  | { type: "SET_SEARCH"; payload: string }
  | { type: "CLEAR_ALL" };
```

### Context Shape

```typescript
export interface FilterContextValue {
  filters: FilterState;
  dispatch: React.Dispatch<FilterAction>;
  /** Convenience: list of active filter chips for display */
  activeFilters: Array<{ type: string; label: string; onClear: () => void }>;
}
```

### Reducer

Standard `useReducer` pattern. Each `SET_*` action replaces the corresponding field. `CLEAR_ALL` resets to `initialFilterState`.

### `useFilteredEvents` Hook

```typescript
export function useFilteredEvents(allEvents: Event[]): Event[]
```

**Filtering logic** (all filters combine with AND):

1. **Source filter**: If `source !== "all"`, keep only events where `event.source === source`.
2. **Keyword filter**: If `keyword !== null`, keep events where `cleanTitle` or `description` contains the keyword (case-insensitive, word boundary match).
3. **Component filter**: If `component !== null`, look up the component in `CNCF_PROJECTS`, get its patterns, keep events where any pattern matches in `cleanTitle + " " + description` (same logic as `matchCNCFComponents`).
4. **Topic filter**: If `topic !== null`, look up the topic in `TOPIC_BUCKETS`, get its keywords, keep events where any keyword matches.
5. **Speaker filter**: If `speaker !== null`, keep events where any speaker's `name` exactly equals the filter value (case-sensitive).
6. **Search filter**: If `search !== ""`, keep events where `cleanTitle`, `description`, or any `speakerNames` entry contains the search string (case-insensitive substring match, NOT word boundary -- allows partial matches like "kube" matching "kubernetes").

Implement with `useMemo` depending on `[allEvents, filters]`.

### `computeStats` Utility

```typescript
export function computeStats(events: Event[]): DashboardStats
```

- `totalSessions`: `events.length`
- `uniqueSpeakers`: deduplicate by speaker name across all events, count unique
- `trackCount`: count unique `event.type` values (excluding "Breaks" and "Registration")
- `slidesCount`: sum of `event.fileCount` across all events

This is called with the **source-filtered** event list (not the fully filtered list) so that stats in the hero banner reflect the source toggle but not keyword/component/search filters.

### Active Filters Computation

Derive `activeFilters` from the current `FilterState`:
- For each non-null / non-default filter, create a chip entry with:
  - `type`: the filter key (e.g., "keyword", "component")
  - `label`: human-readable, e.g., `"Keyword: kubernetes"`, `"Component: Cilium"`, `"Topic: AI / ML"`, `"Speaker: John Doe"`, `"Search: ebpf"`
  - `onClear`: dispatches the corresponding `SET_*` action with `null` (or `""` for search)
- Do NOT include `source` in the active filter chips (it has its own toggle UI).

### Provider Component

```typescript
export function FilterProvider({ children }: { children: React.ReactNode }): JSX.Element
```

Wraps children with the context provider. Uses `useReducer(filterReducer, initialFilterState)`. Computes `activeFilters` via `useMemo`.

### Consumer Hook

```typescript
export function useFilter(): FilterContextValue
```

Calls `useContext(FilterContext)`. Throws if used outside provider.

---

## File Organization Summary

| File | Exports |
|------|---------|
| `src/lib/types.ts` | All interfaces and type aliases listed above |
| `src/lib/data-loader.ts` | `loadAllEvents()`, `stripEmoji()`, `extractCompany()` |
| `src/lib/text-analysis.ts` | `extractKeywords()`, `extractBigrams()`, `matchCNCFComponents()`, `matchTrendingTopics()`, `STOP_WORDS`, `CNCF_PROJECTS`, `TOPIC_BUCKETS` |
| `src/lib/filters.ts` | `FilterProvider`, `useFilter`, `useFilteredEvents`, `computeStats`, `FilterState`, `FilterAction`, `initialFilterState` |
