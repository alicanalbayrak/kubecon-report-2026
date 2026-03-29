import {
  createContext,
  useContext,
  useReducer,
  useMemo,
  type ReactNode,
  type ReactElement,
  type Dispatch,
  createElement,
} from "react";
import type { Event, DashboardStats } from "./types";
import { CNCF_PROJECTS, TOPIC_BUCKETS, escapeRegex, getEventText } from "./text-analysis";

export interface FilterState {
  source: "all" | "main" | "colocated";
  keyword: string | null;
  component: string | null;
  topic: string | null;
  speaker: string | null;
  search: string;
}

export const initialFilterState: FilterState = {
  source: "all",
  keyword: null,
  component: null,
  topic: null,
  speaker: null,
  search: "",
};

export type FilterAction =
  | { type: "SET_SOURCE"; payload: "all" | "main" | "colocated" }
  | { type: "SET_KEYWORD"; payload: string | null }
  | { type: "SET_COMPONENT"; payload: string | null }
  | { type: "SET_TOPIC"; payload: string | null }
  | { type: "SET_SPEAKER"; payload: string | null }
  | { type: "SET_SEARCH"; payload: string }
  | { type: "CLEAR_ALL" };

export interface FilterContextValue {
  filters: FilterState;
  dispatch: Dispatch<FilterAction>;
  activeFilters: Array<{ type: string; label: string; onClear: () => void }>;
}

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case "SET_SOURCE":
      return { ...state, source: action.payload };
    case "SET_KEYWORD":
      return { ...state, keyword: action.payload };
    case "SET_COMPONENT":
      return { ...state, component: action.payload };
    case "SET_TOPIC":
      return { ...state, topic: action.payload };
    case "SET_SPEAKER":
      return { ...state, speaker: action.payload };
    case "SET_SEARCH":
      return { ...state, search: action.payload };
    case "CLEAR_ALL":
      return initialFilterState;
    default:
      return state;
  }
}

const FilterContext = createContext<FilterContextValue | null>(null);

export function useFilteredEvents(allEvents: Event[]): Event[] {
  const { filters } = useFilter();

  return useMemo(() => {
    let events = allEvents;

    // 1. Source filter
    if (filters.source !== "all") {
      events = events.filter((e) => e.source === filters.source);
    }

    // 2. Keyword filter (word boundary match)
    if (filters.keyword !== null) {
      const re = new RegExp("\\b" + escapeRegex(filters.keyword) + "\\b", "i");
      events = events.filter((e) => re.test(getEventText(e)));
    }

    // 3. Component filter
    if (filters.component !== null) {
      const project = CNCF_PROJECTS.find((p) => p.name === filters.component);
      if (project) {
        const regexes = project.patterns.map(
          (p) => new RegExp("\\b" + escapeRegex(p) + "\\b", "i")
        );
        events = events.filter((e) => {
          const text = getEventText(e);
          return regexes.some((re) => re.test(text));
        });
      }
    }

    // 4. Topic filter
    if (filters.topic !== null) {
      const bucket = TOPIC_BUCKETS.find((b) => b.topic === filters.topic);
      if (bucket) {
        const regexes = bucket.keywords.map(
          (k) => new RegExp("\\b" + escapeRegex(k) + "\\b", "i")
        );
        events = events.filter((e) => {
          const text = getEventText(e);
          return regexes.some((re) => re.test(text));
        });
      }
    }

    // 5. Speaker filter (exact name match, case-sensitive)
    if (filters.speaker !== null) {
      const speakerName = filters.speaker;
      events = events.filter((e) =>
        e.speakerNames.some((n) => n === speakerName)
      );
    }

    // 6. Search filter (case-insensitive substring)
    if (filters.search !== "") {
      const searchLower = filters.search.toLowerCase();
      events = events.filter((e) => {
        if (e.cleanTitle.toLowerCase().includes(searchLower)) return true;
        if (e.description.toLowerCase().includes(searchLower)) return true;
        if (e.speakerNames.some((n) => n.toLowerCase().includes(searchLower)))
          return true;
        return false;
      });
    }

    return events;
  }, [allEvents, filters]);
}

export function computeStats(events: Event[]): DashboardStats {
  const speakerSet = new Set<string>();
  let slidesCount = 0;
  const trackSet = new Set<string>();

  for (const event of events) {
    for (const name of event.speakerNames) {
      speakerSet.add(name);
    }
    slidesCount += event.fileCount;
    if (event.type !== "Breaks" && event.type !== "Registration") {
      trackSet.add(event.type);
    }
  }

  return {
    totalSessions: events.length,
    uniqueSpeakers: speakerSet.size,
    trackCount: trackSet.size,
    slidesCount,
  };
}

export function FilterProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const [filters, dispatch] = useReducer(filterReducer, initialFilterState);

  const activeFilters = useMemo(() => {
    const chips: Array<{ type: string; label: string; onClear: () => void }> =
      [];

    if (filters.keyword !== null) {
      chips.push({
        type: "keyword",
        label: `Keyword: ${filters.keyword}`,
        onClear: () => dispatch({ type: "SET_KEYWORD", payload: null }),
      });
    }

    if (filters.component !== null) {
      chips.push({
        type: "component",
        label: `Component: ${filters.component}`,
        onClear: () => dispatch({ type: "SET_COMPONENT", payload: null }),
      });
    }

    if (filters.topic !== null) {
      chips.push({
        type: "topic",
        label: `Topic: ${filters.topic}`,
        onClear: () => dispatch({ type: "SET_TOPIC", payload: null }),
      });
    }

    if (filters.speaker !== null) {
      chips.push({
        type: "speaker",
        label: `Speaker: ${filters.speaker}`,
        onClear: () => dispatch({ type: "SET_SPEAKER", payload: null }),
      });
    }

    if (filters.search !== "") {
      chips.push({
        type: "search",
        label: `Search: ${filters.search}`,
        onClear: () => dispatch({ type: "SET_SEARCH", payload: "" }),
      });
    }

    return chips;
  }, [filters]);

  const value: FilterContextValue = useMemo(
    () => ({ filters, dispatch, activeFilters }),
    [filters, activeFilters]
  );

  return createElement(FilterContext.Provider, { value }, children);
}

export function useFilter(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (ctx === null) {
    throw new Error("useFilter must be used within a FilterProvider");
  }
  return ctx;
}
